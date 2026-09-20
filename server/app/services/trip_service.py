from app import db
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip_event import TripEvent
from app.models.audit_log import AuditLog
from app.services.notification_service import create_notification
from datetime import datetime

class TripService:
    @staticmethod
    def check_dispatch_eligibility(company_id, vehicle_id, driver_id, cargo_weight_kg=None):
        """Centralized dispatch eligibility check for vehicle, driver, and cargo capacity."""
        reasons = []
        vehicle = Vehicle.query.filter_by(id=vehicle_id, company_id=company_id).first()
        if not vehicle:
            reasons.append("Vehicle not found")
        else:
            if not vehicle.is_active:
                reasons.append("Vehicle is inactive")
            if vehicle.status == 'In Shop':
                reasons.append("Vehicle is currently In Shop")
            elif vehicle.status == 'Retired':
                reasons.append("Vehicle is Retired")
            elif vehicle.status == 'On Trip':
                reasons.append("Vehicle is already On Trip")
            elif vehicle.status != 'Available':
                reasons.append(f"Vehicle is unavailable (status: {vehicle.status})")

            # Validate cargo weight against vehicle capacity
            if cargo_weight_kg is not None and vehicle.capacity_kg is not None:
                try:
                    c_wt = float(cargo_weight_kg)
                    v_cap = float(vehicle.capacity_kg)
                    if c_wt < 0:
                        reasons.append("Cargo weight cannot be negative")
                    elif c_wt > v_cap:
                        reasons.append(f"Cargo weight ({c_wt:.1f} kg) exceeds vehicle capacity ({v_cap:.1f} kg)")
                except (ValueError, TypeError):
                    pass

        driver = Driver.query.filter_by(id=driver_id, company_id=company_id).first()
        if not driver:
            reasons.append("Driver not found")
        else:
            if not driver.is_active:
                reasons.append("Driver is inactive")
            if getattr(driver, 'is_license_expired', False):
                reasons.append("Driver license has expired")
            if driver.status == 'On Trip':
                reasons.append("Driver is already On Trip")
            elif driver.status == 'Suspended':
                reasons.append("Driver is suspended")
            elif driver.status != 'Available':
                reasons.append(f"Driver is unavailable (status: {driver.status})")

        return (len(reasons) == 0, reasons)

    @staticmethod
    def create_trip(company_id, vehicle_id, driver_id, source, destination, cargo_weight_kg, planned_distance_km=None, notes=None, user_id=None):
        vehicle = Vehicle.query.filter_by(id=vehicle_id, company_id=company_id).first_or_404()
        driver = Driver.query.filter_by(id=driver_id, company_id=company_id).first_or_404()
        
        import uuid
        trip_number = f"TRP-{str(uuid.uuid4())[:8].upper()}"
        trip = Trip(
            trip_number=trip_number,
            company_id=company_id,
            vehicle_id=vehicle.id,
            driver_id=driver.id,
            source=source,
            destination=destination,
            cargo_weight_kg=cargo_weight_kg,
            planned_distance_km=planned_distance_km,
            notes=notes,
            status='Draft',
            created_by=user_id
        )
        
        db.session.add(trip)
        db.session.flush() # Get trip.id
        
        audit = AuditLog(user_id=user_id, company_id=company_id, action='create_trip', entity_type='trip', entity_id=trip.id)
        db.session.add(audit)
        
        db.session.commit()
        return trip
        
    @staticmethod
    def dispatch_trip(company_id, trip_id, user_id=None):
        trip = Trip.query.filter_by(id=trip_id, company_id=company_id).with_for_update().first_or_404()
        if trip.status != 'Draft':
            raise ValueError(f"Cannot dispatch trip in {trip.status} status")
            
        vehicle = Vehicle.query.filter_by(id=trip.vehicle_id, company_id=company_id).with_for_update().first()
        driver = Driver.query.filter_by(id=trip.driver_id, company_id=company_id).with_for_update().first()
        
        is_eligible, reasons = TripService.check_dispatch_eligibility(
            company_id, trip.vehicle_id, trip.driver_id, cargo_weight_kg=trip.cargo_weight_kg
        )
        if not is_eligible:
            raise ValueError(f"Dispatch ineligible: {'; '.join(reasons)}")
            
        if vehicle:
            vehicle.status = 'On Trip'
        if driver:
            driver.status = 'On Trip'
            
        trip.status = 'Dispatched'
        trip.dispatched_at = datetime.utcnow()

        event = TripEvent(company_id=company_id, trip_id=trip.id, event_type='Dispatch', created_by=user_id)
        db.session.add(event)
        
        audit = AuditLog(user_id=user_id, company_id=company_id, action='dispatch_trip', entity_type='trip', entity_id=trip.id, new_value={'status': 'Dispatched'})
        db.session.add(audit)
        
        db.session.commit()
        
        create_notification(
            company_id=company_id,
            user_id=None,
            title="New Trip Assigned",
            message=f"Trip #{trip.trip_number} from {trip.source} to {trip.destination}",
            notification_type='info',
            entity_type='trip',
            entity_id=str(trip.id)
        )
        
        return trip
        
    @staticmethod
    def complete_trip(company_id, trip_id, user_id=None, actual_distance_km=None, end_odometer=None, fuel_consumed_l=None, revenue=None, notes=None):
        trip = Trip.query.filter_by(id=trip_id, company_id=company_id).with_for_update().first_or_404()
        if trip.status not in ['Dispatched', 'In Progress']:
            raise ValueError(f"Cannot complete trip in {trip.status} status")
            
        vehicle = Vehicle.query.filter_by(id=trip.vehicle_id, company_id=company_id).with_for_update().first()
        driver = Driver.query.filter_by(id=trip.driver_id, company_id=company_id).with_for_update().first()
        
        if end_odometer is not None and str(end_odometer).strip() != '':
            end_odo = float(end_odometer)
            trip.end_odometer = end_odo
            if trip.start_odometer is not None and not actual_distance_km:
                actual_distance_km = max(0.0, end_odo - float(trip.start_odometer))
            if vehicle:
                vehicle.odometer_km = end_odo

        if actual_distance_km is not None and str(actual_distance_km).strip() != '':
            act_dist = float(actual_distance_km)
            trip.actual_distance_km = act_dist
            if vehicle and end_odometer is None:
                vehicle.odometer_km = (vehicle.odometer_km or 0) + act_dist

        if fuel_consumed_l is not None and str(fuel_consumed_l).strip() != '':
            trip.fuel_consumed_l = float(fuel_consumed_l)
        if revenue is not None and str(revenue).strip() != '':
            trip.revenue = float(revenue)
        if notes:
            trip.notes = notes

        if vehicle:
            vehicle.status = 'Available'
        if driver:
            driver.status = 'Available'
            
        trip.status = 'Completed'
        trip.completed_at = datetime.utcnow()
            
        event = TripEvent(company_id=company_id, trip_id=trip.id, event_type='Completion', created_by=user_id)
        db.session.add(event)
        
        audit = AuditLog(user_id=user_id, company_id=company_id, action='complete_trip', entity_type='trip', entity_id=trip.id, new_value={'status': 'Completed', 'end_odometer': trip.end_odometer})
        db.session.add(audit)
        
        db.session.commit()
        
        create_notification(
            company_id=company_id,
            user_id=None,
            title="Trip Completed",
            message=f"Trip #{trip.trip_number} completed by {driver.name if driver else 'Unknown Driver'}",
            notification_type='success',
            entity_type='trip',
            entity_id=str(trip.id)
        )
        
        return trip
        
    @staticmethod
    def cancel_trip(company_id, trip_id, user_id=None, reason=None):
        trip = Trip.query.filter_by(id=trip_id, company_id=company_id).with_for_update().first_or_404()
        if trip.status == 'Completed':
            raise ValueError("Cannot cancel a completed trip")
            
        if trip.status in ['Dispatched', 'In Progress']:
            vehicle = Vehicle.query.filter_by(id=trip.vehicle_id, company_id=company_id).with_for_update().first()
            driver = Driver.query.filter_by(id=trip.driver_id, company_id=company_id).with_for_update().first()
            if vehicle:
                vehicle.status = 'Available'
            if driver:
                driver.status = 'Available'
                
        trip.status = 'Cancelled'
        
        event = TripEvent(company_id=company_id, trip_id=trip.id, event_type='Cancellation', notes=reason, created_by=user_id)
        db.session.add(event)
        
        audit = AuditLog(user_id=user_id, company_id=company_id, action='cancel_trip', entity_type='trip', entity_id=trip.id, new_value={'status': 'Cancelled'})
        db.session.add(audit)
        
        db.session.commit()
        return trip
