from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking

from .models import Review
from .serializers import HostResponseSerializer, ReviewCreateSerializer, ReviewSerializer
from .services import ReviewService


class ReviewCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = ReviewCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        booking = get_object_or_404(
            Booking.objects.filter(deleted_at__isnull=True),
            pk=ser.validated_data["booking_id"],
        )
        v = ser.validated_data
        review = ReviewService.create_review(
            booking,
            request.user,
            {
                "overall_rating": v["overall_rating"],
                "title": v.get("title") or "",
                "content": v["content"],
                "subscores": v.get("subscores"),
                "reviewer_role": v["reviewer_role"],
            },
        )
        out = ReviewSerializer(review, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=status.HTTP_201_CREATED)


class ReviewHostResponseView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, review_id):
        review = get_object_or_404(Review.objects.filter(deleted_at__isnull=True), pk=review_id)
        ser = HostResponseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        review = ReviewService.add_host_response(review, request.user, ser.validated_data["host_response"])
        out = ReviewSerializer(review, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=200)
