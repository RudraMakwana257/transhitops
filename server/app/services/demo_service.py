import random
import uuid
from datetime import datetime, timedelta
from app import db
from app.models.company import Company
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.fuel_log import FuelLog
from app.models.expense import Expense
from app.models.maintenance_log import MaintenanceLog
from app.models.notification import Notification
from app.models.company_subscription import CompanySubscription
from app.models.subscription_plan import SubscriptionPlan
from app.models.company_feature import CompanyFeature
from app.services.quota_service import QuotaService


class DemoService:
    """Manages dedicated prospect demo/trial sandboxes, dummy fleet generation,
    and demo credential lifecycle."""

    @staticmethod
    def get_demo_overview():
        """Returns KPI statistics and list of demo sandbox environments."""
        companies = Company.query.order_by(Company.created_at.desc()).all()
        demo_companies = [c for c in companies if c.is_demo]

        now = datetime.utcnow()
        active_count = 0
        expiring_soon_count = 0
        expired_count = 0
        total_vehicles = 0
        total_demo_users = 0

        environments = []
        for c in demo_companies:
            users = User.query.filter_by(company_id=c.id).all()
            total_demo_users += len(users)
            v_count = Vehicle.query.filter_by(company_id=c.id).count()
            d_count = Driver.query.filter_by(company_id=c.id).count()
            t_count = Trip.query.filter_by(company_id=c.id).count()
            total_vehicles += v_count

            # Determine trial status
            is_showcase = bool(c.settings.get('demo_type') == 'public_showcase' or c.slug == 'demo-fleet-co')
            days_left = None
            status = 'active' if c.is_active else 'suspended'

            if c.trial_ends_at:
                diff = (c.trial_ends_at - now).total_seconds()
                days_left = round(diff / 86400, 1)
                if diff <= 0:
                    status = 'expired'
                    expired_count += 1
                elif diff <= 3 * 86400:
                    status = 'expiring_soon'
                    expiring_soon_count += 1
                    if c.is_active:
                        active_count += 1
                else:
                    if c.is_active:
                        active_count += 1
            else:
                if c.is_active:
                    active_count += 1

            environments.append({
                'id': str(c.id),
                'name': c.name,
                'slug': c.slug,
                'email': c.email,
                'is_active': c.is_active,
                'is_showcase': is_showcase,
                'demo_type': c.settings.get('demo_type', 'prospect_trial') if c.settings else 'prospect_trial',
                'demo_notes': c.settings.get('demo_notes', '') if c.settings else '',
                'trial_ends_at': c.trial_ends_at.isoformat() if c.trial_ends_at else None,
                'days_left': days_left,
                'status': status,
                'stats': {
                    'vehicles': v_count,
                    'drivers': d_count,
                    'trips': t_count,
                    'users': len(users),
                },
                'users': [{
                    'id': str(u.id),
                    'name': u.name,
                    'email': u.email,
                    'role': u.role,
                    'is_active': u.is_active,
                    'last_login_at': u.last_login_at.isoformat() if u.last_login_at else None,
                } for u in users],
                'created_at': c.created_at.isoformat() if c.created_at else None,
            })

        return {
            'kpis': {
                'total_sandboxes': len(demo_companies),
                'active_sandboxes': active_count,
                'expiring_soon': expiring_soon_count,
                'expired_sandboxes': expired_count,
                'total_demo_users': total_demo_users,
                'total_demo_vehicles': total_vehicles,
            },
            'environments': environments
        }

    @staticmethod
    def create_demo_sandbox(
        company_name: str,
        admin_name: str,
        admin_email: str,
        password: str = None,
        duration_days: int = 7,
        seed_dummy_data: bool = True,
        notes: str = None
    ):
        """Provisions a new dedicated demo sandbox environment for a customer prospect."""
        if not company_name or not admin_email or not admin_name:
            raise ValueError("Company name, admin name, and email are required.")

        admin_email = str(admin_email).strip().lower()
        if User.query.filter_by(email=admin_email).first():
            raise ValueError(f"User with email '{admin_email}' already exists.")

        # Generate unique company slug
        import re
        base_slug = re.sub(r'[^a-z0-9]+', '-', f"demo-{company_name.lower()}").strip('-')
        slug = base_slug
        counter = 1
        while Company.query.filter_by(slug=slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        duration_days = int(duration_days) if duration_days else 7
        now = datetime.utcnow()
        trial_ends_at = now + timedelta(days=duration_days)

        # 1. Create company record
        company = Company(
            name=company_name,
            slug=slug,
            email=admin_email,
            is_active=True,
            trial_ends_at=trial_ends_at,
            settings={
                'is_demo': True,
                'demo_type': 'prospect_trial',
                'demo_duration_days': duration_days,
                'demo_notes': notes or f"{duration_days}-day demo trial for {company_name}",
                'demo_created_at': now.isoformat(),
            }
        )
        db.session.add(company)
        db.session.flush()

        # 2. Attach Enterprise subscription plan to unlock all features
        plan = SubscriptionPlan.query.filter_by(slug='enterprise').first() or SubscriptionPlan.query.filter_by(is_active=True).first()
        if plan:
            sub = CompanySubscription(
                company_id=company.id,
                plan_id=plan.id,
                status='trialing',
                current_period_start=now,
                current_period_end=trial_ends_at,
                trial_ends_at=trial_ends_at
            )
            db.session.add(sub)
            QuotaService.sync_company_features(company.id, plan)

        # 3. Create Admin / Fleet Manager user
        plain_password = password.strip() if password else f"Demo@{random.randint(10000, 99999)}"
        user = User(
            company_id=company.id,
            name=admin_name,
            email=admin_email,
            role='fleet_manager',
            is_active=True,
            onboarding_completed=True
        )
        user.set_password(plain_password)
        db.session.add(user)
        db.session.flush()

        # 4. Optionally seed realistic dummy fleet data
        if seed_dummy_data:
            DemoService.seed_dummy_fleet_data(company, user.id)

        db.session.commit()

        return {
            'company': company.to_dict(),
            'credentials': {
                'email': user.email,
                'password': plain_password,
                'role': user.role,
                'name': user.name,
                'login_url': 'https://client-two-silk-80.vercel.app/login',
                'expires_at': trial_ends_at.isoformat(),
                'duration_days': duration_days,
            }
        }

    @staticmethod
    def seed_dummy_fleet_data(company: Company, created_by_user_id=None):
        """Generates realistic vehicles, drivers, trips, fuel logs, and maintenance."""
        now = datetime.utcnow()
        cid = company.id

        # Vehicles
        vehicle_configs = [
            ('MH-02-AB-3421', 'Delivery Truck Alpha', 'Truck', 5000, 1500000, 'Available'),
            ('MH-02-CD-5678', 'Express Van Bravo', 'Van', 1800, 800000, 'On Trip'),
            ('MH-02-EF-9012', 'Heavy Hauler Charlie', 'Truck', 12000, 2400000, 'Available'),
            ('MH-02-GH-3456', 'Bulk Tanker Delta', 'Tanker', 10000, 2100000, 'On Trip'),
            ('MH-02-IJ-7890', 'Urban Delivery Echo', 'Pickup', 2000, 650000, 'Available'),
            ('MH-02-KL-1234', 'City Cargo Foxtrot', 'Van', 2500, 900000, 'In Shop'),
        ]

        vehicles = []
        for reg, name, v_type, cap, cost, status in vehicle_configs:
            v = Vehicle(
                company_id=cid,
                reg_number=reg,
                name=name,
                type=v_type,
                capacity_kg=cap,
                acquisition_cost=cost,
                odometer_km=random.randint(15000, 95000),
                status=status
            )
            db.session.add(v)
            vehicles.append(v)
        db.session.flush()

        # Drivers
        driver_configs = [
            ('Ramesh Patil', 'MH1420180012345', 'Available', 94.5),
            ('Suresh Deshmukh', 'MH1220190023456', 'On Trip', 88.0),
            ('Vikram Joshi', 'MH0120200034567', 'On Trip', 91.2),
            ('Anand Gaikwad', 'MH0320210045678', 'Available', 96.0),
        ]

        drivers = []
        for name, lic, status, score in driver_configs:
            d = Driver(
                company_id=cid,
                name=name,
                license_number=lic,
                license_category='HGMV',
                license_expiry=(now + timedelta(days=random.randint(200, 800))).date(),
                phone=f"+9198{random.randint(10000000, 99999999)}",
                status=status,
                safety_score=score
            )
            db.session.add(d)
            drivers.append(d)
        db.session.flush()

        # Trips
        routes = [
            ('Mumbai', 'Pune', 150, 'Completed'),
            ('Pune', 'Nashik', 210, 'Completed'),
            ('Mumbai', 'Surat', 280, 'In Transit'),
            ('Nashik', 'Mumbai', 170, 'Dispatched'),
            ('Surat', 'Ahmedabad', 260, 'Completed'),
        ]

        trips = []
        for i, (src, dst, dist, status) in enumerate(routes):
            trip_date = now - timedelta(days=(10 - i * 2))
            t = Trip(
                trip_number=f"DEMO-TRP-{100 + i}",
                company_id=cid,
                vehicle_id=vehicles[i % len(vehicles)].id,
                driver_id=drivers[i % len(drivers)].id,
                source=src,
                destination=dst,
                cargo_weight_kg=random.randint(1000, 4500),
                planned_distance_km=dist,
                status=status,
                created_by=created_by_user_id,
                created_at=trip_date
            )
            if status in ['Dispatched', 'In Transit', 'Completed']:
                t.dispatched_at = trip_date + timedelta(hours=1)
            if status == 'Completed':
                t.completed_at = trip_date + timedelta(hours=6)
                t.actual_distance_km = dist * random.uniform(0.98, 1.05)
                t.revenue = random.randint(12000, 35000)
            db.session.add(t)
            trips.append(t)
        db.session.flush()

        # Fuel logs
        for i in range(8):
            v = random.choice(vehicles)
            d = random.choice(drivers)
            liters = random.uniform(30, 85)
            rate = random.uniform(92, 98)
            fl = FuelLog(
                company_id=cid,
                vehicle_id=v.id,
                driver_id=d.id,
                liters=round(liters, 2),
                price_per_liter=round(rate, 2),
                total_cost=round(liters * rate, 2),
                odometer_reading=random.randint(20000, 80000),
                date=(now - timedelta(days=i * 2)).date()
            )
            db.session.add(fl)

        # Expenses
        expense_types = ['Toll', 'Fuel Additive', 'Driver Allowance', 'State Permit']
        for i in range(6):
            ex = Expense(
                company_id=cid,
                vehicle_id=random.choice(vehicles).id,
                type=random.choice(expense_types),
                description=f"Demo Operational Expense {i+1}",
                amount=random.randint(600, 3500),
                date=(now - timedelta(days=i * 3)).date(),
                created_by=created_by_user_id,
                created_at=now - timedelta(days=i * 3)
            )
            db.session.add(ex)

        # Maintenance logs
        for i in range(3):
            ml = MaintenanceLog(
                company_id=cid,
                vehicle_id=vehicles[i].id,
                type='Scheduled' if i % 2 == 0 else 'Repair',
                description=f"Periodic Safety & Fluid Inspection {i+1}",
                status='Completed' if i > 0 else 'Open',
                cost=random.randint(2000, 8500),
                scheduled_date=(now - timedelta(days=i * 5)).date(),
                created_by=created_by_user_id,
                created_at=now - timedelta(days=i * 5)
            )
            db.session.add(ml)

    @staticmethod
    def extend_demo_sandbox(company_id: str, days: int = None, custom_date: str = None):
        """Extends the trial/demo period for a company by X days or to a custom date."""
        company = Company.query.get_or_404(company_id)
        now = datetime.utcnow()

        if custom_date:
            try:
                new_expiry = datetime.fromisoformat(custom_date.replace('Z', '+00:00')).replace(tzinfo=None)
            except Exception:
                raise ValueError("Invalid ISO date format for custom_date.")
        elif days is not None:
            days = int(days)
            # If already expired, extend from now; otherwise extend from existing expiry
            current_expiry = company.trial_ends_at or now
            base_date = max(now, current_expiry)
            new_expiry = base_date + timedelta(days=days)
        else:
            new_expiry = now + timedelta(days=7)

        company.trial_ends_at = new_expiry
        company.is_active = True

        # Sync subscription
        sub = CompanySubscription.query.filter_by(company_id=company.id).first()
        if sub:
            sub.trial_ends_at = new_expiry
            sub.current_period_end = new_expiry
            if sub.status in ['expired', 'past_due']:
                sub.status = 'trialing'

        # Record in company settings
        settings = dict(company.settings or {})
        settings['demo_last_extended_at'] = now.isoformat()
        settings['demo_extended_to'] = new_expiry.isoformat()
        company.settings = settings

        db.session.commit()
        return {
            'company_id': str(company.id),
            'name': company.name,
            'trial_ends_at': new_expiry.isoformat(),
            'days_left': round((new_expiry - now).total_seconds() / 86400, 1),
            'is_active': company.is_active
        }

    @staticmethod
    def reset_demo_dummy_data(company_id: str):
        """Wipes old dummy operational data for a demo tenant and regenerates fresh demo data.
        Company settings and user logins remain intact."""
        company = Company.query.get_or_404(company_id)
        if not company.is_demo:
            raise ValueError("Operation only permitted on demo sandbox environments.")

        # Remove operational records
        Expense.query.filter_by(company_id=company.id).delete()
        FuelLog.query.filter_by(company_id=company.id).delete()
        MaintenanceLog.query.filter_by(company_id=company.id).delete()
        Trip.query.filter_by(company_id=company.id).delete()
        Vehicle.query.filter_by(company_id=company.id).delete()
        Driver.query.filter_by(company_id=company.id).delete()
        Notification.query.filter_by(company_id=company.id).delete()

        # Find primary manager user
        manager = User.query.filter_by(company_id=company.id).first()
        user_id = manager.id if manager else None

        # Re-seed fresh dummy data
        DemoService.seed_dummy_fleet_data(company, user_id)

        settings = dict(company.settings or {})
        settings['demo_data_last_reset_at'] = datetime.utcnow().isoformat()
        company.settings = settings

        db.session.commit()
        return {
            'message': f"Dummy fleet data for '{company.name}' was successfully refreshed.",
            'company_id': str(company.id)
        }

    @staticmethod
    def update_demo_user_password(user_id: str, new_password: str):
        """Updates password for a demo user and resets any lockout."""
        if not new_password or len(str(new_password).strip()) < 8:
            raise ValueError("Password must be at least 8 characters.")

        user = User.query.get_or_404(user_id)
        if not user.company or not user.company.is_demo:
            raise ValueError("Password change via demo management is only allowed for demo users.")

        user.set_password(str(new_password).strip())
        user.failed_login_count = 0
        user.locked_until = None
        db.session.commit()

        return {
            'user_id': str(user.id),
            'email': user.email,
            'message': f"Password for {user.email} updated successfully."
        }

    @staticmethod
    def toggle_demo_status(company_id: str, is_active: bool):
        """Activates or suspends a demo sandbox."""
        company = Company.query.get_or_404(company_id)
        company.is_active = bool(is_active)
        db.session.commit()
        return {
            'company_id': str(company.id),
            'name': company.name,
            'is_active': company.is_active
        }

    @staticmethod
    def delete_demo_sandbox(company_id: str):
        """Permanently deletes a demo sandbox environment."""
        company = Company.query.get_or_404(company_id)
        if not company.is_demo:
            raise ValueError("Can only delete sandboxes flagged as demo environments.")

        # Cascade delete related records
        CompanyFeature.query.filter_by(company_id=company.id).delete()
        CompanySubscription.query.filter_by(company_id=company.id).delete()
        Notification.query.filter_by(company_id=company.id).delete()
        Expense.query.filter_by(company_id=company.id).delete()
        FuelLog.query.filter_by(company_id=company.id).delete()
        MaintenanceLog.query.filter_by(company_id=company.id).delete()
        Trip.query.filter_by(company_id=company.id).delete()
        Vehicle.query.filter_by(company_id=company.id).delete()
        Driver.query.filter_by(company_id=company.id).delete()
        User.query.filter_by(company_id=company.id).delete()
        
        name = company.name
        db.session.delete(company)
        db.session.commit()
        return {'message': f"Demo sandbox '{name}' deleted successfully."}

    @staticmethod
    def get_public_showcase_accounts():
        """Returns standard public showcase demo accounts for login screen chips."""
        demo_company = Company.query.filter(
            (Company.slug == 'demo-fleet-co') | (Company.name.ilike('%Demo Fleet%'))
        ).first()

        if not demo_company:
            return []

        users = User.query.filter_by(company_id=demo_company.id, is_active=True).all()
        results = []
        for u in users:
            results.append({
                'id': str(u.id),
                'name': u.name,
                'email': u.email,
                'role': u.role,
            })
        return results
