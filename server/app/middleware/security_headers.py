import os

def init_security_headers(app):
    """
    Apply security headers to all HTTP responses via an after_request hook.
    Headers are applied using setdefault so they don't overwrite headers
    that a specific route might have already set.
    """
    @app.after_request
    def add_security_headers(response):
        headers = {
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        }
        
        # Only add HSTS in non-development environments
        env = os.environ.get('FLASK_ENV', 'development')
        if env.lower() not in ('development', 'dev', 'test', 'testing'):
            headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            
        for key, value in headers.items():
            response.headers.setdefault(key, value)
            
        return response
