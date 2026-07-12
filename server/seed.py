from app import create_app, db
from app.models import User, Vehicle, Driver, Trip, TripEvent, MaintenanceLog, FuelLog, Expense, VehicleHealth
from datetime import datetime, date
from uuid import uuid4

app = create_app()

with app.app_context():
    db.create_all()
    if User.query.first():
        print("Database already seeded")
        exit()

    users = [
        User(name='Rajesh Kumar', email='manager@transitops.com', role='fleet_manager'),
        User(name='Priya Sharma', email='dispatcher@transitops.com', role='dispatcher'),
        User(name='Amit Verma', email='safety@transitops.com', role='safety_officer'),
        User(name='Sunita Patel', email='finance@transitops.com', role='financial_analyst'),
    ]
    for u in users:
        u.set_password('Admin@123')
    db.session.add_all(users)
    db.session.flush()

    vehicles_data = [
        ('MH-01-AB-1234', 'Truck-12', 'Truck', 5000, 1200000, 45000, date(2023,6,15), 'Available', 'Mumbai'),
        ('MH-01-AB-5678', 'Truck-15', 'Truck', 8000, 1500000, 32000, date(2024,1,20), 'On Trip', 'Pune'),
        ('MH-01-CD-9012', 'Van-03', 'Van', 1500, 600000, 28500, date(2023,9,10), 'Available', 'Mumbai'),
        ('MH-01-EF-3456', 'Pickup-07', 'Pickup', 2000, 750000, 55000, date(2022,11,5), 'In Shop', 'Nashik'),
        ('MH-01-GH-7890', 'Tanker-01', 'Tanker', 10000, 2000000, 18000, date(2024,3,15), 'Available', 'Mumbai'),
        ('MH-01-IJ-2345', 'Bus-02', 'Bus', 3000, 1800000, 62000, date(2022,8,20), 'On Trip', 'Pune'),
        ('MH-01-KL-6789', 'Trailer-04', 'Trailer', 12000, 2200000, 41000, date(2023,12,1), 'Available', 'Mumbai'),
        ('MH-01-MN-0123', 'Truck-18', 'Truck', 6000, 1300000, 75000, date(2021,12,10), 'Retired', 'Nagpur'),
        ('MH-01-OP-4567', 'Van-08', 'Van', 1800, 650000, 22000, date(2024,2,15), 'Available', 'Nashik'),
        ('MH-01-QR-8901', 'Pickup-11', 'Pickup', 2500, 800000, 38000, date(2023,7,20), 'On Trip', 'Pune'),
    ]
    vehicles = []
    for v in vehicles_data:
        veh = Vehicle(reg_number=v[0], name=v[1], type=v[2], capacity_kg=v[3], acquisition_cost=v[4], odometer_km=v[5], purchase_date=v[6], status=v[7], region=v[8])
        db.session.add(veh)
        vehicles.append(veh)
    db.session.flush()

    drivers_data = [
        ('Ravi Kumar', 'MH12345', 'HMV', date(2026,6,15), '9876543210', 92.5, 'Available'),
        ('Suresh Patil', 'MH67890', 'HMV', date(2025,1,5), '9876543211', 78.0, 'Available'),
        ('Deepak Singh', 'MH11223', 'HMV', date(2026,12,31), '9876543212', 88.5, 'On Trip'),
        ('Manoj Yadav', 'MH44556', 'HMV', date(2025,2,10), '9876543213', 65.0, 'Suspended'),
        ('Kiran Sharma', 'MH77889', 'LMV', date(2027,3,20), '9876543214', 95.0, 'Available'),
        ('Prakash Gupta', 'MH99001', 'HMV', date(2025,3,15), '9876543215', 82.0, 'On Trip'),
        ('Vijay Chavan', 'MH22334', 'HMV', date(2026,9,30), '9876543216', 71.0, 'Off Duty'),
        ('Rajesh More', 'MH55667', 'HPMV', date(2026,11,11), '9876543217', 90.0, 'Available'),
    ]
    drivers = []
    for d in drivers_data:
        drv = Driver(name=d[0], license_number=d[1], license_category=d[2], license_expiry=d[3], phone=d[4], safety_score=d[5], status=d[6])
        db.session.add(drv)
        drivers.append(drv)
    db.session.flush()

    v = {veh.reg_number: veh for veh in vehicles}
    dr = {drv.license_number: drv for drv in drivers}

    trips_data = [
        ('TRIP-20250115-0001', v['MH-01-AB-5678'], dr['MH11223'], 'Mumbai', 'Pune', 6500, 150, 'Dispatched', 32000, None, None, 0, datetime(2025,1,15,10,30), None, datetime(2025,1,15,7,30)),
        ('TRIP-20250115-0002', v['MH-01-IJ-2345'], dr['MH99001'], 'Mumbai', 'Nashik', 2500, 180, 'Dispatched', 62000, None, None, 0, datetime(2025,1,15,11,0), None, datetime(2025,1,15,9,0)),
        ('TRIP-20250114-0001', v['MH-01-AB-1234'], dr['MH12345'], 'Mumbai', 'Pune', 4500, 150, 'Completed', 45000, 45152, 45.5, 25000, datetime(2025,1,14,9,0), datetime(2025,1,14,14,30), datetime(2025,1,14,8,0)),
        ('TRIP-20250114-0002', v['MH-01-CD-9012'], dr['MH77889'], 'Pune', 'Nashik', 1200, 200, 'Completed', 28500, 28700, 28.0, 18000, datetime(2025,1,14,10,0), datetime(2025,1,14,16,0), datetime(2025,1,14,9,0)),
        ('TRIP-20250113-0001', v['MH-01-MN-0123'], dr['MH22334'], 'Mumbai', 'Nagpur', 5500, 700, 'Cancelled', None, None, None, 0, None, None, datetime(2025,1,13,8,0)),
    ]
    trips = []
    for t in trips_data:
        tp = Trip(trip_number=t[0], vehicle_id=t[1].id, driver_id=t[2].id, source=t[3], destination=t[4], cargo_weight_kg=t[5], planned_distance_km=t[6], status=t[7], start_odometer=t[8], end_odometer=t[9], fuel_consumed_l=t[10], revenue=t[11], dispatched_at=t[12], completed_at=t[13], created_at=t[14])
        db.session.add(tp)
        trips.append(tp)
    db.session.flush()

    tp = {t.trip_number: t for t in trips}

    maintenance_data = [
        (v['MH-01-EF-3456'], 'Oil Change', 'Regular 10k km service', 'In Progress', 5000, 'Ramesh Garage', date(2025,1,15), None, 55000),
        (v['MH-01-AB-1234'], 'Brake Service', 'Front brake pads replacement', 'Completed', 12000, 'AutoCare', date(2025,1,10), date(2025,1,10), 44900),
        (v['MH-01-CD-9012'], 'Tyre Replacement', 'All 4 tyres', 'Completed', 25000, 'TyreWorld', date(2025,1,8), date(2025,1,8), 28400),
        (v['MH-01-MN-0123'], 'Engine Repair', 'Coolant leak fix', 'Open', 45000, 'DieselWorks', date(2025,1,20), None, 75000),
        (v['MH-01-GH-7890'], 'Preventive', 'Full inspection', 'Completed', 8000, 'FleetCare', date(2025,1,5), date(2025,1,5), 18000),
    ]
    for m in maintenance_data:
        db.session.add(MaintenanceLog(vehicle_id=m[0].id, type=m[1], description=m[2], status=m[3], cost=m[4], technician=m[5], scheduled_date=m[6], completed_date=m[7], odometer_at_service=m[8]))
    db.session.flush()

    fuel_data = [
        (v['MH-01-AB-1234'], dr['MH12345'], tp['TRIP-20250114-0001'], date(2025,1,14), 45.5, 98.50, 45152, 'HP Petrol Pump'),
        (v['MH-01-CD-9012'], dr['MH77889'], tp['TRIP-20250114-0002'], date(2025,1,14), 28.0, 99.00, 28700, 'Indian Oil'),
        (v['MH-01-AB-5678'], dr['MH11223'], tp['TRIP-20250115-0001'], date(2025,1,15), 52.0, 98.00, 32150, 'Bharat Petroleum'),
        (v['MH-01-IJ-2345'], dr['MH99001'], tp['TRIP-20250115-0002'], date(2025,1,15), 38.5, 97.50, 62180, 'HP Petrol Pump'),
        (v['MH-01-AB-1234'], dr['MH12345'], None, date(2025,1,10), 42.0, 99.00, 44950, 'Indian Oil'),
        (v['MH-01-GH-7890'], dr['MH55667'], None, date(2025,1,12), 65.0, 97.00, 18065, 'Reliance'),
        (v['MH-01-QR-8901'], dr['MH67890'], None, date(2025,1,11), 30.0, 98.50, 38030, 'HP Petrol Pump'),
        (v['MH-01-OP-4567'], dr['MH77889'], None, date(2025,1,13), 25.0, 99.50, 22100, 'Indian Oil'),
    ]
    for f in fuel_data:
        db.session.add(FuelLog(vehicle_id=f[0].id, driver_id=f[1].id if f[1] else None, trip_id=f[2].id if f[2] else None, date=f[3], liters=f[4], price_per_liter=f[5], total_cost=round(f[4]*f[5],2), odometer_reading=f[6], fuel_station=f[7]))
    db.session.flush()

    expense_data = [
        (v['MH-01-AB-1234'], tp['TRIP-20250114-0001'], 'Toll', 1200, 'Mumbai-Pune expressway', date(2025,1,14)),
        (v['MH-01-CD-9012'], tp['TRIP-20250114-0002'], 'Toll', 450, 'Pune-Nashik highway', date(2025,1,14)),
        (v['MH-01-EF-3456'], None, 'Repair', 8500, 'Suspension repair', date(2025,1,10)),
        (v['MH-01-AB-5678'], None, 'Permit', 3500, 'All India permit renewal', date(2025,1,5)),
        (v['MH-01-GH-7890'], None, 'Insurance', 45000, 'Annual insurance', date(2025,1,1)),
        (v['MH-01-AB-1234'], None, 'Tyre', 12000, '2 new tyres', date(2025,1,8)),
        (v['MH-01-IJ-2345'], None, 'Fine', 2000, 'Overloading fine', date(2025,1,3)),
        (v['MH-01-OP-4567'], None, 'Repair', 6500, 'AC compressor', date(2025,1,12)),
        (v['MH-01-MN-0123'], None, 'Other', 1500, 'Document charges', date(2025,1,5)),
        (v['MH-01-KL-6789'], None, 'Insurance', 35000, 'Annual insurance', date(2025,1,1)),
    ]
    for e in expense_data:
        db.session.add(Expense(vehicle_id=e[0].id, trip_id=e[1].id if e[1] else None, type=e[2], amount=e[3], description=e[4], date=e[5]))
    db.session.flush()

    health_data = [
        (v['MH-01-GH-7890'], 91, 95, 90, 85, 95, 92),
        (v['MH-01-AB-5678'], 92, 92, 95, 90, 95, 88),
        (v['MH-01-KL-6789'], 87, 88, 85, 80, 95, 85),
        (v['MH-01-AB-1234'], 87, 90, 85, 80, 95, 88),
        (v['MH-01-OP-4567'], 85, 85, 90, 75, 95, 82),
        (v['MH-01-QR-8901'], 81, 82, 80, 78, 85, 79),
        (v['MH-01-CD-9012'], 78, 78, 75, 70, 90, 75),
        (v['MH-01-IJ-2345'], 69, 72, 65, 75, 60, 70),
        (v['MH-01-EF-3456'], 63, 65, 60, 50, 75, 65),
        (v['MH-01-MN-0123'], 31, 40, 30, 20, 20, 35),
    ]
    for h in health_data:
        db.session.add(VehicleHealth(vehicle_id=h[0].id, health_score=h[1], fuel_efficiency_score=h[2], maintenance_score=h[3], utilization_score=h[4], age_score=h[5], cost_score=h[6]))

    db.session.commit()
    print("Database seeded successfully!")
