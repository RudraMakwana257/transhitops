import os
import stat
import pytest

def test_backup_scripts_exist_and_executable():
    """Verify backup and restore scripts exist and have execute permissions."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    backup_script = os.path.join(repo_root, 'scripts', 'backup_postgres.sh')
    restore_script = os.path.join(repo_root, 'scripts', 'restore_verify.sh')

    assert os.path.exists(backup_script), "backup_postgres.sh does not exist"
    assert os.path.exists(restore_script), "restore_verify.sh does not exist"

    b_st = os.stat(backup_script)
    r_st = os.stat(restore_script)
    assert bool(b_st.st_mode & stat.S_IXUSR), "backup_postgres.sh is not executable"
    assert bool(r_st.st_mode & stat.S_IXUSR), "restore_verify.sh is not executable"

def test_health_check_endpoint(client):
    """Test /api/health endpoint returns 200 OK with database readiness status."""
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.json
    assert data['status'] == 'ok'
    assert 'database' in data
