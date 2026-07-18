import requests
import random
import os
import sys

BASE_URL = "http://127.0.0.1:5000/api"

def print_result(test_num, passed, message=""):
    if passed:
        print(f"✅ Test {test_num} — PASS")
    else:
        print(f"❌ Test {test_num} — FAIL: {message}")
        sys.exit(1)

def run_tests():
    # 0. Setup: Get super admin token
    r_admin = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@transitops.com", "password": "Admin123!"})
    if r_admin.status_code != 200:
        print("Failed to login as super admin")
        sys.exit(1)
    admin_token = r_admin.json().get('data', {}).get('access_token')
    
    auth_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create Company A
    r_ca = requests.post(f"{BASE_URL}/admin/companies", headers=auth_headers, json={"name": "Alpha Fleet", "email": f"alpha{random.randint(100,999)}@test.com"})
    alpha_id = r_ca.json().get('data', {}).get('id')
    
    r_ua = requests.post(f"{BASE_URL}/admin/companies/{alpha_id}/users", headers=auth_headers, json={"name": "Alpha Admin", "email": f"alpha{random.randint(100,999)}@test.com", "role": "fleet_manager"})
    if r_ua.status_code != 201:
        print(f"Failed to create Alpha User: {r_ua.text}")
        sys.exit(1)
    alpha_email = r_ua.json().get('data', {}).get('user', {}).get('email')
    alpha_pass = r_ua.json().get('data', {}).get('temporary_password')
    
    # Create Company B
    r_cb = requests.post(f"{BASE_URL}/admin/companies", headers=auth_headers, json={"name": "Beta Fleet", "email": f"beta{random.randint(100,999)}@test.com"})
    beta_id = r_cb.json().get('data', {}).get('id')
    
    r_ub = requests.post(f"{BASE_URL}/admin/companies/{beta_id}/users", headers=auth_headers, json={"name": "Beta Admin", "email": f"beta{random.randint(100,999)}@test.com", "role": "fleet_manager"})
    if r_ub.status_code != 201:
        print(f"Failed to create Beta User: {r_ub.text}")
        sys.exit(1)
    beta_email = r_ub.json().get('data', {}).get('user', {}).get('email')
    beta_pass = r_ub.json().get('data', {}).get('temporary_password')
    
    # Login Alpha
    r_al = requests.post(f"{BASE_URL}/auth/login", json={"email": alpha_email, "password": alpha_pass})
    if r_al.status_code != 200:
        print(f"Alpha login failed: {r_al.text}")
        sys.exit(1)
    alpha_token = r_al.json().get('data', {}).get('access_token')
    alpha_headers = {"Authorization": f"Bearer {alpha_token}"}
    
    # Login Beta
    r_bl = requests.post(f"{BASE_URL}/auth/login", json={"email": beta_email, "password": beta_pass})
    if r_bl.status_code != 200:
        print(f"Beta login failed: {r_bl.text}")
        sys.exit(1)
    beta_token = r_bl.json().get('data', {}).get('access_token')
    beta_headers = {"Authorization": f"Bearer {beta_token}"}
    
    try:
        # TEST 1: VEHICLES
        v_data = {
            "name": "Truck-001",
            "reg_number": f"MH-{random.randint(10,99)}-AB-{random.randint(1000,9999)}",
            "type": "Truck",
            "capacity_kg": 5000,
            "acquisition_cost": 1000000,
            "status": "Available"
        }
        r_v_create = requests.post(f"{BASE_URL}/vehicles", headers=alpha_headers, json=v_data)
        if r_v_create.status_code != 201:
            print(f"Alpha token used: {alpha_token}")
            print_result(1, False, f"Failed to create vehicle: {r_v_create.text}")
            
        alpha_vehicle_id = r_v_create.json().get('data', {}).get('id')
        
        r_v_get = requests.get(f"{BASE_URL}/vehicles", headers=beta_headers)
        items = r_v_get.json().get('data', {}).get('items', [])
        if len(items) == 0:
            print_result(1, True)
        else:
            print_result(1, False, f"Beta saw {len(items)} vehicles")
            
        # TEST 2: DRIVERS
        d_data = {
            "name": "John Driver",
            "license_number": f"DL-{random.randint(10000,99999)}"
        }
        r_d_create = requests.post(f"{BASE_URL}/drivers", headers=alpha_headers, json=d_data)
        alpha_driver_id = r_d_create.json().get('data', {}).get('id')
        
        r_d_get = requests.get(f"{BASE_URL}/drivers", headers=beta_headers)
        items = r_d_get.json().get('data', {}).get('items', [])
        if len(items) == 0:
            print_result(2, True)
        else:
            print_result(2, False, f"Beta saw {len(items)} drivers")
            
        # TEST 3: CROSS-TENANT EDIT
        r_edit = requests.put(f"{BASE_URL}/vehicles/{alpha_vehicle_id}", headers=beta_headers, json={"name": "Hacked"})
        if r_edit.status_code == 404:
            print_result(3, True)
        else:
            print_result(3, False, f"Expected 404, got {r_edit.status_code}: {r_edit.text}")
            
        # TEST 4: CROSS-TENANT DELETE
        r_del = requests.delete(f"{BASE_URL}/vehicles/{alpha_vehicle_id}", headers=beta_headers)
        if r_del.status_code == 404:
            print_result(4, True)
        else:
            print_result(4, False, f"Expected 404, got {r_del.status_code}: {r_del.text}")
            
        # TEST 5: TRIPS
        t_data = {
            "vehicle_id": alpha_vehicle_id,
            "driver_id": alpha_driver_id,
            "origin": "City A",
            "destination": "City B",
            "planned_start_time": "2026-08-01T10:00:00"
        }
        r_t_create = requests.post(f"{BASE_URL}/trips", headers=alpha_headers, json=t_data)
        
        r_t_get = requests.get(f"{BASE_URL}/trips", headers=beta_headers)
        items = r_t_get.json().get('data', {}).get('items', [])
        if len(items) == 0:
            print_result(5, True)
        else:
            print_result(5, False, f"Beta saw {len(items)} trips")
            
        # TEST 6: FEATURE FLAG ENFORCEMENT
        requests.put(f"{BASE_URL}/admin/companies/{beta_id}/features", headers=auth_headers, json={"features": {"fuel": False}})
        r_f_b = requests.get(f"{BASE_URL}/fuel", headers=beta_headers)
        r_f_a = requests.get(f"{BASE_URL}/fuel", headers=alpha_headers)
        
        if r_f_b.status_code == 403 and r_f_a.status_code == 200:
            print_result(6, True)
        else:
            print_result(6, False, f"Beta fuel: {r_f_b.status_code}, Alpha fuel: {r_f_a.status_code}")
            
        # TEST 7: DASHBOARD SCOPING
        r_dash = requests.get(f"{BASE_URL}/dashboard/stats", headers=alpha_headers)
        vehicles_count = r_dash.json().get('data', {}).get('vehicles', {}).get('total', 0)
        if vehicles_count == 1:
            print_result(7, True)
        else:
            print_result(7, False, f"Expected 1 vehicle in dash, got {vehicles_count}")
            
        # TEST 8: ANALYTICS SCOPING
        r_an = requests.get(f"{BASE_URL}/analytics/trips", headers=alpha_headers)
        if r_an.status_code == 200:
            print_result(8, True)
        else:
            print_result(8, False, f"Expected 200, got {r_an.status_code}: {r_an.text}")
            
        # TEST 9: MARSHMALLOW VALIDATION
        r_val1 = requests.post(f"{BASE_URL}/vehicles", headers=alpha_headers, json={})
        if r_val1.status_code == 422:
            pass
        else:
            print_result(9, False, f"Empty body returned {r_val1.status_code}")
            
        r_val2 = requests.post(f"{BASE_URL}/vehicles", headers=alpha_headers, json={
            "name": "Bad Year",
            "reg_number": f"MH-{random.randint(10,99)}-AB-{random.randint(1000,9999)}",
            "type": "Truck",
            "capacity_kg": 5000,
            "acquisition_cost": 1000000,
            "purchase_date": "1800-01-01"
        })
        if r_val2.status_code == 422 and "purchase_date" in r_val2.text.lower():
            print_result(9, True)
        else:
            print_result(9, False, f"Invalid year returned {r_val2.status_code}: {r_val2.text}")
            
        # TEST 10: SUSPENDED COMPANY
        requests.post(f"{BASE_URL}/admin/companies/{alpha_id}/suspend", headers=auth_headers)
        r_susp = requests.get(f"{BASE_URL}/vehicles", headers=alpha_headers)
        if r_susp.status_code == 403:
            pass
        else:
            print_result(10, False, f"Suspended company returned {r_susp.status_code}")
            
        requests.post(f"{BASE_URL}/admin/companies/{alpha_id}/activate", headers=auth_headers)
        r_act = requests.get(f"{BASE_URL}/vehicles", headers=alpha_headers)
        if r_act.status_code == 200:
            print_result(10, True)
        else:
            print_result(10, False, f"Re-activated company returned {r_act.status_code}")
            
    finally:
        # Cleanup
        requests.delete(f"{BASE_URL}/admin/companies/{alpha_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/admin/companies/{beta_id}", headers=auth_headers)
        
run_tests()
