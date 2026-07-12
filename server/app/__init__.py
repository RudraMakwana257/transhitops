from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=['http://localhost:5173'], supports_credentials=True)
    
    from app.routes import auth, vehicles, drivers, trips, maintenance, fuel, expenses, dashboard, analytics, ai_chat
    app.register_blueprint(auth.bp)
    app.register_blueprint(vehicles.bp, url_prefix='/api/vehicles')
    app.register_blueprint(drivers.bp, url_prefix='/api/drivers')
    app.register_blueprint(trips.bp, url_prefix='/api/trips')
    app.register_blueprint(maintenance.bp, url_prefix='/api/maintenance')
    app.register_blueprint(fuel.bp, url_prefix='/api/fuel')
    app.register_blueprint(expenses.bp, url_prefix='/api/expenses')
    app.register_blueprint(dashboard.bp, url_prefix='/api/dashboard')
    app.register_blueprint(analytics.bp, url_prefix='/api/analytics')
    app.register_blueprint(ai_chat.bp, url_prefix='/api/ai')
    
    @app.route('/api/health')
    def health():
        return {'status': 'ok'}
    
    return app