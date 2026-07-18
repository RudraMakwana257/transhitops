import os
import re

def fix_file(path, replacements):
    with open(path, "r") as f:
        content = f.read()
    for search, replace in replacements:
        content = re.sub(search, replace, content)
    with open(path, "w") as f:
        f.write(content)

# Fix types.ts
types_path = "src/types/index.ts"
if not os.path.exists(types_path): types_path = "src/types.ts"
if os.path.exists(types_path):
    fix_file(types_path, [
        (r"export type UserRole = 'fleet_manager' \| 'dispatcher' \| 'safety_officer' \| 'financial_analyst'",
         "export type UserRole = 'fleet_manager' | 'dispatcher' | 'safety_officer' | 'financial_analyst' | 'super_admin'")
    ])

# src/api/index.ts
fix_file("src/api/index.ts", [
    (r"import \{ (.*?)InternalAxiosRequestConfig(.*?) \} from 'axios'", r"import type { \1InternalAxiosRequestConfig\2 } from 'axios'"),
    (r"import axios, \{ AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError \} from 'axios'", r"import axios, { AxiosInstance, AxiosError } from 'axios';\nimport type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'")
])

# src/components/dashboard/FleetStatusChart.tsx
fix_file("src/components/dashboard/FleetStatusChart.tsx", [
    (r"import \{ CHART_COLORS \} from '\.\./\.\./utils/constants'", ""),
    (r"const CHART_COLORS = \[.*?\];", ""),
    (r"export function FleetStatusChart", "export function FleetStatusChart") # Just touching
])

# src/components/dashboard/KPICard.tsx
fix_file("src/components/dashboard/KPICard.tsx", [
    (r"import \{ ReactNode \} from 'react'", r"import type { ReactNode } from 'react'"),
    (r"import \{ TrendingUp, TrendingDown \} from 'lucide-react'", "")
])

# src/components/dashboard/LicenseExpiryAlerts.tsx
fix_file("src/components/dashboard/LicenseExpiryAlerts.tsx", [
    (r"import \{ Badge \} from '\.\./ui/Badge'", ""),
    (r"import \{ AlertTriangle, Clock \} from 'lucide-react'", ""),
    (r"import \{ format, addDays \} from 'date-fns'", "")
])

# src/components/layout/ProtectedRoute.tsx
fix_file("src/components/layout/ProtectedRoute.tsx", [
    (r"import \{ ReactNode \} from 'react'", r"import type { ReactNode } from 'react'"),
    (r"import \{ useAuth \} from '\.\./hooks/useAuth'", r"import { useAuth } from '../../hooks/useAuth'")
])

# src/components/trip/CompleteTripModal.tsx
fix_file("src/components/trip/CompleteTripModal.tsx", [
    (r"import \{ useState, FormEvent \} from 'react'", r"import { useState } from 'react';\nimport type { FormEvent } from 'react'")
])

# src/components/trip/ConfirmModal.tsx
fix_file("src/components/trip/ConfirmModal.tsx", [
    (r"import \{ ReactNode \} from 'react'", r"import type { ReactNode } from 'react'")
])

# src/components/trip/DriverInfoCard.tsx
fix_file("src/components/trip/DriverInfoCard.tsx", [
    (r"import \{ StatusBadge \} from '\.\./ui/Badge'", ""),
    (r"import \{ Shield, Calendar, IdCard \} from 'lucide-react'", "")
])

# src/components/trip/TimelineItem.tsx
fix_file("src/components/trip/TimelineItem.tsx", [
    (r"import \{ ReactNode \} from 'react'", r"import type { ReactNode } from 'react'")
])

# src/components/trip/VehicleInfoCard.tsx
fix_file("src/components/trip/VehicleInfoCard.tsx", [
    (r"import \{ StatusBadge \} from '\.\./ui/Badge'", ""),
    (r"import \{ Truck, MapPin, Settings, Clock, DollarSign \} from 'lucide-react'", "")
])

# src/components/ui/Badge.tsx
fix_file("src/components/ui/Badge.tsx", [
    (r"type = 'vehicle',", "")
])

# src/components/ui/Button.tsx
fix_file("src/components/ui/Button.tsx", [
    (r"import \{ ButtonHTMLAttributes, forwardRef \} from 'react'", r"import { forwardRef } from 'react';\nimport type { ButtonHTMLAttributes } from 'react'"),
    (r"import \{ Loader2 \} from 'lucide-react'", "")
])

# src/components/ui/Card.tsx
fix_file("src/components/ui/Card.tsx", [
    (r"import \{ ReactNode \} from 'react'", r"import type { ReactNode } from 'react'")
])

# src/components/ui/DataTable.tsx
fix_file("src/components/ui/DataTable.tsx", [
    (r"import \{ ReactNode, useMemo, useState \} from 'react'", r"import { useMemo, useState } from 'react';\nimport type { ReactNode } from 'react'")
])

# src/components/ui/EmptyState.tsx
fix_file("src/components/ui/EmptyState.tsx", [
    (r"import \{ ReactNode \} from 'react'", r"import type { ReactNode } from 'react'")
])

print("Fixed basic TS errors.")
