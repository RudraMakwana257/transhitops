import threading
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

_scheduler_thread = None
_stop_event = threading.Event()
_scan_lock = threading.Lock()

def _try_acquire_lock():
    import os
    redis_url = os.environ.get('REDIS_URL')
    if redis_url:
        try:
            import redis
            r = redis.from_url(redis_url)
            acquired = r.set("lock:scheduler:exception_scan", "locked", nx=True, ex=300)
            if acquired:
                return True, "redis", r
            return False, "redis", r
        except Exception:
            pass
    acquired = _scan_lock.acquire(blocking=False)
    return acquired, "thread", None

def _release_lock(lock_type, redis_client):
    if lock_type == "redis" and redis_client:
        try:
            redis_client.delete("lock:scheduler:exception_scan")
        except Exception:
            pass
    elif lock_type == "thread":
        try:
            _scan_lock.release()
        except Exception:
            pass

def _run_scheduled_exception_scans(app, interval_seconds=600):
    logger.info("Background Exception Scheduler started (interval: %d seconds)", interval_seconds)
    while not _stop_event.is_set():
        try:
            with app.app_context():
                from app.models.company import Company
                from app.services.exception_service import ExceptionService

                acquired, lock_type, r_client = _try_acquire_lock()
                if acquired:
                    try:
                        from app.services.manual_billing_service import ManualBillingService
                        expired_count = ManualBillingService.expire_outdated_subscriptions()
                        if expired_count > 0:
                            logger.info("Scheduler expired %d outdated subscriptions", expired_count)

                        active_companies = Company.query.filter_by(is_active=True).all()
                        for comp in active_companies:
                            try:
                                summary = ExceptionService.run_exception_detection(comp.id)
                                logger.debug("Scheduled exception scan for company %s: %s", comp.slug, summary)
                            except Exception as ce:
                                logger.error("Error running exception scan for company %s: %s", comp.slug, str(ce))
                    finally:
                        _release_lock(lock_type, r_client)
        except Exception as e:
            logger.error("Exception in background scheduler loop: %s", str(e))

        _stop_event.wait(timeout=interval_seconds)

def start_background_scheduler(app, interval_seconds=600):
    global _scheduler_thread, _stop_event
    if _scheduler_thread and _scheduler_thread.is_alive():
        return

    _stop_event.clear()
    _scheduler_thread = threading.Thread(
        target=_run_scheduled_exception_scans,
        args=(app, interval_seconds),
        daemon=True,
        name="TransitOps-ExceptionScheduler"
    )
    _scheduler_thread.start()
    logger.info("Initialized TransitOps-ExceptionScheduler thread.")

def stop_background_scheduler():
    global _stop_event
    _stop_event.set()
