from django.urls import path

from .views import ReviewCreateView, ReviewHostResponseView

urlpatterns = [
    path("reviews/", ReviewCreateView.as_view(), name="review-create"),
    path(
        "reviews/<uuid:review_id>/host-response/",
        ReviewHostResponseView.as_view(),
        name="review-host-response",
    ),
]
