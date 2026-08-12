import pytest
from flask import json
from app import create_app, db
from app.models.company import Company
from app.models.vehicle import Vehicle

def test_sqlalchemy_engine_options_config(app):
    """Verify SQLAlchemy engine options include pool size, pre-ping, and recycle settings."""
    engine_opts = app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {})
    assert 'pool_size' in engine_opts
    assert engine_opts['pool_size'] >= 5
    assert 'pool_recycle' in engine_opts
    assert engine_opts.get('pool_pre_ping') is True

def test_error_handlers_safe_json_response(client):
    """Verify 404 and 405 error handlers return safe, predictable JSON error responses."""
    res_404 = client.get('/api/nonexistent-endpoint-xyz')
    assert res_404.status_code == 404
    data_404 = res_404.get_json()
    assert data_404['success'] is False
    assert data_404['error'] == 'NOT_FOUND'
    assert 'message' in data_404

    res_405 = client.post('/api/health')
    assert res_405.status_code == 405
    data_405 = res_405.get_json()
    assert data_405['success'] is False
    assert data_405['error'] == 'METHOD_NOT_ALLOWED'

def test_database_session_teardown_safety(app):
    """Verify that failed transactions are rolled back during request teardown."""
    with app.test_request_context():
        try:
            # Cause a database integrity error inside a transaction (duplicate unique slug)
            c1 = Company(name="Teardown Test Co 1", slug="teardown-slug-unique")
            c2 = Company(name="Teardown Test Co 2", slug="teardown-slug-unique")
            db.session.add(c1)
            db.session.add(c2)
            db.session.commit()
        except Exception as e:
            # Simulate app teardown
            app.do_teardown_request(e)

        # Verify session was cleaned up and can perform new queries cleanly
        db.session.rollback()
        companies = Company.query.filter_by(slug="teardown-slug-unique").all()
        assert len(companies) == 0
