"""SQLAlchemy naming conventions for consistent constraint/index names."""

from sqlalchemy import MetaData

# Naming convention for constraints and indexes
# This ensures consistent, predictable names across all tables
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

# Create metadata with naming convention
metadata = MetaData(naming_convention=NAMING_CONVENTION)

# Export for use in models
__all__ = ["NAMING_CONVENTION", "metadata"]