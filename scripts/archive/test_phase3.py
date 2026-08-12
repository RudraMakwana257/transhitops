import requests
import json
import uuid
import sys
import time

BASE_URL = "http://localhost:5000/api"

def print_result(test_num, passed, message=""):
    if passed:
        print(f"✅ Test {test_num} — PASS")
    else:
        print(f"❌ Test {test_num} — FAIL: {message}")
        sys.exit(1)

def run_tests():
    # TEST 1: AUTH LIMIT (6 requests)
    for _ in range(5):
        requests.post(f"{BASE_URL}/auth/login", json={"email": "wrong@test.com", "password": "x"}, headers={"X-Forwarded-For": "1.1.1.1"})
    
    r1 = requests.post(f"{BASE_URL}/auth/login", json={"email": "wrong@test.com", "password": "x"}, headers={"X-Forwarded-For": "1.1.1.1"})
    
    if r1.status_code == 429:
        data = r1.json()
        if data.get("error") == "RATE_LIMITED" and "retry_after" in data:
            print_result(1, True)
        else:
            print_result(1, False, f"Missing retry_after or wrong error: {data}")
    else:
        print_result(1, False, f"Expected 429, got {r1.status_code}")

    # TEST 2: GENERAL LIMIT (101 requests)
    for i in range(100):
        requests.get(f"{BASE_URL}/vehicles", headers={"X-Forwarded-For": "2.2.2.2"})
    
    r2 = requests.get(f"{BASE_URL}/vehicles", headers={"X-Forwarded-For": "2.2.2.2"})
    if r2.status_code == 429:
        print_result(2, True)
    else:
        print_result(2, False, f"Expected 429, got {r2.status_code}")
        
    # TEST 3: ADMIN LIMIT (201 requests)
    for i in range(200):
        requests.post(f"{BASE_URL}/admin/companies", json={}, headers={"X-Forwarded-For": "3.3.3.3"})
        
    r3 = requests.post(f"{BASE_URL}/admin/companies", json={}, headers={"X-Forwarded-For": "3.3.3.3"})
    if r3.status_code == 429:
        print_result(3, True)
    else:
        print_result(3, False, f"Expected 429, got {r3.status_code}")

    # TEST 4: Security Headers
    r4 = requests.get(f"{BASE_URL}/health", headers={"X-Forwarded-For": "4.4.4.4"})
    headers = r4.headers
    missing = []
    if headers.get('X-Frame-Options') != 'SAMEORIGIN': missing.append('X-Frame-Options')
    if headers.get('X-Content-Type-Options') != 'nosniff': missing.append('X-Content-Type-Options')
    if headers.get('X-XSS-Protection') != '1; mode=block': missing.append('X-XSS-Protection')
    if headers.get('Referrer-Policy') != 'strict-origin-when-cross-origin': missing.append('Referrer-Policy')
    if headers.get('Permissions-Policy') != 'geolocation=(), microphone=(), camera=()': missing.append('Permissions-Policy')
    if 'X-Request-ID' not in headers: missing.append('X-Request-ID')
    
    if missing:
        print_result(4, False, f"Missing or wrong headers: {missing}. Got: {headers}")
    else:
        print_result(4, True)

    # TEST 8: 404
    r8 = requests.get(f"{BASE_URL}/nonexistent-route", headers={"X-Forwarded-For": "8.8.8.8"})
    if r8.status_code == 404:
        try:
            data = r8.json()
            if data.get("error") == "NOT_FOUND":
                print_result(8, True)
            else:
                print_result(8, False, f"Wrong 404 body: {data}")
        except:
            print_result(8, False, "404 returned HTML/non-JSON")
    else:
        print_result(8, False, f"Expected 404, got {r8.status_code}")

    # TEST 9: 400 Bad Request
    r9 = requests.post(f"{BASE_URL}/auth/login", data="{{invalid", headers={"Content-Type": "application/json", "X-Forwarded-For": "9.9.9.9"})
    if r9.status_code == 400:
        data = r9.json()
        if data.get("error") == "BAD_REQUEST":
            print_result(9, True)
        else:
            print_result(9, False, f"Wrong 400 body: {data}")
    else:
        print_result(9, False, f"Expected 400, got {r9.status_code} {r9.text}")

    # TEST 10: 422 Validation
    # To get 422, we must hit a route that uses Marshmallow.
    # auth/login doesn't use marshmallow. vehicles does.
    # But vehicles requires auth. So we must get a token first.
    # TEST 10: 422 Validation
    admin = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@transitops.com", "password": "Admin123!"}, headers={"X-Forwarded-For": "10.10.10.10"})
    if admin.status_code == 200:
        token = admin.json()["data"]["access_token"]
        r10 = requests.post(f"{BASE_URL}/admin/companies", json={}, headers={"Authorization": f"Bearer {token}", "X-Forwarded-For": "10.10.10.10"})
        if r10.status_code == 422:
            data = r10.json()
            if data.get("error") == "VALIDATION_ERROR" and "errors" in data and "name" in data["errors"]:
                print_result(10, True)
            else:
                print_result(10, False, f"Wrong 422 body: {data}")
        else:
            print_result(10, False, f"Expected 422, got {r10.status_code}")
    else:
        print_result(10, False, f"Failed to login to test 422. status {admin.status_code}")

if __name__ == "__main__":
    run_tests()
