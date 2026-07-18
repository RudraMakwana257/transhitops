import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

def get_smtp_config():
    return {
        'host': os.environ.get('SMTP_HOST'),
        'port': int(os.environ.get('SMTP_PORT', 587)),
        'username': os.environ.get('SMTP_USERNAME'),
        'password': os.environ.get('SMTP_PASSWORD'),
        'use_tls': os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true',
        'from_email': os.environ.get('EMAIL_FROM', 'noreply@transitops.com'),
        'app_url': os.environ.get('APP_URL', 'http://localhost:5173')
    }

def send_email(to_email: str, subject: str, text_content: str, html_content: str = None) -> bool:
    config = get_smtp_config()
    
    if not config['host']:
        print(f"[EMAIL SIMULATION] To: {to_email}")
        print(f"[EMAIL SIMULATION] Subject: {subject}")
        print(f"[EMAIL SIMULATION] Body: {text_content}")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = config['from_email']
        msg['To'] = to_email

        msg.attach(MIMEText(text_content, 'plain'))
        if html_content:
            msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(config['host'], config['port'])
        if config['use_tls']:
            server.starttls()
        
        if config['username'] and config['password']:
            server.login(config['username'], config['password'])
            
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def send_password_reset_email(to_email: str, user_name: str, reset_token: str, expires_minutes: int = 60) -> bool:
    app_url = get_smtp_config()['app_url']
    subject = "Reset your TransitOps password"
    
    text_content = f"""Hi {user_name},
Click the link below to reset your password.
This link expires in {expires_minutes} minutes.
{app_url}/reset-password?token={reset_token}
If you didn't request this, ignore this email."""

    html_content = f"""
    <p>Hi {user_name},</p>
    <p>Click the link below to reset your password.</p>
    <p>This link expires in {expires_minutes} minutes.</p>
    <p><a href="{app_url}/reset-password?token={reset_token}">Reset Password</a></p>
    <p>If you didn't request this, ignore this email.</p>
    """
    
    return send_email(to_email, subject, text_content, html_content)

def send_welcome_email(to_email: str, user_name: str, company_name: str, temporary_password: str) -> bool:
    app_url = get_smtp_config()['app_url']
    subject = "Welcome to TransitOps"
    
    text_content = f"""Hi {user_name},
Your account has been created for {company_name}.
Email: {to_email}
Temporary Password: {temporary_password}
Login at: {app_url}/login
Please change your password after first login."""

    html_content = f"""
    <p>Hi {user_name},</p>
    <p>Your account has been created for {company_name}.</p>
    <p><strong>Email:</strong> {to_email}<br>
    <strong>Temporary Password:</strong> {temporary_password}</p>
    <p><a href="{app_url}/login">Login Here</a></p>
    <p>Please change your password after first login.</p>
    """
    
    return send_email(to_email, subject, text_content, html_content)
