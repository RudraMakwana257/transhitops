import requests

BASE_URL = "http://127.0.0.1:5000/api"

def run_tests():
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@transitops.com", "password": "Admin123!"})
    token = r.json().get('data', {}).get('access_token')
    
    r_c = requests.post(f"{BASE_URL}/admin/companies", headers={"Authorization": f"Bearer {token}"}, json={"name": "Feature Test Co", "email": "features@test.com"})
    cid = r_c.json().get('data', {}).get('id')
    
    r_f = requests.put(f"{BASE_URL}/admin/companies/{cid}/features", headers={"Authorization": f"Bearer {token}"}, json={"features": {"ai_chat": False}})
    print("PUT features status:", r_f.status_code)
    
    r_g = requests.get(f"{BASE_URL}/admin/companies/{cid}/features", headers={"Authorization": f"Bearer {token}"})
    print("GET features:", r_g.json())

run_tests()
