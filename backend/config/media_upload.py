import os

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

UPLOAD_SECRET = os.environ.get("MEDIA_UPLOAD_SECRET", "")


@csrf_exempt
def upload_media(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    token = request.headers.get("X-Upload-Token", "")
    if not UPLOAD_SECRET or token != UPLOAD_SECRET:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    rel_path = request.POST.get("path", "")
    if not rel_path or ".." in rel_path or rel_path.startswith("/"):
        return JsonResponse({"error": "Invalid path"}, status=400)

    uploaded = request.FILES.get("file")
    if not uploaded:
        return JsonResponse({"error": "No file"}, status=400)

    full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, "wb") as f:
        for chunk in uploaded.chunks():
            f.write(chunk)

    return JsonResponse({"ok": True, "path": rel_path})
