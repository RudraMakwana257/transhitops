import logging
from typing import Dict, Any, List
from sqlalchemy import func
from app import db
from app.models.vehicle import Vehicle
from app.services.ai.tools.common import ToolResult

logger = logging.getLogger(__name__)

def get_vehicle_summary(company_id) -> ToolResult:
    """
    Returns vehicle status counts and fleet utilization percentage for a company.
    Query: 1 SQL GROUP BY query.
    """
    if not company_id:
        return ToolResult(success=False, error="company_id is required")

    results = db.session.query(
        Vehicle.status, func.count(Vehicle.id)
    ).filter(
        Vehicle.company_id == company_id,
        Vehicle.is_active == True
    ).group_by(Vehicle.status).all()

    counts = dict(results)
    available = counts.get('Available', 0)
    on_trip = counts.get('On Trip', 0)
    in_shop = counts.get('In Shop', 0)
    total = sum(counts.values())
    utilization_pct = round((on_trip / total * 100), 1) if total > 0 else 0.0

    return ToolResult(
        success=True,
        data={
            "total": total,
            "available": available,
            "on_trip": on_trip,
            "in_shop": in_shop,
            "utilization_pct": utilization_pct
        },
        metadata={"query_type": "group_by", "record_count": total}
    )


def get_available_vehicles(company_id) -> ToolResult:
    """
    Returns list of vehicles currently available for dispatch.
    """
    if not company_id:
        return ToolResult(success=False, error="company_id is required")

    vehicles = Vehicle.query.filter_by(
        company_id=company_id,
        status='Available',
        is_active=True
    ).all()

    data = [
        {
            "id": str(v.id),
            "name": v.name,
            "reg_number": v.reg_number,
            "type": v.type,
            "capacity_kg": float(v.capacity_kg) if v.capacity_kg else 0.0,
            "odometer_km": float(v.odometer_km) if v.odometer_km else 0.0,
        }
        for v in vehicles
    ]

    return ToolResult(
        success=True,
        data=data,
        metadata={"available_count": len(data)}
    )
