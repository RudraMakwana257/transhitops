def test_security_headers(client):
    """Test that all endpoints return security headers."""
    res = client.get('/api/health')
    assert 'X-Frame-Options' in res.headers
    assert 'X-Content-Type-Options' in res.headers
    assert 'X-Request-ID' in res.headers

def test_invalid_json(client):
    """Test POST with invalid JSON body."""
    res = client.post('/api/auth/login', data="invalid json", content_type='application/json')
    assert res.status_code == 400

def test_empty_json(client):
    """Test POST with empty body."""
    res = client.post('/api/auth/login', json={})
    assert res.status_code == 400

def test_nonexistent_route(client):
    """Test GET nonexistent route returns JSON."""
    res = client.get('/api/nonexistent')
    assert res.status_code == 404
    assert res.is_json
    assert res.json['error'] == 'NOT_FOUND'

def test_unauthenticated_request(client):
    """Test unauthenticated request to protected route."""
    res = client.get('/api/vehicles')
    assert res.status_code == 401

def test_malformed_jwt(client):
    """Test request with malformed JWT."""
    res = client.get('/api/vehicles', headers={'Authorization': 'Bearer invalid.token.here'})
    assert res.status_code == 401

def test_password_reset_token_hashing_and_validation(client, app):
    """Test password reset tokens are stored hashed and enforce password complexity."""
    from app.models.user import User
    from app.models.password_reset_token import PasswordResetToken
    import hashlib

    with app.app_context():
        u = User.query.filter_by(email='admin@companya.com').first()
        assert u is not None
        reset_token_obj, raw_token = PasswordResetToken.generate(u.id)
        from app import db
        db.session.add(reset_token_obj)
        db.session.commit()
        
        # Verify stored token is a SHA-256 hash (64 hex characters)
        assert len(reset_token_obj.token) == 64
        assert reset_token_obj.token == hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        assert reset_token_obj.token != raw_token

    # 1. Reset with password too short (< 8 chars)
    res_short = client.post('/api/auth/reset-password', json={
        'token': raw_token,
        'password': 'short'
    })
    assert res_short.status_code == 422

    # 2. Reset with valid password
    res_valid = client.post('/api/auth/reset-password', json={
        'token': raw_token,
        'password': 'NewSecurePassword123!'
    })
    assert res_valid.status_code == 200

    # 3. Token cannot be reused
    res_reuse = client.post('/api/auth/reset-password', json={
        'token': raw_token,
        'password': 'AnotherPassword123!'
    })
    assert res_reuse.status_code == 400

def test_prevent_super_admin_self_deletion(client, super_admin_token, seed_data):
    """Test super admin cannot delete their own account."""
    admin_id = seed_data['super_admin_id']
    res = client.delete(f'/api/admin/users/{admin_id}', headers={'Authorization': f'Bearer {super_admin_token}'})
    assert res.status_code == 400
    assert "Cannot delete your own super admin account" in res.json['message']

def test_prevent_manager_self_deactivation(client, company_a_token, seed_data):
    """Test fleet manager cannot deactivate their own user account."""
    manager_id = seed_data['admin_a_id']
    res = client.delete(f'/api/settings/users/{manager_id}', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res.status_code == 400
    assert "Cannot deactivate your own user account" in res.json['message']

def test_storage_path_traversal_prevention(app):
    """Test StorageService strictly rejects path traversal attempts."""
    from app.services.storage_service import StorageService
    assert StorageService.get_file_path("../../etc/passwd") is None
    assert StorageService.get_file_path("..\\..\\windows\\system32") is None
    assert StorageService.get_file_path("/etc/shadow") is None

def test_safe_vehicle_sorting_parameters(client, company_a_token):
    """Test passing invalid or internal attribute names to sort_by does not trigger 500 error."""
    res = client.get('/api/vehicles?sort_by=to_dict', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res.status_code == 200
    res2 = client.get('/api/vehicles?sort_by=metadata', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res2.status_code == 200

def test_financial_update_input_validation(client, company_a_token):
    """Test update_expense rejects negative amount inputs."""
    # Create valid expense first
    create_res = client.post('/api/expenses', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'type': 'Toll',
        'amount': 250.0,
        'date': '2026-08-01',
        'description': 'Bridge toll'
    })
    assert create_res.status_code == 201
    exp_id = create_res.json['data']['id']

    # Attempt to update with negative amount
    neg_res = client.put(f'/api/expenses/{exp_id}', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'amount': -150.0
    })
    assert neg_res.status_code == 400
    assert "greater than 0" in neg_res.json['message']
