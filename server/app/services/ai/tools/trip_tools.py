import logging
from datetime import date, timedelta
from typing import Dict, Any
from sqlalchemy import func
from app import db
from app.models.trip import Trip
from app.services.ai.tools.common import ToolResult

logger = logging.getLogger(__name__)

def get_trip_summary(company_id, thirty_days_ago: date | None = None) -> ToolResult:
    """
    Returns active (Dispatched), draft, and completed monthly trip counts.
    Query: 2 SQL queries.
    """
    if not company_id:
        return ToolResult(success=False, error="company_id is required")

    cutoff_date = thirty_days_ago or (date.today() - timedelta(days=30))

    status_results = db.session.query(
        Trip.status, func.count(Trip.id)
    ).filter(
        Trip.company_id == company_id
    ).group_by(Trip.status).all()

    status_counts = dict(status_results)
    active_trips = status_counts.get('Dispatched', 0)
    draft_trips = status_counts.get('Draft', 0)

    completed_month = Trip.query.filter(
        Trip.company_id == company_id,
        Trip.status == 'Completed',
        Trip.completed_at >= cutoff_date
    ).count()

    return ToolResult(
        success=True,
        data={
            "active": active_trips,
            "draft": draft_trips,
            "completed_this_month": completed_month
        },
        metadata={"active_trips": active_trips}
    )
