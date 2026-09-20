import pytest
from app import db
from app.models.vehicle import Vehicle
from app.models.fuel_log import FuelLog
from app.models.maintenance_log import MaintenanceLog
from app.models.vehicle_health import VehicleHealth
from app.services.vehicle_health_service import (
    recalculate_health_score,
    calculate_fuel_efficiency_score,
    calculate_maintenance_score,
    calculate_utilization_score,
    calculate_age_score,
    calculate_cost_score
)
from datetime import date, timedelta

def test_health_score_total_cost_and_bounds(app, company_a_id):
    """Test health score calculation uses FuelLog.total_cost without crash and stays within [0.0, 100.0]."""
    with app.app_context():
        import uuid
        cid = uuid.UUID(company_a_id) if isinstance(company_a_id, str) else company_a_id

        # 1. Create Vehicle
        v = Vehicle(company_id=cid, reg_number='HEALTH-01', name='Health Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0, purchase_date=date.today() - timedelta(days=365*2))
        db.session.add(v)
        db.session.commit()

        # 2. Add Fuel Logs using `total_cost` attribute
        f1 = FuelLog(company_id=cid, vehicle_id=v.id, date=date.today() - timedelta(days=5), liters=100, price_per_liter=2.0, total_cost=200.0)
        f2 = FuelLog(company_id=cid, vehicle_id=v.id, date=date.today() - timedelta(days=10), liters=50, price_per_liter=2.0, total_cost=100.0)
        db.session.add_all([f1, f2])
        db.session.commit()

        # 3. Recalculate health score (must NOT crash with AttributeError for FuelLog.cost)
        recalculate_health_score(cid, v.id)

        # 4. Fetch resulting VehicleHealth
        vh = VehicleHealth.query.filter_by(vehicle_id=v.id, company_id=cid).first()
        assert vh is not None
        assert vh.health_score is not None
        score = float(vh.health_score)
        assert 0.0 <= score <= 100.0
        assert 0.0 <= float(vh.fuel_efficiency_score) <= 100.0
        assert 0.0 <= float(vh.maintenance_score) <= 100.0
        assert 0.0 <= float(vh.utilization_score) <= 100.0
        assert 0.0 <= float(vh.age_score) <= 100.0
        assert 0.0 <= float(vh.cost_score) <= 100.0

def test_health_score_edge_cases_zero_cost_and_missing_data(app, company_a_id):
    """Test health score handling of missing data, zero fuel, and zero cost."""
    with app.app_context():
        import uuid
        cid = uuid.UUID(company_a_id) if isinstance(company_a_id, str) else company_a_id

        # Vehicle with no logs or purchase date
        v_new = Vehicle(company_id=cid, reg_number='HEALTH-02', name='Brand New Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0)
        db.session.add(v_new)
        db.session.commit()

        recalculate_health_score(cid, v_new.id)

        vh = VehicleHealth.query.filter_by(vehicle_id=v_new.id, company_id=cid).first()
        assert vh is not None
        score = float(vh.health_score)
        assert 0.0 <= score <= 100.0
        assert float(vh.cost_score) <= 100.0
