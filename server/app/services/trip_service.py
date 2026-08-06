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
        trip = Trip.query.filter_by(id=trip_id, company_id=company_id).first_or_404()
        if trip.status != 'Draft':
            raise ValueError(f"Cannot dispatch trip in {trip.status} status")
            
        vehicle = Vehicle.query.filter_by(id=trip.vehicle_id, company_id=company_id).first()
        driver = Driver.query.filter_by(id=trip.driver_id, company_id=company_id).first()
        
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
        
        # Notify driver (if they have an account, this requires mapping driver_id to user_id, 
        # but for now we just notify the fleet manager or simply create the notification)
        # Assuming we just want to create a notification for the driver if possible, 
        # but since we only have driver.id (not user.id), we'll send it company-wide or skip for now if we can't find a user.
        # Requirements say: Trip dispatched -> notify driver user (if they have account)
        # Let's check if there's a user with the driver's email (if driver has email), or just skip.
        # Since Driver model has phone but no email, let's just log it or pass None for user_id to notify company users.
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
    def complete_trip(company_id, trip_id, user_id=None, actual_distance_km=None):
        trip = Trip.query.filter_by(id=trip_id, company_id=company_id).first_or_404()
        if trip.status not in ['Dispatched', 'In Progress']:
            raise ValueError(f"Cannot complete trip in {trip.status} status")
            
        vehicle = Vehicle.query.filter_by(id=trip.vehicle_id, company_id=company_id).first()
        driver = Driver.query.filter_by(id=trip.driver_id, company_id=company_id).first()
        
        if vehicle:
            vehicle.status = 'Available'
            if actual_distance_km:
                vehicle.odometer_km = (vehicle.odometer_km or 0) + actual_distance_km
        if driver:
            driver.status = 'Available'
            
        trip.status = 'Completed'
        trip.completed_at = datetime.utcnow()
        if actual_distance_km:
            trip.actual_distance_km = actual_distance_km
            
        event = TripEvent(company_id=company_id, trip_id=trip.id, event_type='Completion', created_by=user_id)
        db.session.add(event)
        
        audit = AuditLog(user_id=user_id, company_id=company_id, action='complete_trip', entity_type='trip', entity_id=trip.id, new_value={'status': 'Completed'})
        db.session.add(audit)
        
        db.session.commit()
        
        # Notify fleet_manager
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
        trip = Trip.query.filter_by(id=trip_id, company_id=company_id).first_or_404()
        if trip.status == 'Completed':
            raise ValueError("Cannot cancel a completed trip")
            
        if trip.status in ['Dispatched', 'In Progress']:
            vehicle = Vehicle.query.filter_by(id=trip.vehicle_id, company_id=company_id).first()
            driver = Driver.query.filter_by(id=trip.driver_id, company_id=company_id).first()
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
