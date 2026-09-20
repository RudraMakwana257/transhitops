import click
from flask.cli import with_appcontext
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
from app.models.company_feature import CompanyFeature
from app.models.subscription_plan import SubscriptionPlan
from app.services.quota_service import QuotaService
import random
from datetime import datetime, timedelta

def register_commands(app):
    @app.cli.command("seed-demo")
    def seed_demo():
        """Creates a demo account with realistic data."""
        # Check if Demo Fleet Co already exists and delete it
        existing_company = Company.query.filter_by(name="Demo Fleet Co").first()
        if existing_company:
            # Delete all related records first to avoid foreign key constraints
            CompanyFeature.query.filter_by(company_id=existing_company.id).delete()
            CompanySubscription.query.filter_by(company_id=existing_company.id).delete()
            Notification.query.filter_by(company_id=existing_company.id).delete()
            Expense.query.filter_by(company_id=existing_company.id).delete()
            FuelLog.query.filter_by(company_id=existing_company.id).delete()
            MaintenanceLog.query.filter_by(company_id=existing_company.id).delete()
            Trip.query.filter_by(company_id=existing_company.id).delete()
            Vehicle.query.filter_by(company_id=existing_company.id).delete()
            Driver.query.filter_by(company_id=existing_company.id).delete()
            User.query.filter_by(company_id=existing_company.id).delete()
            db.session.delete(existing_company)
            db.session.commit()
            click.echo("Deleted existing Demo Fleet Co.")

        # Create new Demo Fleet Co
        company = Company(
            name="Demo Fleet Co",
            slug="demo-fleet-co",
            email="demo@transitops.com",
            phone="+919876543210",
            address="123 Logistics Park, Mumbai",
            is_active=True
        )
        db.session.add(company)
        db.session.flush()

        # Attach Enterprise subscription plan
        enterprise_plan = SubscriptionPlan.query.filter_by(slug='enterprise').first()
        if not enterprise_plan:
            enterprise_plan = SubscriptionPlan.query.filter_by(is_active=True).first()
        if enterprise_plan:
            sub = CompanySubscription(
                company_id=company.id,
                plan_id=enterprise_plan.id,
                status='active',
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=365)
            )
            db.session.add(sub)
            QuotaService.sync_company_features(company.id, enterprise_plan)

        # Create demo logins
        demo_users = [
            ("Demo Fleet Manager", "demo@transitops.com", "fleet_manager", "Demo@12345"),
            ("Fleet Manager", "manager@transitops.com", "fleet_manager", "Admin@123"),
            ("Dispatcher", "dispatcher@transitops.com", "dispatcher", "Admin@123"),
            ("Safety Officer", "safety@transitops.com", "safety_officer", "Admin@123"),
            ("Financial Analyst", "finance@transitops.com", "financial_analyst", "Admin@123"),
        ]
        created_users = []
        for name, email, role, pwd in demo_users:
            u = User(
                company_id=company.id,
                name=name,
                email=email,
                role=role,
                is_active=True,
                onboarding_completed=True
            )
            u.set_password(pwd)
            db.session.add(u)
            created_users.append(u)
        db.session.flush()
        user = created_users[0]

        # Create 8 vehicles
        vehicles = []
        vehicle_types = ['Truck', 'Van', 'Tanker', 'Truck', 'Truck', 'Van', 'Truck', 'Tanker']
        statuses = ['Available', 'On Trip', 'In Shop', 'Available', 'On Trip', 'Available', 'Available', 'On Trip']
        for i in range(8):
            v = Vehicle(
                company_id=company.id,
                reg_number=f"MH-{random.randint(10, 40)}-{random.randint(1000, 9999)}",
                name=f"Demo {vehicle_types[i]} {i+1}",
                type=vehicle_types[i],
                status=statuses[i],
                capacity_kg=random.choice([1000, 2000, 5000, 10000]),
                acquisition_cost=random.randint(500000, 2000000)
            )
            db.session.add(v)
            vehicles.append(v)
        db.session.flush()

        # Create 6 drivers
        drivers = []
        driver_statuses = ['Available', 'On Trip', 'Available', 'On Trip', 'On Trip', 'Available']
        for i in range(6):
            d = Driver(
                company_id=company.id,
                name=f"Driver {chr(65+i)}",
                license_number=f"MH{random.randint(10, 99)}{random.randint(1000000, 9999999)}",
                license_category="HGMV",
                license_expiry=(datetime.utcnow() + timedelta(days=random.randint(100, 1000))).date(),
                phone=f"+9198765{random.randint(10000, 99999)}",
                status=driver_statuses[i],
                safety_score=random.uniform(70.0, 100.0)
            )
            db.session.add(d)
            drivers.append(d)
        db.session.flush()

        cities = ["Mumbai", "Delhi", "Pune", "Bangalore", "Chennai", "Hyderabad", "Ahmedabad", "Surat", "Jaipur", "Kolkata"]

        # Create 10 trips
        trips = []
        trip_statuses = ['Draft', 'Dispatched', 'In Transit', 'Completed', 'Cancelled', 'Completed', 'In Transit', 'Completed', 'Completed', 'Completed']
        for i in range(10):
            source = random.choice(cities)
            dest = random.choice([c for c in cities if c != source])
            trip_date = datetime.utcnow() - timedelta(days=(30 - (i * 3)))
            t = Trip(
                trip_number=f"TRP-DEMO-{1000+i}",
                company_id=company.id,
                vehicle_id=random.choice(vehicles).id,
                driver_id=random.choice(drivers).id,
                source=source,
                destination=dest,
                cargo_weight_kg=random.uniform(500, 5000),
                planned_distance_km=random.uniform(50, 1500),
                status=trip_statuses[i],
                created_by=user.id,
                created_at=trip_date
            )
            if trip_statuses[i] in ['Dispatched', 'In Transit', 'Completed']:
                t.dispatched_at = trip_date + timedelta(hours=1)
            if trip_statuses[i] == 'Completed':
                t.completed_at = trip_date + timedelta(days=1)
                t.actual_distance_km = t.planned_distance_km * random.uniform(0.95, 1.1)
                t.fuel_consumed_l = float(t.actual_distance_km) / random.uniform(3.0, 8.0)
                t.revenue = random.uniform(10000, 50000)
            db.session.add(t)
            trips.append(t)
        db.session.flush()

        # Create 15 fuel logs
        for i in range(15):
            liters = random.uniform(20, 100)
            price_per_liter = random.uniform(90, 110)
            log_date = datetime.utcnow() - timedelta(days=(30 - (i * 2)))
            fl = FuelLog(
                company_id=company.id,
                vehicle_id=random.choice(vehicles).id,
                driver_id=random.choice(drivers).id,
                liters=liters,
                price_per_liter=price_per_liter,
                total_cost=liters * price_per_liter,
                odometer_reading=random.uniform(1000, 100000),
                date=log_date.date()
            )
            db.session.add(fl)

        # Create 8 expenses
        for i in range(8):
            ex_date = datetime.utcnow() - timedelta(days=(30 - (i * 3)))
            ex = Expense(
                company_id=company.id,
                vehicle_id=random.choice(vehicles).id,
                trip_id=random.choice(trips).id if random.random() > 0.5 else None,
                type=random.choice(['Toll', 'Food', 'Maintenance', 'Other']),
                description="Demo expense",
                amount=random.uniform(500, 5000),
                date=ex_date.date(),
                created_by=user.id,
                created_at=ex_date
            )
            db.session.add(ex)

        # Create 5 maintenance logs
        for i in range(5):
            ml_date = datetime.utcnow() - timedelta(days=(20 - (i * 4)))
            ml = MaintenanceLog(
                company_id=company.id,
                vehicle_id=random.choice(vehicles).id,
                type=random.choice(['Scheduled', 'Unscheduled', 'Repair']),
                description=f"Demo Maintenance {i}",
                status=random.choice(['Open', 'Completed']),
                cost=random.uniform(1000, 10000),
                scheduled_date=ml_date.date(),
                created_by=user.id,
                created_at=ml_date
            )
            db.session.add(ml)

        db.session.commit()
        click.echo("Demo Fleet Co created successfully")

    @app.cli.command("run-scheduler")
    def run_scheduler():
        """Runs the background exception scheduler process in standalone mode."""
        from app.services.scheduler import _run_scheduled_exception_scans
        click.echo("Starting TransitOps Standalone Background Scheduler Process...")
        _run_scheduled_exception_scans(app, interval_seconds=300)
