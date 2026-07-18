def test_tenant_isolation_vehicle(client, company_a_token, company_b_token, company_a_id):
    """Test that Company B cannot access Company A's vehicles."""
    res = client.post('/api/vehicles', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'reg_number': 'TEST-001', 'name': 'Truck A', 'type': 'Truck', 'capacity_kg': 1000, 'acquisition_cost': 50000
    })
    assert res.status_code == 201
    vehicle_id = res.json['data']['id']
    
    res2 = client.get(f'/api/vehicles/{vehicle_id}', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res2.status_code == 404
    
    res3 = client.put(f'/api/vehicles/{vehicle_id}', headers={'Authorization': f'Bearer {company_b_token}'}, json={'name': 'Hacked'})
    assert res3.status_code == 404
    
    res4 = client.delete(f'/api/vehicles/{vehicle_id}', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res4.status_code == 404

def test_tenant_isolation_driver(client, company_a_token, company_b_token):
    """Test that Company B cannot access Company A's drivers."""
    res = client.post('/api/drivers', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'name': 'Driver A', 'license_number': 'LIC-001', 'license_category': 'LMV', 'license_expiry': '2030-01-01', 'phone': '1234567890'
    })
    assert res.status_code == 201
    driver_id = res.json['data']['id']
    
    res2 = client.get(f'/api/drivers/{driver_id}', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res2.status_code == 404

def test_disabled_feature(client, company_a_token, company_a_id, app):
    """Test that accessing a disabled feature returns 403."""
    from app import db
    from app.models.company_feature import CompanyFeature
    
    with app.app_context():
        import uuid
        feat = CompanyFeature.query.filter_by(company_id=uuid.UUID(company_a_id), feature_key='vehicles').first()
        feat.is_enabled = False
        db.session.commit()
        
    res = client.get('/api/vehicles', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res.status_code == 403
    
    with app.app_context():
        import uuid
        feat = CompanyFeature.query.filter_by(company_id=uuid.UUID(company_a_id), feature_key='vehicles').first()
        feat.is_enabled = True
        db.session.commit()

def test_suspended_company(client, super_admin_token, app):
    """Test that a suspended company cannot access any routes."""
    # Create a new company
    res = client.post('/api/admin/companies', headers={'Authorization': f'Bearer {super_admin_token}'}, json={
        'name': 'Suspended Company Test', 'email': 'suspended@comp.com'
    })
    assert res.status_code == 201
    company_id = res.json['data']['id']
    
    # Create a user for it
    res = client.post(f'/api/admin/companies/{company_id}/users', headers={'Authorization': f'Bearer {super_admin_token}'}, json={
        'name': 'Suspended User', 'email': 'user@suspended.com'
    })
    assert res.status_code == 201
    temp_pwd = res.json['data']['temporary_password']
    
    # Login to get token
    res = client.post('/api/auth/login', json={'email': 'user@suspended.com', 'password': temp_pwd})
    assert res.status_code == 200
    token = res.json['data']['access_token']
    
    # Suspend it
    res = client.post(f'/api/admin/companies/{company_id}/suspend', headers={'Authorization': f'Bearer {super_admin_token}'})
    assert res.status_code == 200
    
    # Try to access
    res = client.get('/api/vehicles', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 403
