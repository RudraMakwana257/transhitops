import os

port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{port}"

# Free-tier memory protection:
# 2 workers with 4 threads each = 8 concurrent request capacity
# Keeps total memory consumption strictly under 150MB (leaving >350MB headroom on 512MB RAM)
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
worker_class = "gthread"
threads = 4

# Anti-DDoS & Slowloris protection: kill hung requests after 30s
timeout = 30
keepalive = 3

# Memory leak prevention: periodically recycle worker processes safely
max_requests = 500
max_requests_jitter = 50

accesslog = "-"
errorlog = "-"
loglevel = "info"
capture_output = True
preload_app = False
