from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class UploadThrottle(UserRateThrottle):
    scope = "upload"


class AuthLoginThrottle(AnonRateThrottle):
    scope = "auth_login"


class AuthRegisterThrottle(AnonRateThrottle):
    scope = "auth_register"
