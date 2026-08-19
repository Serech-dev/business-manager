from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, RegisterSerializer


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        token, _ = Token.objects.get_or_create(
            user=user
        )

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
            },
        })

#Current logout handled by FrontEnd
class LogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()

        return Response(
            {"detail": "Sesión cerrada correctamente."},
            status=status.HTTP_200_OK,
        )

class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response(
            {
                "user": {
                    "id": user.id,
                    "email": user.email,
                }
            },
            status=status.HTTP_201_CREATED,
        )