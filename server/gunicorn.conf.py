import os
import multiprocessing

port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{port}"
workers = min(multiprocessing.cpu_count() * 2 + 1, 4)

timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 100
accesslog = "-"
errorlog = "-"
loglevel = "info"
capture_output = True
preload_app = False

