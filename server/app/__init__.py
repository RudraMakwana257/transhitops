from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()

def create_app():
    from app.middleware.env_validator import validate_environment
    validate_environment()

    app = Flask(__name__)
    import os
    flask_env = os.environ.get('FLASK_ENV', 'development')
    if flask_env == 'production':
        app.config.from_object('config.ProductionConfig')
    elif flask_env == 'testing':
        app.config.from_object('config.TestingConfig')
    else:
        app.config.from_object('config.DevelopmentConfig')
    
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    from app.middleware.security_headers import init_security_headers
    from app.middleware.request_logger import init_request_logger
    from app.middleware.rate_limiter import limiter
    
    init_security_headers(app)
    init_request_logger(app)
    limiter.init_app(app)

    from app.routes.admin import bp as admin_bp
    app.register_blueprint(admin_bp)

    from app.routes import auth, vehicles, drivers, trips, maintenance, fuel, expenses, dashboard, analytics, ai_chat, settings, notifications, onboarding
    app.register_blueprint(auth.bp)
    app.register_blueprint(vehicles.bp)
    app.register_blueprint(drivers.bp)
    app.register_blueprint(trips.bp)
    app.register_blueprint(maintenance.bp)
    app.register_blueprint(fuel.bp)
    app.register_blueprint(expenses.bp)
    app.register_blueprint(dashboard.bp)
    app.register_blueprint(analytics.bp)
    app.register_blueprint(ai_chat.bp)
    app.register_blueprint(settings.bp)
    app.register_blueprint(notifications.bp)
    app.register_blueprint(onboarding.bp)

    import os
    cors_origins_raw = os.environ.get(
        'CORS_ORIGINS', 
        'http://localhost:5173,http://localhost:5174,http://localhost:80'
    )
    cors_origins = [o.strip() for o in cors_origins_raw.split(',')]

    CORS(
        app,
        origins=cors_origins,
        supports_credentials=True
    )

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "error": "BAD_REQUEST", "message": "Bad request"}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"success": False, "error": "UNAUTHORIZED", "message": "Authentication required"}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"success": False, "error": "FORBIDDEN", "message": "Access denied"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "NOT_FOUND", "message": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"success": False, "error": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}), 405

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "success": False, 
            "error": "RATE_LIMITED", 
            "message": "Too many requests. Please slow down.",
            "retry_after": getattr(e, 'description', '')  # The limiter puts info in description usually
        }), 429

    @app.errorhandler(500)
    def server_error(e):
        import logging, traceback
        logging.getLogger('transitops').error("500 Error: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "INTERNAL_ERROR", "message": "An unexpected error occurred."}), 500
        
    @app.errorhandler(503)
    def service_unavailable(e):
        return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE", "message": "Service unavailable"}), 503

    from marshmallow import ValidationError
    @app.errorhandler(ValidationError)
    def handle_validation_error(e):
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "errors": e.messages
        }), 422

    @app.route('/api/health')
    def health():
        import os
        from datetime import datetime, timezone
        from sqlalchemy import text
        
        status_code = 200
        db_status = "ok"
        try:
            db.session.execute(text('SELECT 1'))
        except Exception:
            db_status = "error"
            status_code = 503
            
        redis_status = "not_configured"
        redis_url = app.config.get('REDIS_URL') or os.environ.get('REDIS_URL')
        if redis_url:
            try:
                import redis
                r = redis.from_url(redis_url)
                r.ping()
                redis_status = "ok"
            except Exception:
                redis_status = "error"
                
        return jsonify({
            "status": "ok" if status_code == 200 else "error",
            "version": app.config.get('APP_VERSION', '1.0.0'),
            "database": db_status,
            "redis": redis_status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), status_code

    @app.route('/api/ready')
    def ready():
        from sqlalchemy import text
        try:
            db.session.execute(text('SELECT 1'))
            return jsonify({"ready": True}), 200
        except Exception:
            return jsonify({"ready": False}), 503

    from app.commands.seed_demo import register_commands
    register_commands(app)

    return app