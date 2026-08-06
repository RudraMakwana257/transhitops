import logging
from datetime import date, timedelta
from typing import Dict, Any
from sqlalchemy import func, case, and_
from app import db
from app.models.driver import Driver
from app.services.ai.tools.common import ToolResult

logger = logging.getLogger(__name__)

def get_driver_summary(company_id, today: date | None = None) -> ToolResult:
    """
    Returns driver counts grouped by status and license expiration alerts.
    Query: 2 SQL queries (1 GROUP BY + 1 aggregate query).
    """
    if not company_id:
        return ToolResult(success=False, error="company_id is required")

    today_date = today or date.today()

    status_results = db.session.query(
        Driver.status, func.count(Driver.id)
    ).filter(
        Driver.company_id == company_id,
        Driver.is_active == True
    ).group_by(Driver.status).all()

    status_counts = dict(status_results)
    total_drivers = sum(status_counts.values())
    available_drivers = status_counts.get('Available', 0)
    suspended_drivers = status_counts.get('Suspended', 0)

    expiry_agg = db.session.query(
        func.sum(case((and_(Driver.license_expiry <= today_date + timedelta(days=30), Driver.license_expiry >= today_date), 1), else_=0)).label('expiring_soon'),
        func.sum(case((Driver.license_expiry < today_date, 1), else_=0)).label('expired')
    ).filter(
        Driver.company_id == company_id,
        Driver.is_active == True
    ).first()

    expiring_soon = int(expiry_agg.expiring_soon or 0) if expiry_agg else 0
    expired = int(expiry_agg.expired or 0) if expiry_agg else 0

    return ToolResult(
        success=True,
        data={
            "total": total_drivers,
            "available": available_drivers,
            "suspended": suspended_drivers,
            "licenses_expiring_soon": expiring_soon,
            "licenses_expired": expired
        },
        metadata={"record_count": total_drivers}
    )
