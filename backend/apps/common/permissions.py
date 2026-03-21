from rest_framework.permissions import BasePermission


class IsHost(BasePermission):
    message = "Wymagany status hosta."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "is_host", False))


class IsAdmin(BasePermission):
    message = "Wymagane uprawnienia administratora."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "is_admin", False))


class IsOwnerOrAdmin(BasePermission):
    message = "Brak dostępu do tego zasobu."

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, "is_admin", False):
            return True
        for field in ("user", "guest", "author"):
            if hasattr(obj, field):
                return getattr(obj, field) == request.user
        if hasattr(obj, "host"):
            return obj.host.user_id == request.user.id
        return False
