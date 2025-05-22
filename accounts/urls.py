from django.urls import path
from . import views # Import views from the current directory (accounts app)

urlpatterns = [
    # URL pattern for the signup page (root path of the app)
    path('', views.SignupPage, name='signup'),
    # URL pattern for the login page
    path('login/', views.LoginPage, name='login'),
    # URL pattern for the home page (requires login)
    path('home/', views.HomePage, name='home'),
    # URL pattern for logging out
    path('logout/', views.LogoutPage, name='logout'),
]
