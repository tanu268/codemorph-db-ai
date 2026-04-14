from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}

class RegisterView(APIView):
    def post(self, request):
        username = request.data.get('username', '').strip()
        email    = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        if not all([username, email, password]):
            return Response({'error': 'All fields required'}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username taken'}, status=400)
        user = User.objects.create_user(username=username, email=email, password=password)
        return Response(get_tokens(user), status=201)

class LoginView(APIView):
    def post(self, request):
        email    = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        try:
            username = User.objects.get(email=email).username
        except User.DoesNotExist:
            return Response({'detail': 'Invalid credentials'}, status=401)
        user = authenticate(username=username, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials'}, status=401)
        return Response(get_tokens(user))

class GoogleLoginView(APIView):
    def post(self, request):
        credential = request.data.get('credential')
        if not credential:
            return Response({'error': 'credential required'}, status=400)
        try:
            info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                os.getenv('GOOGLE_CLIENT_ID')
            )
            email    = info['email']
            name     = info.get('name', email.split('@')[0])
            username = email.split('@')[0]
            # Make username unique if taken
            base, i = username, 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{i}"; i += 1
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={'username': username, 'first_name': name}
            )
            return Response(get_tokens(user))
        except Exception as e:
            return Response({'error': str(e)}, status=400)

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        u = request.user
        return Response({
            'id':          u.id,
            'username':    u.username,
            'email':       u.email,
            'date_joined': u.date_joined,
        })

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out'})