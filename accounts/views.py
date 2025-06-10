from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.shortcuts import redirect, render


@login_required(login_url="login")
def HomePage(request):
    """After login, send to map app."""
    return redirect("map:map_home")


def SignupPage(request):
    """User registration."""
    if request.method == "POST":
        uname = request.POST.get("username")
        email = request.POST.get("email")
        pass1 = request.POST.get("password")
        pass2 = request.POST.get("password2")
        i_agree = request.POST.get("iAgree")

        # Validate inputs
        if not (uname and email and pass1 and pass2):
            messages.error(request, "All fields are required!")
            return render(request, "accounts/signup.html")
        if pass1 != pass2:
            messages.error(request, "Passwords do not match!")
            return render(request, "accounts/signup.html")
        if not i_agree:
            messages.error(request, "You must agree to terms.")
            return render(request, "accounts/signup.html")

        try:
            User.objects.create_user(username=uname, email=email, password=pass1)
            messages.success(request, "Account created; please log in.")
            return redirect("login")
        except IntegrityError:
            messages.error(request, "Username already exists.")
            return render(request, "accounts/signup.html")
        except Exception as e:
            messages.error(request, f"Signup error: {e}")
            return render(request, "accounts/signup.html")
    return render(request, "accounts/signup.html")


def LoginPage(request):
    """User login."""
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            messages.success(request, f"Welcome back, {username}!")
            return redirect("home")
        messages.error(request, "Invalid credentials.")
    return render(request, "accounts/login.html")


def LogoutPage(request):
    """Log out."""
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect("login")
