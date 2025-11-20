from django.urls import path

from .views import (
    CurrentUserView,
    LiveWireTokenObtainPairView,
    LiveWireTokenRefreshView,
    RegisterView,
    UserListView,
    UserPresenceView,
)

app_name = "users"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", CurrentUserView.as_view(), name="me"),
    path("me/presence/", UserPresenceView.as_view(), name="presence"),
    path("token/", LiveWireTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", LiveWireTokenRefreshView.as_view(), name="token_refresh"),
    path("users/", UserListView.as_view(), name="user_list"),
]
