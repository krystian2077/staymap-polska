from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status, serializers
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.common.audit import log_action
from apps.common.throttles import AuthLoginThrottle, AuthRegisterThrottle
from apps.listings.image_service import ImageService
from apps.users.models import UserProfile
from apps.users.serializers import (
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserMeSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRegisterThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_action(
            action="user.registered",
            object_type="user",
            object_id=str(user.id),
            actor=user,
            metadata={"email": user.email},
        )
        data = UserMeSerializer(user).data
        return Response({"data": data, "meta": {}}, status=status.HTTP_201_CREATED)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthLoginThrottle]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserMeSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return User.objects.select_related("host_profile", "user_profile")

    def get_object(self):
        return self.get_queryset().get(pk=self.request.user.pk)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"data": serializer.data, "meta": {}})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)  # Zawsze partial dla profilu
        instance = self.get_object()

        # 1. Obsługa awatara
        avatar = request.FILES.get("avatar")
        if avatar:
            try:
                content = ImageService.validate_and_process(avatar)
                prof, _ = UserProfile.objects.get_or_create(user=instance)
                if prof.avatar:
                    prof.avatar.delete(save=False)
                prof.avatar.save(content.name, content, save=True)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"avatar": list(e.messages)})
            except Exception as e:
                print(f"Error processing avatar: {e}")
                raise serializers.ValidationError({"avatar": ["Błąd przetwarzania pliku graficznego."]})

        # 2. Obsługa bio (HostProfile) - niezależnie od awatara
        bio = request.data.get("bio")
        if bio and hasattr(instance, "host_profile"):
            try:
                hp = instance.host_profile
                hp.bio = bio
                hp.save(update_fields=["bio"])
            except DjangoValidationError as e:
                raise serializers.ValidationError({"bio": list(e.messages)})
            except Exception as e:
                print(f"Error updating host bio: {e}")

        # 3. Reszta pól (User + UserProfile) przez serializer
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Odświeżamy i zwracamy
        instance = self.get_queryset().get(pk=instance.pk)
        out = self.get_serializer(instance)
        return Response({"data": out.data, "meta": {}})
