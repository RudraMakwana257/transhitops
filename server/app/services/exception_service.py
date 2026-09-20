import uuid
from datetime import datetime, date, timedelta
from app import db
from app.models.company import Company
from app.models.operational_exception import OperationalException
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.vehicle_health import VehicleHealth
from app.models.maintenance_log import MaintenanceLog
from app.models.audit_log import AuditLog
import logging

import threading

logger = logging.getLogger(__name__)

_tenant_detection_locks = {}
_global_lock = threading.Lock()

def _get_tenant_lock(company_id):
    with _global_lock:
        cid_str = str(company_id)
        if cid_str not in _tenant_detection_locks:
            _tenant_detection_locks[cid_str] = threading.Lock()
        return _tenant_detection_locks[cid_str]

class ExceptionService:

    @staticmethod
    def run_exception_detection(company_id):
        """
        Runs deterministic exception rules for a given company/tenant.
        Guarantees idempotency and deduplication across threads and processes.
        Returns summary: {"created": X, "updated": Y, "resolved": Z, "active_total": N}
        """
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        with _get_tenant_lock(cid):
            return ExceptionService._run_detection_core(cid)

    @staticmethod
    def _run_detection_core(cid):
        # Serialize concurrent detection scans for this tenant across processes/workers
        company = Company.query.filter_by(id=cid).with_for_update().first()
        
        today = date.today()
        now = datetime.utcnow()

        created_count = 0
        updated_count = 0
        resolved_count = 0

        # --- Rule 1: Driver License Expired & Expiring ---
        try:
            drivers = Driver.query.filter_by(company_id=cid, is_active=True).all()
            for d in drivers:
                active_exc = OperationalException.query.filter(
                    OperationalException.company_id == cid,
                    OperationalException.entity_type == 'driver',
                    OperationalException.entity_id == d.id,
                    OperationalException.type.in_(['DRIVER_LICENSE_EXPIRED', 'DRIVER_LICENSE_EXPIRING']),
                    OperationalException.status.in_(['ACTIVE', 'ACKNOWLEDGED'])
                ).first()

                if d.license_expiry is None:
                    continue

                if d.license_expiry < today:
                    # License EXPIRED (CRITICAL)
                    target_type = 'DRIVER_LICENSE_EXPIRED'
                    severity = 'CRITICAL'
                    days_over = (today - d.license_expiry).days
                    title = f"Driver License Expired: {d.name}"
                    desc = f"License {d.license_number} expired {days_over} day(s) ago on {d.license_expiry.isoformat()}. Driver is ineligible for dispatch."
                    due = datetime.combine(d.license_expiry, datetime.min.time())

                    if active_exc:
                        if active_exc.type != target_type or active_exc.severity != severity or active_exc.title != title or active_exc.description != desc:
                            active_exc.type = target_type
                            active_exc.severity = severity
                            active_exc.title = title
                            active_exc.description = desc
                            active_exc.updated_at = now
                            updated_count += 1
                    else:
                        new_exc = OperationalException(
                            company_id=cid,
                            type=target_type,
                            severity=severity,
                            status='ACTIVE',
                            title=title,
                            description=desc,
                            entity_type='driver',
                            entity_id=d.id,
                            detected_at=now,
                            due_at=due,
                            meta_data={
                                'license_number': d.license_number,
                                'license_expiry': d.license_expiry.isoformat(),
                                'days_expired': days_over,
                                'recommended_action': 'Renew driver license or assign another eligible driver.'
                            }
                        )
                        db.session.add(new_exc)
                        created_count += 1

                elif today <= d.license_expiry <= today + timedelta(days=30):
                    # License EXPIRING (HIGH if <=7d, MEDIUM if <=30d)
                    target_type = 'DRIVER_LICENSE_EXPIRING'
                    days_rem = (d.license_expiry - today).days
                    severity = 'HIGH' if days_rem <= 7 else 'MEDIUM'
                    title = f"Driver License Expiring Soon: {d.name}"
                    desc = f"License {d.license_number} expires in {days_rem} day(s) on {d.license_expiry.isoformat()}."
                    due = datetime.combine(d.license_expiry, datetime.min.time())

                    if active_exc:
                        if active_exc.type != target_type or active_exc.severity != severity or active_exc.description != desc:
                            active_exc.type = target_type
                            active_exc.severity = severity
                            active_exc.title = title
                            active_exc.description = desc
                            active_exc.updated_at = now
                            updated_count += 1
                    else:
                        new_exc = OperationalException(
                            company_id=cid,
                            type=target_type,
                            severity=severity,
                            status='ACTIVE',
                            title=title,
                            description=desc,
                            entity_type='driver',
                            entity_id=d.id,
                            detected_at=now,
                            due_at=due,
                            meta_data={
                                'license_number': d.license_number,
                                'license_expiry': d.license_expiry.isoformat(),
                                'days_remaining': days_rem,
                                'recommended_action': 'Schedule driver license renewal before expiration date.'
                            }
                        )
                        db.session.add(new_exc)
                        created_count += 1
                else:
                    # License is valid and > 30 days out: auto-resolve active exception if present
                    if active_exc:
                        active_exc.status = 'RESOLVED'
                        active_exc.resolved_at = now
                        active_exc.resolution_note = 'Condition auto-resolved: Driver license renewed.'
                        resolved_count += 1
        except Exception as e:
            logger.error(f"Error running Driver License Detection Rule: {str(e)}")

        # --- Rule 2: Maintenance Overdue ---
        try:
            overdue_logs = MaintenanceLog.query.filter(
                MaintenanceLog.company_id == cid,
                MaintenanceLog.status.in_(['Open', 'Scheduled', 'In Progress']),
                MaintenanceLog.scheduled_date < today
            ).all()

            for log in overdue_logs:
                v = log.vehicle
                v_name = v.name if v else f"Vehicle #{log.vehicle_id}"
                days_over = (today - log.scheduled_date).days
                if days_over > 14:
                    severity = 'CRITICAL'
                elif days_over > 7:
                    severity = 'HIGH'
                else:
                    severity = 'MEDIUM'

                title = f"Maintenance Overdue: {v_name} ({log.type})"
                desc = f"{log.type} maintenance scheduled for {log.scheduled_date.isoformat()} is {days_over} day(s) overdue."

                active_exc = OperationalException.query.filter(
                    OperationalException.company_id == cid,
                    OperationalException.type == 'MAINTENANCE_OVERDUE',
                    OperationalException.entity_type == 'maintenance',
                    OperationalException.entity_id == log.id,
                    OperationalException.status.in_(['ACTIVE', 'ACKNOWLEDGED'])
                ).first()

                if active_exc:
                    if active_exc.severity != severity or active_exc.description != desc:
                        active_exc.severity = severity
                        active_exc.description = desc
                        active_exc.updated_at = now
                        updated_count += 1
                else:
                    new_exc = OperationalException(
                        company_id=cid,
                        type='MAINTENANCE_OVERDUE',
                        severity=severity,
                        status='ACTIVE',
                        title=title,
                        description=desc,
                        entity_type='maintenance',
                        entity_id=log.id,
                        detected_at=now,
                        due_at=datetime.combine(log.scheduled_date, datetime.min.time()),
                        meta_data={
                            'vehicle_id': str(log.vehicle_id),
                            'vehicle_name': v_name,
                            'maintenance_type': log.type,
                            'scheduled_date': log.scheduled_date.isoformat(),
                            'days_overdue': days_over,
                            'recommended_action': 'Complete maintenance log or update scheduled date.'
                        }
                    )
                    db.session.add(new_exc)
                    created_count += 1

            # Auto-resolve maintenance exceptions where log was completed or rescheduled
            active_maint_excs = OperationalException.query.filter(
                OperationalException.company_id == cid,
                OperationalException.type == 'MAINTENANCE_OVERDUE',
                OperationalException.status.in_(['ACTIVE', 'ACKNOWLEDGED'])
            ).all()

            for exc in active_maint_excs:
                log = MaintenanceLog.query.get(exc.entity_id)
                if not log or log.status == 'Completed' or (log.scheduled_date and log.scheduled_date >= today):
                    exc.status = 'RESOLVED'
                    exc.resolved_at = now
                    exc.resolution_note = 'Condition auto-resolved: Maintenance completed or rescheduled.'
                    resolved_count += 1
        except Exception as e:
            logger.error(f"Error running Maintenance Overdue Detection Rule: {str(e)}")

        # --- Rule 3: Vehicle At Risk & Health Drop ---
        try:
            health_records = VehicleHealth.query.filter_by(company_id=cid).all()
            for vh in health_records:
                if vh.health_score is None:
                    continue
                score = float(vh.health_score)
                v = vh.vehicle
                if not v or not v.is_active or v.status == 'Retired':
                    continue

                active_risk_exc = OperationalException.query.filter(
                    OperationalException.company_id == cid,
                    OperationalException.type == 'VEHICLE_AT_RISK',
                    OperationalException.entity_type == 'vehicle',
                    OperationalException.entity_id == v.id,
                    OperationalException.status.in_(['ACTIVE', 'ACKNOWLEDGED'])
                ).first()

                if score < 60.0:
                    severity = 'CRITICAL' if score < 40.0 else 'HIGH'
                    title = f"Vehicle At Risk: {v.name} (Score: {score:.1f})"
                    desc = f"Vehicle health score has dropped to {score:.1f}/100 (Grade: {vh.grade}). Risk of operational breakdown."

                    if active_risk_exc:
                        if active_risk_exc.severity != severity or active_risk_exc.description != desc:
                            active_risk_exc.severity = severity
                            active_risk_exc.description = desc
                            active_risk_exc.updated_at = now
                            updated_count += 1
                    else:
                        new_exc = OperationalException(
                            company_id=cid,
                            type='VEHICLE_AT_RISK',
                            severity=severity,
                            status='ACTIVE',
                            title=title,
                            description=desc,
                            entity_type='vehicle',
                            entity_id=v.id,
                            detected_at=now,
                            meta_data={
                                'vehicle_name': v.name,
                                'reg_number': v.reg_number,
                                'health_score': score,
                                'grade': vh.grade,
                                'recommended_action': 'Perform immediate inspection and review sub-score breakdown.'
                            }
                        )
                        db.session.add(new_exc)
                        created_count += 1
                else:
                    if active_risk_exc:
                        active_risk_exc.status = 'RESOLVED'
                        active_risk_exc.resolved_at = now
                        active_risk_exc.resolution_note = f'Condition auto-resolved: Health score recovered to {score:.1f}/100.'
                        resolved_count += 1
        except Exception as e:
            logger.error(f"Error running Vehicle At Risk Detection Rule: {str(e)}")

        db.session.commit()

        active_total = OperationalException.query.filter(
            OperationalException.company_id == cid,
            OperationalException.status.in_(['ACTIVE', 'ACKNOWLEDGED'])
        ).count()

        return {
            "created": created_count,
            "updated": updated_count,
            "resolved": resolved_count,
            "active_total": active_total
        }

    @staticmethod
    def get_exceptions(company_id, status=None, severity=None, type=None, entity_type=None, page=1, page_size=20):
        """Fetch tenant-scoped exceptions with filtering and pagination."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        query = OperationalException.query.filter(OperationalException.company_id == cid)

        if status:
            query = query.filter(OperationalException.status == status)
        if severity:
            query = query.filter(OperationalException.severity == severity)
        if type:
            query = query.filter(OperationalException.type == type)
        if entity_type:
            query = query.filter(OperationalException.entity_type == entity_type)

        query = query.order_by(OperationalException.detected_at.desc())

        pagination = query.paginate(page=page, per_page=page_size, error_out=False)
        items = [item.to_dict() for item in pagination.items]

        return {
            "items": items,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": pagination.total,
                "total_pages": pagination.pages
            }
        }

    @staticmethod
    def get_summary_stats(company_id):
        """Get summary counts of active exceptions by severity for dashboard widget."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        active_exceptions = OperationalException.query.filter(
            OperationalException.company_id == cid,
            OperationalException.status.in_(['ACTIVE', 'ACKNOWLEDGED'])
        ).all()

        counts = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
            "total_active": len(active_exceptions)
        }

        for exc in active_exceptions:
            if exc.severity in counts:
                counts[exc.severity] += 1

        return counts

    @staticmethod
    def get_exception_detail(company_id, exception_id):
        """Fetch exception details including entity info and recommended action."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        eid = uuid.UUID(exception_id) if isinstance(exception_id, str) else exception_id

        exc = OperationalException.query.filter_by(id=eid, company_id=cid).first()
        if not exc:
            return None

        data = exc.to_dict()
        data['entity_details'] = None

        # Fetch underlying entity details
        if exc.entity_type == 'driver':
            driver = Driver.query.filter_by(id=exc.entity_id, company_id=cid).first()
            if driver:
                data['entity_details'] = driver.to_dict()
        elif exc.entity_type == 'vehicle':
            vehicle = Vehicle.query.filter_by(id=exc.entity_id, company_id=cid).first()
            if vehicle:
                data['entity_details'] = vehicle.to_dict(include_relations=True)
        elif exc.entity_type == 'maintenance':
            maint = MaintenanceLog.query.filter_by(id=exc.entity_id, company_id=cid).first()
            if maint:
                data['entity_details'] = maint.to_dict(include_relations=True)

        return data

    @staticmethod
    def acknowledge_exception(company_id, user_id, exception_id):
        """Transition exception status from ACTIVE to ACKNOWLEDGED."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        eid = uuid.UUID(exception_id) if isinstance(exception_id, str) else exception_id
        uid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        exc = OperationalException.query.filter_by(id=eid, company_id=cid).first()
        if not exc:
            raise ValueError("Exception not found")

        if exc.status != 'ACTIVE':
            raise ValueError(f"Cannot acknowledge exception in {exc.status} state")

        exc.status = 'ACKNOWLEDGED'
        exc.updated_at = datetime.utcnow()

        # Audit log entry
        audit = AuditLog(
            company_id=cid,
            user_id=uid,
            action='ACKNOWLEDGE_EXCEPTION',
            entity_type='operational_exception',
            entity_id=eid,
            old_value={'status': 'ACTIVE'},
            new_value={'status': 'ACKNOWLEDGED'}
        )
        db.session.add(audit)
        db.session.commit()

        return exc.to_dict()

    @staticmethod
    def resolve_exception(company_id, user_id, exception_id, resolution_note=None):
        """Transition exception status to RESOLVED."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        eid = uuid.UUID(exception_id) if isinstance(exception_id, str) else exception_id
        uid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        exc = OperationalException.query.filter_by(id=eid, company_id=cid).first()
        if not exc:
            raise ValueError("Exception not found")

        if exc.status not in ['ACTIVE', 'ACKNOWLEDGED']:
            raise ValueError(f"Cannot resolve exception in {exc.status} state")

        old_status = exc.status
        exc.status = 'RESOLVED'
        exc.resolved_at = datetime.utcnow()
        exc.resolved_by = uid
        exc.resolution_note = resolution_note or 'Manually resolved by operator.'
        exc.updated_at = datetime.utcnow()

        audit = AuditLog(
            company_id=cid,
            user_id=uid,
            action='RESOLVE_EXCEPTION',
            entity_type='operational_exception',
            entity_id=eid,
            old_value={'status': old_status},
            new_value={'status': 'RESOLVED', 'resolution_note': exc.resolution_note}
        )
        db.session.add(audit)
        db.session.commit()

        return exc.to_dict()

    @staticmethod
    def dismiss_exception(company_id, user_id, exception_id, resolution_note=None):
        """Transition exception status to DISMISSED."""
        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        eid = uuid.UUID(exception_id) if isinstance(exception_id, str) else exception_id
        uid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        exc = OperationalException.query.filter_by(id=eid, company_id=cid).first()
        if not exc:
            raise ValueError("Exception not found")

        if exc.status not in ['ACTIVE', 'ACKNOWLEDGED']:
            raise ValueError(f"Cannot dismiss exception in {exc.status} state")

        old_status = exc.status
        exc.status = 'DISMISSED'
        exc.resolved_at = datetime.utcnow()
        exc.resolved_by = uid
        exc.resolution_note = resolution_note or 'Dismissed by operator.'
        exc.updated_at = datetime.utcnow()

        audit = AuditLog(
            company_id=cid,
            user_id=uid,
            action='DISMISS_EXCEPTION',
            entity_type='operational_exception',
            entity_id=eid,
            old_value={'status': old_status},
            new_value={'status': 'DISMISSED', 'resolution_note': exc.resolution_note}
        )
        db.session.add(audit)
        db.session.commit()

        return exc.to_dict()
