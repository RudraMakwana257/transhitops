import time
import json
import uuid
import logging
from datetime import datetime
from flask import request, g, current_app
from traceback import format_exc

# Initialize standard stdout logger
logger = logging.getLogger('transitops.request_logger')
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

def init_request_logger(app):
    @app.before_request
    def log_request_start():
        g._request_start_time = time.time()
        g._request_id = str(uuid.uuid4())

    @app.after_request
    def log_request_end(response):
        try:
            duration_ms = 0
            if hasattr(g, '_request_start_time'):
                duration_ms = int((time.time() - g._request_start_time) * 1000)
            
            request_id = getattr(g, '_request_id', str(uuid.uuid4()))
            
            # Attach request ID header to the response
            response.headers.setdefault('X-Request-ID', request_id)

            # Skip logging for health checks or static paths if needed
            if request.path.startswith('/health'):
                return response

            # Get user info if available from auth middleware
            user_id = getattr(g, 'user_id', None)
            company_id = getattr(g, 'company_id', None)
            
            if hasattr(g, 'user') and g.user:
                if not user_id:
                    user_id = str(g.user.id)
                if not company_id and g.user.company_id:
                    company_id = str(g.user.company_id)

            # X-Forwarded-For if available, else remote_addr
            ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            if ip:
                ip = ip.split(',')[0].strip()

            log_data = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "method": request.method,
                "path": request.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "ip": ip,
                "user_id": str(user_id) if user_id else None,
                "company_id": str(company_id) if company_id else None,
                "user_agent": request.user_agent.string if request.user_agent else "",
                "request_id": request_id
            }

            logger.info(json.dumps(log_data))
        except Exception as e:
            # Fallback to prevent crashing the request if logger fails
            import sys
            sys.stderr.write(f"Request logging failed: {str(e)}\n")
            sys.stderr.write(format_exc())

        return response
