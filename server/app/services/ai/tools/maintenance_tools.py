import logging
from typing import Dict, Any
from app import db
from app.models.maintenance_log import MaintenanceLog
from app.services.ai.tools.common import ToolResult

logger = logging.getLogger(__name__)

def get_open_maintenance(company_id) -> ToolResult:
    """
    Returns total open or in-progress repair jobs.
    Query: 1 SQL query.
    """
    if not company_id:
        return ToolResult(success=False, error="company_id is required")

    open_jobs = MaintenanceLog.query.filter(
        MaintenanceLog.company_id == company_id,
        MaintenanceLog.status.in_(['Open', 'In Progress'])
    ).count()

    return ToolResult(
        success=True,
        data={"open_jobs": open_jobs},
        metadata={"open_jobs": open_jobs}
    )
