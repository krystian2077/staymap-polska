from django.db import connection
from django.core.cache import cache
from django.http import JsonResponse


def health_live(request):
    return JsonResponse({"status": "ok", "service": "staymap-api"})


def health_ready(request):
    checks = {}
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = {"status": "ok"}
    except Exception as e:
        checks["database"] = {"status": "error", "detail": str(e)}
    try:
        cache.set("healthcheck", "ok", timeout=5)
        assert cache.get("healthcheck") == "ok"
        checks["redis"] = {"status": "ok"}
    except Exception as e:
        checks["redis"] = {"status": "error", "detail": str(e)}
    overall = "ok" if all(c.get("status") == "ok" for c in checks.values()) else "error"
    status = 200 if overall == "ok" else 503
    return JsonResponse({"status": overall, "checks": checks}, status=status)
