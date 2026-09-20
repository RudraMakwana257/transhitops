import os
import uuid
import werkzeug.utils
from flask import current_app

class StorageService:
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    @staticmethod
    def get_upload_dir() -> str:
        upload_dir = current_app.config.get('UPLOAD_FOLDER', os.path.join(current_app.root_path, '..', 'uploads'))
        os.makedirs(upload_dir, exist_ok=True)
        return upload_dir

    @staticmethod
    def get_storage_backend() -> str:
        return os.environ.get('STORAGE_BACKEND', 'local').lower()

    @staticmethod
    def validate_file_content(file_obj, filename: str) -> bool:
        ext = os.path.splitext(filename)[1].lower()
        dangerous_exts = {'.exe', '.sh', '.php', '.py', '.js', '.bat', '.cmd', '.pl', '.elf', '.dll', '.so', '.cgi'}
        if ext in dangerous_exts:
            return False

        header = file_obj.read(512)
        file_obj.seek(0)

        # Executable binary header checks (ELF, MZ)
        if header.startswith(b'\x7fELF') or header.startswith(b'MZ'):
            return False

        if ext == '.png' and not header.startswith(b'\x89PNG\r\n\x1a\n'):
            return False
        if ext in ['.jpg', '.jpeg'] and not header.startswith(b'\xff\xd8\xff'):
            return False
        if ext == '.pdf' and not header.startswith(b'%PDF-'):
            return False
        if ext == '.docx' and not header.startswith(b'PK\x03\x04'):
            return False
        if ext == '.doc' and not (header.startswith(b'\xd0\xcf\x11\xe0') or header.startswith(b'PK\x03\x04')):
            return False
        if ext in ['.txt', '.csv'] and b'\x00' in header:
            return False

        return True

    @staticmethod
    def upload_file(file_obj, original_filename: str, folder: str = 'attachments') -> dict:
        """
        Saves file to secure storage abstraction (Local directory or S3/R2 object storage).
        Returns dict containing file_key, filename, mime_type, file_size, storage_backend.
        """
        secure_name = werkzeug.utils.secure_filename(original_filename) or 'unnamed_file'
        ext = os.path.splitext(secure_name)[1].lower()

        if not StorageService.validate_file_content(file_obj, secure_name):
            raise ValueError("File content does not match allowed MIME type or contains unsafe binary executable data.")

        file_uuid = uuid.uuid4().hex
        stored_filename = f"{file_uuid}{ext}"
        safe_folder = werkzeug.utils.secure_filename(folder) or 'attachments'
        relative_key = os.path.join(safe_folder, stored_filename)

        backend = StorageService.get_storage_backend()
        
        # Check if S3 / Cloudflare R2 / MinIO is configured
        if backend == 's3':
            try:
                import boto3
                s3_bucket = os.environ.get('S3_BUCKET', 'transitops-attachments')
                s3_endpoint = os.environ.get('S3_ENDPOINT_URL')
                s3_kwargs = {}
                if s3_endpoint:
                    s3_kwargs['endpoint_url'] = s3_endpoint
                s3_client = boto3.client('s3', **s3_kwargs)
                
                content = file_obj.read()
                file_size = len(content)
                if file_size > StorageService.MAX_FILE_SIZE:
                    raise ValueError(f"File size ({file_size} bytes) exceeds maximum permitted limit (10MB).")
                
                s3_client.put_object(
                    Bucket=s3_bucket,
                    Key=relative_key,
                    Body=content,
                    ContentType=getattr(file_obj, 'mimetype', 'application/octet-stream')
                )
                
                return {
                    "file_key": relative_key,
                    "filename": secure_name,
                    "mime_type": getattr(file_obj, 'mimetype', 'application/octet-stream'),
                    "file_size": file_size,
                    "storage_backend": "s3"
                }
            except ImportError:
                pass # Fallback to local storage if boto3 is not present in local test venv

        # Local storage implementation
        target_folder = os.path.join(StorageService.get_upload_dir(), safe_folder)
        os.makedirs(target_folder, exist_ok=True)
        
        full_path = os.path.join(target_folder, stored_filename)
        file_obj.save(full_path)
        file_size = os.path.getsize(full_path)

        if file_size > StorageService.MAX_FILE_SIZE:
            os.remove(full_path)
            raise ValueError(f"File size ({file_size} bytes) exceeds maximum permitted limit (10MB).")

        return {
            "file_key": relative_key,
            "filename": secure_name,
            "mime_type": getattr(file_obj, 'mimetype', 'application/octet-stream'),
            "file_size": file_size,
            "storage_backend": "local"
        }

    @staticmethod
    def get_file_path(file_key: str) -> str | None:
        """Returns safe absolute path to local file, strictly preventing path traversal attacks."""
        if not file_key or '..' in file_key:
            return None
        base_dir = os.path.abspath(StorageService.get_upload_dir())
        full_path = os.path.abspath(os.path.join(base_dir, file_key))
        if os.path.commonpath([base_dir, full_path]) != base_dir:
            return None
        if not os.path.exists(full_path):
            return None
        return full_path

    @staticmethod
    def delete_file(file_key: str) -> bool:
        if not file_key or '..' in file_key:
            return False
            
        backend = StorageService.get_storage_backend()
        if backend == 's3':
            try:
                import boto3
                s3_bucket = os.environ.get('S3_BUCKET', 'transitops-attachments')
                s3_endpoint = os.environ.get('S3_ENDPOINT_URL')
                s3_kwargs = {}
                if s3_endpoint:
                    s3_kwargs['endpoint_url'] = s3_endpoint
                s3_client = boto3.client('s3', **s3_kwargs)
                s3_client.delete_object(Bucket=s3_bucket, Key=file_key)
                return True
            except Exception:
                pass
                
        full_path = StorageService.get_file_path(file_key)
        if full_path and os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False
