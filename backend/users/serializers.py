from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "display_name",
            "avatar_url",
            "is_email_verified",
            "date_joined",
            "last_active_at",
            "is_online",
        )
        read_only_fields = ("id", "is_email_verified", "date_joined", "last_active_at", "is_online")

    def get_is_online(self, obj):
        if not obj.last_active_at:
            return False
        threshold = timezone.now() - timedelta(minutes=2)
        return obj.last_active_at >= threshold


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "password_confirm", "display_name", "avatar_url")

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return User.objects.create_user(**validated_data)


class LiveWireTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Issue JWT pair and include serialized user payload."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
