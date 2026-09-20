import uuid
from datetime import datetime, timedelta
from app import db
from app.models.company import Company
from app.models.subscription_plan import SubscriptionPlan
from app.models.company_subscription import CompanySubscription
from app.models.company_feature import CompanyFeature, FEATURE_KEYS
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip

class QuotaExceededException(Exception):
    def __init__(self, resource, used, limit, message=None):
        self.resource = resource
        self.used = used
        self.limit = limit
        self.message = message or f"{resource.capitalize()} limit reached for your subscription plan ({used}/{limit}). Upgrade your plan to add more {resource}."
        super().__init__(self.message)

class QuotaService:

    @staticmethod
    def get_tenant_subscription(company_id):
        """Returns the active CompanySubscription record or None."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        return CompanySubscription.query.filter_by(company_id=cid).first()

    @staticmethod
    def get_tenant_plan(company_id):
        """Returns the active SubscriptionPlan for the tenant or fallback default plan."""
        sub = QuotaService.get_tenant_subscription(company_id)
        if sub and sub.plan:
            return sub.plan

        default_plan = SubscriptionPlan.query.filter_by(slug='starter', is_active=True).first()
        if not default_plan:
            default_plan = SubscriptionPlan.query.filter_by(is_active=True).first()
        return default_plan

    @staticmethod
    def get_limit(company_id, resource):
        """
        Returns the resource limit integer or None for unlimited.
        Checks CompanySubscription plan limits, then Company column overrides.
        """
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        company = Company.query.get(cid)
        if not company:
            return 0

        company_col_map = {
            'users': company.user_limit,
            'vehicles': company.vehicle_limit,
            'drivers': company.driver_limit,
        }

        plan = QuotaService.get_tenant_plan(company_id)
        plan_limits = plan.limits if plan and plan.limits else {}

        plan_key_map = {
            'users': 'user_limit',
            'vehicles': 'vehicle_limit',
            'drivers': 'driver_limit',
            'active_trips': 'active_trip_limit',
        }

        limit_val = None
        key = plan_key_map.get(resource)
        if key and key in plan_limits:
            limit_val = plan_limits[key]
        elif resource in company_col_map and company_col_map[resource] is not None and company_col_map[resource] > 0:
            limit_val = company_col_map[resource]

        if limit_val in [-1, 'unlimited', 'NULL', None]:
            return None
        try:
            return int(limit_val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def get_usage(company_id, resource):
        """Returns the current active resource count for the company."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        if resource == 'users':
            return User.query.filter_by(company_id=cid, is_active=True).count()
        elif resource == 'vehicles':
            return Vehicle.query.filter_by(company_id=cid, is_active=True).count()
        elif resource == 'drivers':
            return Driver.query.filter_by(company_id=cid, is_active=True).count()
        elif resource == 'active_trips':
            return Trip.query.filter(
                Trip.company_id == cid,
                Trip.status.in_(['Dispatched', 'In Transit'])
            ).count()
        return 0

    @staticmethod
    def get_resource_quota(company_id, resource):
        """Returns structured quota dict: {used, limit, remaining, over_limit, unlimited}."""
        used = QuotaService.get_usage(company_id, resource)
        limit = QuotaService.get_limit(company_id, resource)

        if limit is None:
            return {
                "used": used,
                "limit": None,
                "remaining": None,
                "over_limit": False,
                "unlimited": True
            }

        remaining = max(0, limit - used)
        over_limit = used > limit

        return {
            "used": used,
            "limit": limit,
            "remaining": remaining,
            "over_limit": over_limit,
            "unlimited": False
        }

    @staticmethod
    def get_tenant_usage_summary(company_id):
        """Returns complete usage and quota summary for tenant settings UI."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        sub = QuotaService.get_tenant_subscription(cid)
        plan = QuotaService.get_tenant_plan(cid)

        resources = {
            "users": QuotaService.get_resource_quota(cid, "users"),
            "vehicles": QuotaService.get_resource_quota(cid, "vehicles"),
            "drivers": QuotaService.get_resource_quota(cid, "drivers"),
            "active_trips": QuotaService.get_resource_quota(cid, "active_trips"),
        }

        is_any_over_limit = any(r.get("over_limit", False) for r in resources.values())

        return {
            "subscription": sub.to_dict() if sub else None,
            "plan": plan.to_dict() if plan else None,
            "resources": resources,
            "over_limit": is_any_over_limit
        }

    @staticmethod
    def get_tenant_entitlements(company_id):
        """Returns tenant feature entitlement flags dictionary."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        plan = QuotaService.get_tenant_plan(cid)
        plan_features = plan.features if plan and plan.features else {}

        # Merge with CompanyFeature table settings
        entitlements = {}
        for key in FEATURE_KEYS:
            feat_row = CompanyFeature.query.filter_by(company_id=cid, feature_key=key).first()
            if feat_row is not None:
                entitlements[key] = feat_row.is_enabled
            else:
                entitlements[key] = plan_features.get(key, True)

        return {
            "plan_name": plan.name if plan else "Standard",
            "plan_slug": plan.slug if plan else "starter",
            "features": entitlements
        }

    @staticmethod
    def is_feature_enabled(company_id, feature_key):
        """Checks if a feature is enabled for the company (checking overrides then plan)."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id

        # 1. Check explicit CompanyFeature override
        feat_row = CompanyFeature.query.filter_by(company_id=cid, feature_key=feature_key).first()
        if feat_row is not None:
            return feat_row.is_enabled

        # 2. Check plan features
        plan = QuotaService.get_tenant_plan(cid)
        if plan and plan.features:
            if feature_key in plan.features:
                return bool(plan.features[feature_key])

        # 3. Core features (e.g. dashboard, vehicles, trips, drivers, etc.) default to True
        return True

    @staticmethod
    def lock_tenant_subscription(company_id):
        """
        Acquires a row-level lock on the tenant subscription / company record
        within the current transaction to prevent TOCTOU race conditions.
        """
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        sub = CompanySubscription.query.filter_by(company_id=cid).with_for_update().first()
        if not sub:
            company = Company.query.filter_by(id=cid).with_for_update().first()
            return company
        return sub

    @staticmethod
    def check_quota(company_id, resource, lock=False):
        """
        Thread/transaction-safe quota check.
        Returns (can_create: bool, quota_dict: dict).
        """
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        if lock:
            QuotaService.lock_tenant_subscription(cid)
        quota = QuotaService.get_resource_quota(cid, resource)

        if quota["unlimited"]:
            return True, quota

        can_create = quota["used"] < quota["limit"]
        return can_create, quota

    @staticmethod
    def enforce_quota(company_id, resource):
        """
        Server-side quota enforcement with row-level transaction locking.
        Throws QuotaExceededException if tenant is at or over limit.
        """
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        can_create, quota = QuotaService.check_quota(cid, resource, lock=True)
        if not can_create:
            raise QuotaExceededException(
                resource=resource,
                used=quota["used"],
                limit=quota["limit"]
            )

    @staticmethod
    def change_plan(company_id, new_plan_id_or_slug):
        """
        Internal service operation to switch company plan.
        Safe downgrade: does NOT delete existing data if over limit.
        """
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        
        # Resolve plan
        try:
            pid = uuid.UUID(str(new_plan_id_or_slug))
            plan = SubscriptionPlan.query.get(pid)
        except (ValueError, TypeError):
            plan = SubscriptionPlan.query.filter_by(slug=str(new_plan_id_or_slug)).first()

        if not plan or not plan.is_active:
            raise ValueError("Invalid or inactive plan specified")

        sub = CompanySubscription.query.filter_by(company_id=cid).first()
        now = datetime.utcnow()

        if not sub:
            sub = CompanySubscription(
                company_id=cid,
                plan_id=plan.id,
                status='active',
                current_period_start=now,
                current_period_end=now + timedelta(days=30)
            )
            db.session.add(sub)
        else:
            sub.plan_id = plan.id
            sub.status = 'active'
            sub.updated_at = now

        # Update Company limits columns to mirror plan limits
        company = Company.query.get(cid)
        if company and plan.limits:
            company.user_limit = plan.limits.get('user_limit', 0)
            company.vehicle_limit = plan.limits.get('vehicle_limit', 0)
            company.driver_limit = plan.limits.get('driver_limit', 0)

        # Sync feature flags
        QuotaService.sync_company_features(cid, plan)

        db.session.commit()
        return QuotaService.get_tenant_usage_summary(cid)

    @staticmethod
    def sync_company_features(company_id, plan):
        """Synchronizes CompanyFeature records with plan.features."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        plan_features = plan.features or {}

        for key in FEATURE_KEYS:
            enabled = plan_features.get(key, True)
            feat = CompanyFeature.query.filter_by(company_id=cid, feature_key=key).first()
            if feat:
                feat.is_enabled = enabled
            else:
                db.session.add(CompanyFeature(company_id=cid, feature_key=key, is_enabled=enabled))

        db.session.commit()
