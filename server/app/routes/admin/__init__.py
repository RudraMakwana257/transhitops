from flask import Blueprint

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

from app.middleware.rate_limiter import limiter, ADMIN_LIMIT

@bp.before_request
@limiter.limit(ADMIN_LIMIT)
def admin_rate_limit():
    pass

from . import companies, plans, features, users, dashboard, payments, vehicles, drivers, trips, maintenance, fuel, expenses, audit, impersonate, announcements, settings
