import os
import multiprocessing

port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{port}"

# Worker configuration - optimized for free tier (512MB RAM)
# 2 workers * 4 threads = 8 concurrent requests
# preload_app=True enables copy-on-write memory sharing
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
worker_class = "gthread"
threads = 4

# Timeouts - strict to prevent slowloris & hung requests
timeout = 30
graceful_timeout = 10
keepalive = 2

# Memory leak prevention - recycle workers periodically
max_requests = 200
max_requests_jitter = 20

# Use /dev/shm (RAM disk) for worker heartbeat - faster, prevents disk I/O issues
worker_tmp_dir = "/dev/shm"

# Security: Limit request sizes to prevent resource exhaustion
limit_request_fields = 100
limit_request_field_size = 8190
limit_request_line = 4094

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
capture_output = True

# Preload app for memory efficiency (copy-on-write)
preload_app = True

# Worker lifecycle hooks for graceful shutdown
def on_starting(server):
    """Log when master process starts."""
    server.log.info("Gunicorn master starting")

def on_reload(server):
    """Log when master process reloads."""
    server.log.info("Gunicorn master reloading")

def worker_int(worker):
    """Log worker interruption."""
    worker.log.info("Worker received INT/SIGQUIT")

def pre_fork(server, worker):
    """Log before forking worker."""
    server.log.info(f"Spawning worker {worker.age}")

def post_fork(server, worker):
    """Log after forking worker."""
    server.log.info(f"Worker {worker.pid} spawned")

def post_worker_init(worker):
    """Log after worker initialization."""
    worker.log.info(f"Worker {worker.pid} initialized")

def worker_exit(server, worker):
    """Log worker exit."""
    server.log.info(f"Worker {worker.pid} exited")

def child_exit(server, worker):
    """Log child process exit."""
    server.log.info(f"Child {worker.pid} exited")