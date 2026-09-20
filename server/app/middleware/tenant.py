"""
tenant.py — Multi-tenancy middleware for TransitOps Phase 1

Provides two decorators intended to stack on top of @require_roles:

    @require_company
    ─────────────────
    Reads company_id from the JWT claims already verified by @require_roles,
    loads the Company row, checks it is active, and injects:
        g.company_id  →  UUID string  (or None for super_admin)
        g.company     →  Company ORM object (or None for super_admin)

    super_admin bypass: if the JWT role is "super_admin" the decorator sets
    both to None and calls through immediately — super_admin routes scope
    their own queries.

    Old-token safety: if the JWT is valid but has no company_id claim (issued
    before Phase 1), the decorator returns 401 with a clear "Session expired"
    message rather than crashing.

    @require_feature("key")
    ────────────────────────
    Checks the company_features table for the given feature_key.
    Requires @require_company to have already run (reads g.company_id).
    Returns 403 if the feature row is missing or is_enabled = False.
    super_admin always bypasses feature checks.

    TODO(Phase 2): Add Redis caching for feature flag lookups to eliminate
    one DB round-trip per request. Cache key: "ff:{company_id}:{feature_key}",
    TTL 60 seconds. Invalidate on CompanyFeature update via admin API.

Decorator stacking pattern (typical route)
──────────────────────────────────────────
    @bp.route('/logs', methods=['GET'])
    @require_roles('fleet_manager', 'dispatcher')   ← verifies JWT, sets g.user
    @require_company                                 ← sets g.company_id, checks active
    @require_feature('fuel')                        ← checks plan feature flag
    def list_fuel_logs():
        logs = FuelLog.query.filter_by(company_id=g.company_id).all()
        ...

Public routes that bypass ALL middleware
─────────────────────────────────────────
    POST  /api/auth/login
    POST  /api/auth/refresh
    POST  /api/auth/forgot-password
    POST  /api/auth/reset-password
    GET   /api/health
    GET   /api/ready
    GET   /          (root / static)

These routes carry no JWT at all, so @require_roles is not applied to them
and therefore neither decorator in this module is ever reached.
"""

from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import get_jwt

from app.models.company import Company
from app.models.company_feature import CompanyFeature

# ─── Sentinel role ─────────────────────────────────────────────────────────────
_SUPER_ADMIN_ROLE = 'super_admin'


# ─────────────────────────────────────────────────────────────────────────────
def require_company(fn):
    """Decorator: resolve and validate the tenant company from JWT claims.

    Precondition: @require_roles must have already run and populated g.claims.

    On success:
        g.company_id  ← str (UUID) or None
        g.company     ← Company ORM instance or None

    On failure:
        401  — JWT present but company_id claim missing (old token)
        403  — Company not found or is_active = False (suspended)

    super_admin bypass:
        Sets g.company_id = None, g.company = None and calls through.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = getattr(g, 'claims', None) or get_jwt()

        # ── super_admin: bypass all tenant enforcement ────────────────────────
        if claims.get('role') == _SUPER_ADMIN_ROLE:
            g.company_id = None
            g.company    = None
            return fn(*args, **kwargs)

        # ── Extract company_id from token claims ──────────────────────────────
        raw_company_id = claims.get('company_id')

        if not raw_company_id:
            # JWT is valid but was issued before Phase 1 (no company_id claim).
            # Force re-login; do NOT crash with a 500.
            return jsonify({
                'success': False,
                'message': 'Session expired. Please log in again.',
                'error':   {'code': 'SESSION_EXPIRED'},
            }), 401

        # ── Load and validate the company ─────────────────────────────────────
        # Check g first — if another middleware or a previous call on this same
        # request already loaded the company, reuse it (avoids a double query).
        if getattr(g, 'company_id', None) == raw_company_id and getattr(g, 'company', None):
            return fn(*args, **kwargs)

        import uuid
        try:
            cid = uuid.UUID(raw_company_id)
        except ValueError:
            cid = raw_company_id
        company = Company.query.get(cid)

        if not company:
            return jsonify({
                'success': False,
                'message': 'Company not found. Contact support.',
                'error':   {'code': 'COMPANY_NOT_FOUND'},
            }), 403

        if not company.is_active:
            return jsonify({
                'success': False,
                'message': 'Your account has been suspended. Contact support.',
                'error':   {'code': 'COMPANY_SUSPENDED'},
            }), 403

        # ── Inject into Flask's request context ───────────────────────────────
        g.company_id = cid              # UUID object
        g.company    = company          # ORM instance — cached for this request

        # ── Subscription Status Access Control ────────────────────────────────
        from flask import request
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            exempt_prefixes = ('/api/subscription/checkout', '/api/subscription/change-plan', '/api/auth/')
            if not request.path.startswith(exempt_prefixes):
                from datetime import datetime
                if company.trial_ends_at and company.trial_ends_at < datetime.utcnow():
                    return jsonify({
                        'success': False,
                        'message': 'Your trial / demo period has expired. Please contact administrator to extend access.',
                        'error': {'code': 'TRIAL_EXPIRED', 'trial_ends_at': company.trial_ends_at.isoformat()}
                    }), 403

                from app.models.company_subscription import CompanySubscription
                sub = CompanySubscription.query.filter_by(company_id=cid).first()
                if sub and sub.status in ['past_due', 'canceled', 'expired']:
                    return jsonify({
                        'success': False,
                        'message': f'Subscription is {sub.status}. Please update billing to perform state-changing operations.',
                        'error': {'code': 'SUBSCRIPTION_INACTIVE', 'status': sub.status}
                    }), 402

        return fn(*args, **kwargs)
    return wrapper


# ─────────────────────────────────────────────────────────────────────────────
def require_feature(feature_key: str):
    """Decorator factory: gate a route behind a company feature flag.

    Usage:
        @require_feature("ai_chat")
        def my_route(): ...

    Precondition: @require_company must have already run and set g.company_id.

    Behaviour:
        - super_admin (g.company_id is None) always passes through.
        - If the feature row is absent or is_enabled = False → 403.
        - If the feature row is present and is_enabled = True → calls through.

    TODO(Phase 2): Cache the feature flag result in Redis.
        cache_key = f"ff:{g.company_id}:{feature_key}"
        cached = redis_client.get(cache_key)
        if cached is not None:
            is_enabled = cached == b"1"
        else:
            row = CompanyFeature.query.filter_by(...).first()
            is_enabled = row.is_enabled if row else False
            redis_client.setex(cache_key, 60, b"1" if is_enabled else b"0")
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # ── super_admin: bypass feature checks ───────────────────────────
            company_id = getattr(g, 'company_id', None)
            if company_id is None:
                return fn(*args, **kwargs)

            # ── DB lookup — one query per request per feature ─────────────────
            # TODO(Phase 2): Replace this query with a Redis cache read.
            import uuid
            if isinstance(company_id, uuid.UUID):
                cid = company_id
            else:
                try:
                    cid = uuid.UUID(company_id)
                except ValueError:
                    cid = company_id
            
            from app.services.quota_service import QuotaService
            if not QuotaService.is_feature_enabled(cid, feature_key):
                return jsonify({
                    'success': False,
                    'message': 'This feature is not available on your current plan.',
                    'error': {
                        'code':        'FEATURE_DISABLED',
                        'feature_key': feature_key,
                    },
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
