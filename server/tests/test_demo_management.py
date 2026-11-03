import pytest
from app.models.company import Company
from app.models.user import User
from app.models.vehicle import Vehicle


def test_admin_demo_overview(client, super_admin_token):
    """Verify super_admin can view demo environments and KPI counts."""
    res = client.get(
        '/api/admin/demo',
        headers={'Authorization': f'Bearer {super_admin_token}'}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'kpis' in data['data']
    assert 'environments' in data['data']


def test_admin_create_demo_sandbox_7_days(client, super_admin_token, app):
    """Verify super_admin can create a 7-day evaluation demo sandbox with dummy data."""
    payload = {
        'company_name': 'Hindustan Express Demo',
        'admin_name': 'Vikram Mehra',
        'admin_email': 'vikram@hindustanexpress.com',
        'password': 'CustomDemo@123',
        'duration_days': 7,
        'seed_dummy_data': True,
        'notes': '7-day test evaluation for prospect'
    }

    res = client.post(
        '/api/admin/demo',
        headers={'Authorization': f'Bearer {super_admin_token}'},
        json=payload
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    created_creds = data['data']['credentials']
    assert created_creds['email'] == 'vikram@hindustanexpress.com'
    assert created_creds['password'] == 'CustomDemo@123'
    assert created_creds['duration_days'] == 7

    company_id = data['data']['company']['id']
    with app.app_context():
        comp = Company.query.get(company_id)
        assert comp is not None
        assert comp.is_demo is True
        assert comp.trial_ends_at is not None
        
        # Verify dummy data was seeded
        vehicles_count = Vehicle.query.filter_by(company_id=comp.id).count()
        assert vehicles_count >= 5

    # Verify that the created demo user can actually log in
    login_res = client.post(
        '/api/auth/login',
        json={'email': 'vikram@hindustanexpress.com', 'password': 'CustomDemo@123'}
    )
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    assert login_data['success'] is True
    assert login_data['data']['user']['email'] == 'vikram@hindustanexpress.com'


def test_admin_extend_demo_sandbox(client, super_admin_token, app):
    """Verify super_admin can extend demo duration by +15 days."""
    payload = {
        'company_name': 'Hindustan Extend Demo',
        'admin_name': 'Extend Admin',
        'admin_email': 'extend@hindustanextend.com',
        'password': 'CustomDemo@123',
        'duration_days': 7,
        'seed_dummy_data': False
    }
    create_res = client.post(
        '/api/admin/demo',
        headers={'Authorization': f'Bearer {super_admin_token}'},
        json=payload
    )
    comp_id = create_res.get_json()['data']['company']['id']

    res = client.post(
        f'/api/admin/demo/{comp_id}/extend',
        headers={'Authorization': f'Bearer {super_admin_token}'},
        json={'days': 15}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['days_left'] >= 14


def test_admin_update_demo_user_password(client, super_admin_token, app):
    """Verify super_admin can update a demo user's password and login succeeds with new password."""
    payload = {
        'company_name': 'Hindustan Update Demo',
        'admin_name': 'Vikram Mehra',
        'admin_email': 'vikram.update@hindustanexpress.com',
        'password': 'CustomDemo@123',
        'duration_days': 7,
        'seed_dummy_data': False
    }
    client.post(
        '/api/admin/demo',
        headers={'Authorization': f'Bearer {super_admin_token}'},
        json=payload
    )

    with app.app_context():
        user = User.query.filter_by(email='vikram.update@hindustanexpress.com').first()
        assert user is not None
        user_id = str(user.id)

    new_pwd = 'UpdatedDemo@2026'
    res = client.put(
        f'/api/admin/demo/users/{user_id}/password',
        headers={'Authorization': f'Bearer {super_admin_token}'},
        json={'password': new_pwd}
    )
    assert res.status_code == 200
    assert res.get_json()['success'] is True

    # Check that logging in with old password fails
    old_login = client.post(
        '/api/auth/login',
        json={'email': 'vikram.update@hindustanexpress.com', 'password': 'CustomDemo@123'}
    )
    assert old_login.status_code == 401

    # Check that logging in with new password succeeds
    new_login = client.post(
        '/api/auth/login',
        json={'email': 'vikram.update@hindustanexpress.com', 'password': new_pwd}
    )
    assert new_login.status_code == 200


def test_admin_reset_dummy_data(client, super_admin_token, app):
    """Verify super_admin can reset dummy fleet telemetry for a demo company."""
    payload = {
        'company_name': 'Hindustan Reset Demo',
        'admin_name': 'Reset Admin',
        'admin_email': 'reset@hindustanreset.com',
        'password': 'CustomDemo@123',
        'duration_days': 7,
        'seed_dummy_data': True
    }
    create_res = client.post(
        '/api/admin/demo',
        headers={'Authorization': f'Bearer {super_admin_token}'},
        json=payload
    )
    assert create_res.status_code == 201, create_res.get_json()
    company_id = create_res.get_json()['data']['company']['id']

    res = client.post(
        f'/api/admin/demo/{company_id}/reset-data',
        headers={'Authorization': f'Bearer {super_admin_token}'}
    )
    assert res.status_code == 200
    assert res.get_json()['success'] is True

    with app.app_context():
        v_count = Vehicle.query.filter_by(company_id=company_id).count()
        assert v_count >= 5


def test_non_admin_cannot_access_demo_api(client, company_a_token):
    """Verify non-superadmin tenant users get 403 Forbidden."""
    res = client.get(
        '/api/admin/demo',
        headers={'Authorization': f'Bearer {company_a_token}'}
    )
    assert res.status_code == 403


def test_public_demo_accounts_endpoint(client):
    """Verify unauthenticated public endpoint returns demo showcase accounts."""
    res = client.get('/api/auth/demo-accounts')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert isinstance(data['data'], list)
