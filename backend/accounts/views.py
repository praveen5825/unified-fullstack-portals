from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/
    Open endpoint -- creates a new portal user. Restrict this later
    (e.g. admin-only) once you decide who's allowed to self-register.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    """GET /api/accounts/me/ -- current logged-in user, used by the frontend to verify the session."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
