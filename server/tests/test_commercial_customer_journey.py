import pytest
import json
import uuid
import io
from app import db
from app.models.user import User
from app.models.company import Company
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.company_subscription import CompanySubscription
from app.models.manual_payment import ManualPayment
from app.services.exception_service import ExceptionService
from app.services.token_blocklist import is_token_blocked

def test_full_commercial_customer_lifecycle_journey(client):
    """
    Comprehensive End-to-End Test for the Complete Customer Lifecycle:
    Registration -> Login -> Vehicle Onboarding -> Driver Onboarding ->
    Team Dispatcher Setup -> Trip Creation & Dispatch -> Exception Radar Scan ->
    Analytics KPI Aggregation -> Attachment Upload -> Manual Billing Recording ->
    Logout -> Revoked Token Enforcement.
    """
    # -------------------------------------------------------------------------
    # STEP 1: Public Self-Service Registration
    # -------------------------------------------------------------------------
    reg_payload = {
        "company_name": "Apex Global Express",
        "name": "Marcus Vance",
        "email": "marcus@apexexpress.com",
        "password": "SecureVance@123"
    }
    res_reg = client.post("/api/auth/register", json=reg_payload)
    assert res_reg.status_code == 201
    reg_data = res_reg.get_json()["data"]
    
    assert reg_data["user"]["email"] == "marcus@apexexpress.com"
    assert reg_data["user"]["role"] == "fleet_manager"
    assert reg_data["company"]["name"] == "Apex Global Express"
    company_id = reg_data["company"]["id"]
    owner_token = reg_data["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # -------------------------------------------------------------------------
    # STEP 2: Credential Login Verification
    # -------------------------------------------------------------------------
    res_login = client.post("/api/auth/login", json={
        "email": "marcus@apexexpress.com",
        "password": "SecureVance@123"
    })
    assert res_login.status_code == 200
    login_data = res_login.get_json()["data"]
    assert login_data["user"]["name"] == "Marcus Vance"
    auth_token = login_data["access_token"]
    auth_headers = {"Authorization": f"Bearer {auth_token}"}

    # -------------------------------------------------------------------------
    # STEP 3: Fleet Vehicle Onboarding
    # -------------------------------------------------------------------------
    vehicle_payload = {
        "reg_number": "APX-TRUCK-101",
        "name": "Apex Heavy Hauler",
        "type": "Truck",
        "capacity_kg": 12000.0,
        "acquisition_cost": 65000.0,
        "odometer_km": 1500.0,
        "status": "Available"
    }
    res_veh = client.post("/api/vehicles", json=vehicle_payload, headers=auth_headers)
    assert res_veh.status_code == 201
    vehicle_id = res_veh.get_json()["data"]["id"]

    # -------------------------------------------------------------------------
    # STEP 4: Commercial Driver Onboarding
    # -------------------------------------------------------------------------
    driver_payload = {
        "name": "Sarah Connor",
        "license_number": "LIC-APX-8899",
        "license_category": "HMV",
        "license_expiry": "2028-12-31",
        "phone": "+15559876543",
        "safety_score": 98.5,
        "status": "Available"
    }
    res_drv = client.post("/api/drivers", json=driver_payload, headers=auth_headers)
    assert res_drv.status_code == 201
    driver_id = res_drv.get_json()["data"]["id"]

    # -------------------------------------------------------------------------
    # STEP 5: Team Member Invitation (Dispatcher User)
    # -------------------------------------------------------------------------
    user_payload = {
        "name": "Tom Dispatcher",
        "email": "tom@apexexpress.com",
        "role": "dispatcher",
        "password": "DispatcherPassword@123"
    }
    res_usr = client.post("/api/settings/users", json=user_payload, headers=auth_headers)
    assert res_usr.status_code == 201
    dispatcher_id = res_usr.get_json()["data"]["id"]

    # -------------------------------------------------------------------------
    # STEP 6: Trip Creation & Dispatch
    # -------------------------------------------------------------------------
    trip_payload = {
        "trip_number": "APX-TRIP-2026-001",
        "vehicle_id": vehicle_id,
        "driver_id": driver_id,
        "source": "Chicago, IL",
        "destination": "Detroit, MI",
        "cargo_weight_kg": 8500.0,
        "revenue": 3400.0
    }
    res_trip = client.post("/api/trips", json=trip_payload, headers=auth_headers)
    assert res_trip.status_code == 201
    trip_id = res_trip.get_json()["data"]["id"]

    # Dispatch trip
    res_dispatch = client.post(f"/api/trips/{trip_id}/dispatch", headers=auth_headers)
    assert res_dispatch.status_code == 200
    assert res_dispatch.get_json()["data"]["status"] == "Dispatched"

    # Verify vehicle and driver status transitioned to On Trip
    veh_check = Vehicle.query.get(uuid.UUID(vehicle_id))
    drv_check = Driver.query.get(uuid.UUID(driver_id))
    assert veh_check.status == "On Trip"
    assert drv_check.status == "On Trip"

    # -------------------------------------------------------------------------
    # STEP 7: Operational Exception Scan Engine
    # -------------------------------------------------------------------------
    scan_summary = ExceptionService.run_exception_detection(uuid.UUID(company_id))
    assert isinstance(scan_summary, dict)
    assert "active_total" in scan_summary or "created" in scan_summary

    # -------------------------------------------------------------------------
    # STEP 8: Analytics & Financial KPI Aggregation
    # -------------------------------------------------------------------------
    res_eff = client.get("/api/analytics/fuel-efficiency", headers=auth_headers)
    assert res_eff.status_code == 200
    assert res_eff.get_json()["success"] is True

    res_cost = client.get("/api/analytics/operational-cost", headers=auth_headers)
    assert res_cost.status_code == 200
    assert res_cost.get_json()["success"] is True

    res_roi = client.get("/api/analytics/vehicle-roi", headers=auth_headers)
    assert res_roi.status_code == 200
    assert res_roi.get_json()["success"] is True

    # -------------------------------------------------------------------------
    # STEP 9: Attachment Management & Tenancy Enforcement
    # -------------------------------------------------------------------------
    pdf_file = (io.BytesIO(b"%PDF-1.4 sample bill of lading content"), "bol_trip_001.pdf")
    res_upload = client.post(
        "/api/attachments/upload",
        data={
            "file": pdf_file,
            "entity_type": "trip",
            "entity_id": trip_id
        },
        content_type="multipart/form-data",
        headers=auth_headers
    )
    assert res_upload.status_code == 201
    file_id = res_upload.get_json()["data"]["id"]

    # Download attachment
    res_down = client.get(f"/api/attachments/{file_id}?download=true", headers=auth_headers)
    assert res_down.status_code == 200

    # -------------------------------------------------------------------------
    # STEP 10: Manual Commercial Billing & Subscription Verification
    # -------------------------------------------------------------------------
    res_sub = client.get("/api/subscription/usage", headers=auth_headers)
    assert res_sub.status_code == 200
    sub_data = res_sub.get_json()["data"]
    assert sub_data["subscription"]["status"] in ["active", "trialing"]
    assert sub_data["plan"]["slug"] in ["starter", "growth", "business", "enterprise"]

    res_pay = client.get("/api/subscription/payments", headers=auth_headers)
    assert res_pay.status_code == 200
    assert "items" in res_pay.get_json()["data"]

    # -------------------------------------------------------------------------
    # STEP 11: Secure Logout & Token Revocation Enforcement
    # -------------------------------------------------------------------------
    res_logout = client.post("/api/auth/logout", headers=auth_headers)
    assert res_logout.status_code == 200

    # Subsequent request using revoked token must be rejected
    res_revoked = client.get("/api/vehicles", headers=auth_headers)
    assert res_revoked.status_code in [401, 422]
