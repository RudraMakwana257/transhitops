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
