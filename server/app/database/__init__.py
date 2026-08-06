"""Database module exports."""

from app.database.base import (
    Base,
    PublicBaseModel,
    PublicSoftDeleteModel,
    TenantBaseModel,
    TenantSoftDeleteModel,
    ImmutableModel,
)
from app.database.mixins import (
    UUIDMixin,
    TimestampMixin,
    AuditMixin,
    SoftDeleteMixin,
    TenantModelMixin,
    PublicModelMixin,
    TenantModelBase,
    partial_index,
    unique_partial_constraint,
)
from app.database.naming import NAMING_CONVENTION, metadata
from app.database.types import (
    UUIDType,
    Timestamptz,
    uuid_pk,
    uuid_fk,
    created_at_col,
    updated_at_col,
    deleted_at_col,
    created_by_col,
    updated_by_col,
    money_col,
    score_col,
    jsonb_col,
    string_col,
    text_col,
    boolean_col,
    integer_col,
)

__all__ = [
    # Base classes
    "Base",
    "PublicBaseModel",
    "PublicSoftDeleteModel",
    "TenantBaseModel",
    "TenantSoftDeleteModel",
    "ImmutableModel",
    # Mixins
    "UUIDMixin",
    "TimestampMixin",
    "AuditMixin",
    "SoftDeleteMixin",
    "TenantModelMixin",
    "PublicModelMixin",
    "TenantModelBase",
    "partial_index",
    "unique_partial_constraint",
    # Naming
    "NAMING_CONVENTION",
    "metadata",
    # Types
    "UUIDType",
    "Timestamptz",
    "uuid_pk",
    "uuid_fk",
    "created_at_col",
    "updated_at_col",
    "deleted_at_col",
    "created_by_col",
    "updated_by_col",
    "money_col",
    "score_col",
    "jsonb_col",
    "string_col",
    "text_col",
    "boolean_col",
    "integer_col",
]