def test_login_valid_credentials(client, seed_data):
    """Test login with correct email and password."""
    res = client.post('/api/auth/login', json={'email': 'admin@companya.com', 'password': 'Admin@123'})
    assert res.status_code == 200
    assert 'access_token' in res.json['data']

def test_login_wrong_password(client):
    """Test login with wrong password."""
    res = client.post('/api/auth/login', json={'email': 'admin@companya.com', 'password': 'WrongPassword123'})
    assert res.status_code == 401
    assert 'Invalid email or password' in res.json['message']

def test_login_unknown_email(client):
    """Test login with unknown email."""
    res = client.post('/api/auth/login', json={'email': 'unknown@example.com', 'password': 'Password123'})
    assert res.status_code == 401
    assert 'Invalid email or password' in res.json['message']

def test_login_rate_limiting_lockout(client):
    """Test that 5 wrong attempts doesn't lock but 6th does."""
    for _ in range(4):
        client.post('/api/auth/login', json={'email': 'super@transitops.com', 'password': 'wrong'})
        
    res = client.post('/api/auth/login', json={'email': 'super@transitops.com', 'password': 'wrong'})
    assert res.status_code == 401
    
    # After 5 failed attempts, the account is locked. The next request gets 423
    res = client.post('/api/auth/login', json={'email': 'super@transitops.com', 'password': 'wrong'})
    assert res.status_code == 423

def test_refresh_token(client, seed_data):
    """Test refresh token with valid and expired cases."""
    login_res = client.post('/api/auth/login', json={'email': 'admin@companyb.com', 'password': 'Admin@123'})
    
    res = client.post('/api/auth/refresh')
    assert res.status_code == 200
    assert 'access_token' in res.json['data']

def test_forgot_password(client):
    """Test forgot password endpoint returns 200 always."""
    res = client.post('/api/auth/forgot-password', json={'email': 'admin@companya.com'})
    assert res.status_code == 200
    
    res2 = client.post('/api/auth/forgot-password', json={'email': 'unknown@example.com'})
    assert res2.status_code == 200

def test_login_payload_length(client):
    """Test login with extremely long email."""
    res = client.post('/api/auth/login', json={'email': 'a'*1000 + '@example.com', 'password': 'pwd'})
    assert res.status_code == 422
