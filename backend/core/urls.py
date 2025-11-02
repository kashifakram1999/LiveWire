from django.contrib import admin
from django.urls import include, path
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def ping(request):
    return Response({"message": "pong"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("ping/", ping),
    path("api/auth/", include("users.urls", namespace="users")),
    path("api/chat/", include("chat.urls", namespace="chat")),
]
