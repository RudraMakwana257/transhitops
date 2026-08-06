"""
server/app/utils/response.py — Standardized Flask API Response Helpers

Ensures all Flask route blueprints return consistent JSON schema:
{
    "success": bool,
    "data": dict | list | primitive | null,
    "message": str | null,
    "error": str | null
}
"""

from flask import jsonify

def standard_response(success=True, data=None, message=None, error=None, status_code=200):
    return jsonify({
        "success": bool(success),
        "data": data,
        "message": message,
        "error": error
    }), status_code

def success_response(data=None, message=None, status_code=200):
    return standard_response(
        success=True,
        data=data,
        message=message,
        error=None,
        status_code=status_code
    )

def error_response(message=None, error=None, status_code=400, data=None):
    err_msg = error or message or "An error occurred"
    msg = message or error
    return standard_response(
        success=False,
        data=data,
        message=msg,
        error=err_msg,
        status_code=status_code
    )
