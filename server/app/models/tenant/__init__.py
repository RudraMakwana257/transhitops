"""Tenant schema models package - re-exports canonical models."""

from app.models import (
    User,
    CompanyFeature,
    Vehicle,
    Driver,
    Trip,
    TripEvent,
    MaintenanceLog,
    FuelLog,
    Expense,
    Notification,
    VehicleHealth,
)

__all__ = [
    "User",
    "CompanyFeature",
    "Vehicle",
    "Driver",
    "Trip",
    "TripEvent",
    "MaintenanceLog",
    "FuelLog",
    "Expense",
    "Notification",
    "VehicleHealth",
]