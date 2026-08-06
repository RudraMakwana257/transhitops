import logging
from typing import Dict, Any
from app.services.ai.tools.common import ToolResult
from app.services.ai.tools.vehicle_tools import get_vehicle_summary
from app.services.ai.tools.trip_tools import get_trip_summary
from app.services.ai.tools.maintenance_tools import get_open_maintenance

logger = logging.getLogger(__name__)

def get_dashboard_metrics(company_id) -> ToolResult:
    """
    Aggregates high-level fleet metrics across vehicles, trips, and maintenance.
    """
    if not company_id:
        return ToolResult(success=False, error="company_id is required")

    v_res = get_vehicle_summary(company_id)
    t_res = get_trip_summary(company_id)
    m_res = get_open_maintenance(company_id)

    if not (v_res.success and t_res.success and m_res.success):
        return ToolResult(success=False, error="Failed to aggregate analytics metrics")

    data = {
        "vehicles": v_res.data,
        "trips": t_res.data,
        "maintenance": m_res.data
    }

    return ToolResult(
        success=True,
        data=data,
        metadata={"aggregated_sources": ["vehicles", "trips", "maintenance"]}
    )
