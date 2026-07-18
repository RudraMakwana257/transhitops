def test_admin_permissions(client, company_a_token, super_admin_token):
    """Test admin endpoints access."""
    # Non-super_admin cannot access
    res = client.get('/api/admin/companies', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res.status_code == 403
    
    # super_admin can access
    res2 = client.get('/api/admin/companies', headers={'Authorization': f'Bearer {super_admin_token}'})
    assert res2.status_code == 200

def test_admin_company_creation(client, super_admin_token):
    """Test creating companies and duplicate emails."""
    res = client.post('/api/admin/companies', headers={'Authorization': f'Bearer {super_admin_token}'}, json={
        'name': 'New Company', 'email': 'new@company.com'
    })
    assert res.status_code == 201
    assert 'new-company' in res.json['data']['slug']
    
    # Duplicate email
    res2 = client.post('/api/admin/companies', headers={'Authorization': f'Bearer {super_admin_token}'}, json={
        'name': 'Other', 'email': 'new@company.com'
    })
    assert res2.status_code == 400

def test_admin_suspend_activate(client, super_admin_token, company_a_id):
    """Test suspending and activating companies."""
    res = client.post(f'/api/admin/companies/{company_a_id}/suspend', headers={'Authorization': f'Bearer {super_admin_token}'})
    assert res.status_code == 200
    
    res2 = client.post(f'/api/admin/companies/{company_a_id}/activate', headers={'Authorization': f'Bearer {super_admin_token}'})
    assert res2.status_code == 200

def test_admin_create_company_user(client, super_admin_token, company_a_id):
    """Test creating a company user via admin returns a temporary password."""
    res = client.post(f'/api/admin/companies/{company_a_id}/users', headers={'Authorization': f'Bearer {super_admin_token}'}, json={
        'name': 'Test User', 'email': 'test@companya.com'
    })
    assert res.status_code == 201
    assert 'temporary_password' in res.json['data']
