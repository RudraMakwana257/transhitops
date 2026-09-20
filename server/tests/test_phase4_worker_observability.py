import pytest
import io
import uuid
from app.models.file_metadata import FileMetadata

def test_prometheus_metrics_endpoint(client):
    """Test /metrics endpoint returns 200 OK with Prometheus formatted metrics."""
    res = client.get('/metrics')
    assert res.status_code == 200
    assert 'transitops_up' in res.text
    assert 'transitops_db_up' in res.text

def test_file_upload_executable_rejection(client, company_a_token):
    """Test file upload rejects executable extensions and ELF binary headers."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    
    # Executable extension
    exe_data = (io.BytesIO(b'echo "script"'), 'malicious.sh')
    res = client.post('/api/attachments/upload', data={'file': exe_data}, headers=headers)
    assert res.status_code == 400

    # Binary ELF header disguised as .png
    elf_data = (io.BytesIO(b'\x7fELF\x02\x01\x01\x00binary_content'), 'fake.png')
    res_elf = client.post('/api/attachments/upload', data={'file': elf_data}, headers=headers)
    assert res_elf.status_code == 400

def test_file_upload_valid_pdf(client, company_a_token):
    """Test valid PDF file upload with correct magic bytes."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    pdf_content = b'%PDF-1.4 sample pdf content for testing'
    pdf_data = (io.BytesIO(pdf_content), 'valid_doc.pdf')

    res = client.post('/api/attachments/upload', data={'file': pdf_data, 'entity_type': 'trip', 'entity_id': 'trip-123'}, headers=headers)
    assert res.status_code == 201
    assert res.json['data']['filename'] == 'valid_doc.pdf'
