import os
import re

ROUTES_DIR = '/home/zayron/Main/Hackathon/transitops/server/app/routes'
SERVICES_DIR = '/home/zayron/Main/Hackathon/transitops/server/app/services'

FILES = {
    'vehicles.py': 'vehicles',
    'drivers.py': 'drivers',
    'trips.py': 'trips',
    'maintenance.py': 'maintenance',
    'fuel.py': 'fuel',
    'expenses.py': 'expenses',
    'dashboard.py': 'dashboard',
    'analytics.py': 'analytics'
}

for fname, feature in FILES.items():
    path = os.path.join(ROUTES_DIR, fname)
    with open(path, 'r') as f:
        content = f.read()

    # 1. Update imports for require_company and require_feature
    if 'require_company' not in content:
        content = re.sub(r'from app\.middleware import require_roles', 'from app.middleware import require_roles, require_company, require_feature', content)
    else:
        content = re.sub(r'from app\.middleware import require_roles, require_company', 'from app.middleware import require_roles, require_company, require_feature', content)

    # 2. Add decorators
    # Match @require_roles(...) and add @require_company and @require_feature
    # Wait, some might already have @require_company
    # Let's remove existing @require_company to avoid duplicates
    content = re.sub(r'\n@require_company\s+', '\n', content)
    
    # Add them back
    replacement = r"\1\n@require_company\n@require_feature('" + feature + r"')"
    content = re.sub(r'(@require_roles\([^)]+\))', replacement, content)

    # 3. Model creation: add company_id=g.company_id
    # e.g. Vehicle(name=data['name'] -> Vehicle(company_id=g.company_id, name=data['name']
    content = re.sub(r'(\b[A-Z][A-Za-z0-9]+\()(?!\s*company_id=)', r'\1company_id=g.company_id, ', content)

    # 4. filter_by and filter: add company_id=g.company_id
    content = re.sub(r'\.filter_by\((?!\s*company_id=)', r'.filter_by(company_id=g.company_id, ', content)
    
    # 5. get_or_404(id) -> filter_by(id=id, company_id=g.company_id).first_or_404()
    content = re.sub(r'\.query\.get_or_404\(([^)]+)\)', r'.query.filter_by(id=\1, company_id=g.company_id).first_or_404()', content)

    # 6. Add created_by=g.user_id if model has it (trips, maintenance_logs, expenses, trip_events)
    if fname in ['trips.py', 'maintenance.py', 'expenses.py']:
        content = re.sub(r'(company_id=g\.company_id, )', r'\1created_by=g.user.id, ', content) # Note: g.user.id, not g.user_id

    with open(path, 'w') as f:
        f.write(content)

