from django.contrib import admin
from django.urls import path
from rest_framework.response import Response
from rest_framework.decorators import api_view

@api_view(["GET"])
def ping(request):
    return Response({"message": "pong"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("ping/", ping),
]
