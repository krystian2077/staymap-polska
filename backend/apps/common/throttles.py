from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class UploadThrottle(UserRateThrottle):
    scope = "upload"


class AuthLoginThrottle(AnonRateThrottle):
    scope = "auth_login"


class AuthRegisterThrottle(AnonRateThrottle):
    scope = "auth_register"


class BookingCreateThrottle(UserRateThrottle):
    scope = "booking_create"


class ListingNearbyAnonThrottle(AnonRateThrottle):
    scope = "listing_nearby"


class ListingNearbyUserThrottle(UserRateThrottle):
    scope = "listing_nearby_user"


class AISearchThrottle(UserRateThrottle):
    scope = "ai_search"

