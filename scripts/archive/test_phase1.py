import requests
import os
import time
import sys

BASE_URL = "http://localhost:5000/api"

def print_result(num, passed, msg=""):
    if passed:
        print(f"✅ Test {num} — PASS")
    else:
        print(f"❌ Test {num} — FAIL: {msg}")

def run_tests():
    # Wait for API to be ready
    for _ in range(10):
        try:
            r = requests.get(f"{BASE_URL}/health")
            if r.status_code == 200:
                break
        except:
            pass
        time.sleep(1)

    print("Starting tests...")
    
    # Test 1: Lockout
    email = "admin@transitops.com"
    for i in range(4):
        requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "wrong"})
    
    r5 = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "wrong"})
    r6 = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "wrong"})
    
    if r5.status_code == 423 and r6.status_code == 423:
        print_result(1, True)
    else:
        print_result(1, False, f"5th code: {r5.status_code}, 6th code: {r6.status_code}")

    # Test 2: Correct login
    # Wait for lockout to expire? Wait, I locked out admin! 
    # Let's unlock admin directly in DB or use a different user to verify company_id.
    # We can use manager@transitops.com for normal user and admin@transitops.com for super_admin... wait, admin is locked for 30 mins!
    # We should reset lockout in DB before Test 2.
    res = os.system('docker compose exec -T postgres psql -U transitops_user -d transitops_db -c "UPDATE users SET failed_login_count=0, locked_until=NULL;"')

    r_admin = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@transitops.com", "password": "Admin123!"})
    r_manager = requests.post(f"{BASE_URL}/auth/login", json={"email": "manager@transitops.com", "password": "Admin@123"})
    
    if r_admin.status_code == 200 and r_manager.status_code == 200:
        d_admin = r_admin.json().get('data', {})
        d_manager = r_manager.json().get('data', {})
        if d_admin.get('access_token') and d_manager.get('user', {}).get('company_id') is not None and d_admin.get('user', {}).get('company_id') is None:
            print_result(2, True)
        else:
            print_result(2, False, "Missing tokens or company_id incorrect")
    else:
        print_result(2, False, f"Admin login: {r_admin.status_code}, Manager: {r_manager.status_code}")

    d_admin = r_admin.json().get('data', {})
    d_manager = r_manager.json().get('data', {})
    admin_token = d_admin.get('access_token')
    manager_token = d_manager.get('access_token')
    manager_refresh = d_manager.get('refresh_token')

    # Test 3: Refresh token
    r_refresh = requests.post(f"{BASE_URL}/auth/refresh", headers={"Authorization": f"Bearer {manager_refresh}"})
    if r_refresh.status_code == 200 and r_refresh.json().get('data', {}).get('access_token'):
        print_result(3, True)
    else:
        print_result(3, False, f"Refresh failed: {r_refresh.status_code}")

    # Test 4: GET /api/admin/companies WITHOUT super_admin
    r_admin_fail = requests.get(f"{BASE_URL}/admin/companies", headers={"Authorization": f"Bearer {manager_token}"})
    if r_admin_fail.status_code == 403:
        print_result(4, True)
    else:
        print_result(4, False, f"Expected 403, got {r_admin_fail.status_code}")

    # Test 5: GET /api/admin/companies WITH super_admin
    r_admin_pass = requests.get(f"{BASE_URL}/admin/companies", headers={"Authorization": f"Bearer {admin_token}"})
    if r_admin_pass.status_code == 200 and 'total' in r_admin_pass.json().get('data', {}):
        print_result(5, True)
    else:
        print_result(5, False, f"Failed or missing pagination: {r_admin_pass.text}")

    # Test 6: Create company
    import random
    rand_suffix = random.randint(1000, 9999)
    payload = {
        "name": f"Acme Logistics {rand_suffix}",
        "email": f"contact{rand_suffix}@acme.com",
        "plan_id": None,
        "is_active": True
    }
    r_create = requests.post(f"{BASE_URL}/admin/companies", headers={"Authorization": f"Bearer {admin_token}"}, json=payload)
    if r_create.status_code == 201:
        data = r_create.json().get('data', {})
        slug = data.get('slug')
        features = data.get('features', {})
        enabled = sum(1 for v in features.values() if v)
        disabled = sum(1 for v in features.values() if not v)
        if slug.startswith("acme-logistics") and enabled == 9 and disabled == 7:
            print_result(6, True)
        else:
            print_result(6, False, f"Slug: {slug}, Enabled: {enabled}, Disabled: {disabled}")
        company_id = data.get('id')
    else:
        print_result(6, False, f"Create failed: {r_create.text}")
        company_id = None

    # Test 7: Create company admin
    if company_id:
        rand_suffix_u = random.randint(1000, 9999)
        u_email = f"admin{rand_suffix_u}@acme.com"
        u_payload = {
            "name": "Acme Admin",
            "email": u_email,
            "role": "fleet_manager"
        }
        r_u_create = requests.post(f"{BASE_URL}/admin/companies/{company_id}/users", headers={"Authorization": f"Bearer {admin_token}"}, json=u_payload)
        if r_u_create.status_code == 201:
            data = r_u_create.json().get('data', {})
            temp_pass = data.get('temporary_password')
            if temp_pass:
                print_result(7, True)
                acme_pass = temp_pass
                acme_email = u_email
            else:
                print_result(7, False, "Missing temporary_password")
                acme_pass = None
                acme_email = None
        else:
            print_result(7, False, f"User create failed: {r_u_create.text}")
            acme_pass = None
            acme_email = None
    else:
        print_result(7, False, "Skipped due to test 6 failing")
        acme_pass = None
        acme_email = None

    # Test 8: Tenant isolation
    if company_id and acme_pass:
        r_acme_login = requests.post(f"{BASE_URL}/auth/login", json={"email": acme_email, "password": acme_pass})
        acme_token = r_acme_login.json().get('data', {}).get('access_token')
        
        r_veh = requests.get(f"{BASE_URL}/vehicles", headers={"Authorization": f"Bearer {acme_token}"})
        if r_veh.status_code == 200:
            items = r_veh.json().get('data', {}).get('items', [])
            if len(items) == 0:
                print_result(8, True)
            else:
                print_result(8, False, f"Vehicles found: {len(items)}, should be 0")
        else:
            print_result(8, False, f"Vehicles fetch failed: {r_veh.text}")
    else:
        print_result(8, False, "Skipped due to test 7 failing")

    # Test 9: Health
    r_health = requests.get(f"{BASE_URL}/health")
    if r_health.status_code == 200:
        data = r_health.json()
        if data.get('status') == 'ok' and data.get('database') == 'ok':
            print_result(9, True)
        else:
            print_result(9, False, f"Health data mismatch: {data}")
    else:
        print_result(9, False, f"Health failed: {r_health.status_code}")

    # Test 10: Ready
    r_ready = requests.get(f"{BASE_URL}/ready")
    if r_ready.status_code == 200:
        if r_ready.json().get('ready') == True:
            print_result(10, True)
        else:
            print_result(10, False, f"Ready mismatch: {r_ready.json()}")
    else:
        # Sometimes there's no /ready endpoint implemented. Let's see.
        print_result(10, False, f"Ready failed: {r_ready.status_code} {r_ready.text}")

if __name__ == "__main__":
    run_tests()
