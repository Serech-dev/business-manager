from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        password = attrs["password"]

        user = User.objects.filter(
            email__iexact=email
        ).first()

        if user is None:
            raise serializers.ValidationError(
                "Correo o contraseña incorrectos."
            )

        authenticated_user = authenticate(
            username=user.username,
            password=password,
        )

        if authenticated_user is None:
            raise serializers.ValidationError(
                "Correo o contraseña incorrectos."
            )

        if not authenticated_user.is_active:
            raise serializers.ValidationError(
                "Esta cuenta está desactivada."
            )

        attrs["user"] = authenticated_user

        return attrs


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )
    password_confirm = serializers.CharField(
        write_only=True,
    )

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Ya existe una cuenta con este email."
            )

        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Las contraseñas no coinciden."
            })

        validate_password(attrs["password"])

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")

        email = validated_data["email"]
        base_username = email.split("@")[0]

        username = base_username
        counter = 1

        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        return User.objects.create_user(
            username=username,
            email=email,
            password=validated_data["password"],
        )