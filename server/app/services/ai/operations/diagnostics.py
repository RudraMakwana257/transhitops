"""
Diagnostics Module — DiagnosticRunner executing system health probes across AI backend subsystems.
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

@dataclass
class DiagnosticReport:
    """
    Complete diagnostic summary report across all AI backend subsystems.
    """
    timestamp: float
    overall_status: str               # 'PASS', 'WARN', 'FAIL'
    component_details: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "overall_status": self.overall_status,
            "component_details": self.component_details,
            "warnings": self.warnings,
            "errors": self.errors,
        }


class DiagnosticRunner:
    """
    System Diagnostic Runner probing health across all operational and runtime subsystems.
    """

    @staticmethod
    def run_diagnostics() -> DiagnosticReport:
        """
        Executes a diagnostic pass over all registries, managers, and engines.
        """
        details = {}
        warnings = []
        errors = []

        # 1. Provider Registry Probe
        try:
            from app.services.ai.providers.provider_registry import ProviderRegistry
            pr = ProviderRegistry()
            details["provider_registry"] = {"status": "PASS", "providers": pr.list_providers()}
        except Exception as e:
            errors.append(f"ProviderRegistry probe failed: {str(e)}")
            details["provider_registry"] = {"status": "FAIL", "error": str(e)}

        # 2. Tool Registry Probe
        try:
            from app.services.ai.tools.registry import list_tools
            tools = list_tools()
            details["tool_registry"] = {"status": "PASS", "tool_count": len(tools)}
        except Exception as e:
            errors.append(f"ToolRegistry probe failed: {str(e)}")
            details["tool_registry"] = {"status": "FAIL", "error": str(e)}

        # 3. Operations Probe
        try:
            from app.services.ai.operations.configuration_manager import ConfigurationManager
            from app.services.ai.operations.feature_flags import FeatureFlagManager
            from app.services.ai.operations.quota_manager import QuotaManager

            cm = ConfigurationManager()
            ff = FeatureFlagManager()
            qm = QuotaManager()

            details["operations"] = {
                "config_version": cm.get_snapshot().version,
                "reasoning_enabled": ff.is_reasoning_enabled(),
                "quota_check_pass": qm.check_quota("test_tenant"),
                "status": "PASS"
            }
        except Exception as e:
            errors.append(f"Operations probe failed: {str(e)}")
            details["operations"] = {"status": "FAIL", "error": str(e)}

        overall_status = "PASS"
        if errors:
            overall_status = "FAIL"
        elif warnings:
            overall_status = "WARN"

        return DiagnosticReport(
            timestamp=time.time(),
            overall_status=overall_status,
            component_details=details,
            warnings=warnings,
            errors=errors
        )
