import os

def init_security_headers(app):
    """
    Apply security headers to all HTTP responses via an after_request hook.
    Headers are applied using setdefault so they don't overwrite headers
    that a specific route might have already set.
    """
    @app.after_request
    def add_security_headers(response):
        env = os.environ.get('FLASK_ENV', 'development').lower()
        cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
        cors_origins = [o.strip() for o in cors_origins_raw.split(',') if o.strip()]

        if env in ('development', 'dev'):
            connect_sources = ["'self'", "http://localhost:5000", "ws://localhost:5173"] + cors_origins
        else:
            connect_sources = ["'self'"] + cors_origins

        # Deduplicate while preserving order
        unique_connect_sources = list(dict.fromkeys(connect_sources))
        connect_src_str = " ".join(unique_connect_sources)

        headers = {
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            'Content-Security-Policy': "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self' data:; "
                f"connect-src {connect_src_str}; "
                "frame-ancestors 'none'; "
                "form-action 'self'",
        }

        # Only add HSTS in non-development environments
        if env not in ('development', 'dev', 'test', 'testing'):
            headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        for key, value in headers.items():
            response.headers.setdefault(key, value)

        return response

