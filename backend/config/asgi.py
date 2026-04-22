import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

django_asgi_app = get_asgi_application()

from apps.common.ws_middleware import JWTAuthMiddlewareStack  # noqa: E402
from apps.messaging.routing import websocket_urlpatterns  # noqa: E402

# AllowedHostsOriginValidator removed — JWT auth in JWTAuthMiddlewareStack
# already secures all WS endpoints; the validator was rejecting cross-origin
# connections from the Vercel frontend whose domain isn't in ALLOWED_HOSTS.
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
