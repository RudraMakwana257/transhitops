import multiprocessing

workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
bind = "0.0.0.0:5000"
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 100
accesslog = "-"
errorlog = "-"
loglevel = "info"
capture_output = True
preload_app = True
