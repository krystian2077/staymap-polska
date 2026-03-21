import logging
from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseMiddleware):
    """WebSocket: `?token=<access_jwt>`."""

    async def __call__(self, scope, receive, send):
        scope["user"] = await self._authenticate(scope)
        return await super().__call__(scope, receive, send)

    @staticmethod
    async def _authenticate(scope):
        from channels.db import database_sync_to_async
        from django.contrib.auth import get_user_model

        User = get_user_model()
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if not token_list:
            return AnonymousUser()

        try:
            token = AccessToken(token_list[0])
            user_id = token["user_id"]

            @database_sync_to_async
            def get_user():
                return User.objects.filter(
                    pk=user_id, is_active=True, deleted_at__isnull=True
                ).first()

            return await get_user() or AnonymousUser()
        except (InvalidToken, TokenError, KeyError) as e:
            logger.warning("WS JWT auth failed: %s", e)
            return AnonymousUser()


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
