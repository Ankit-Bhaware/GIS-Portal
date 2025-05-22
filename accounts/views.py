from django.shortcuts import render, HttpResponse, redirect
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.contrib import messages # Import the messages framework

# Create your views here.

@login_required(login_url='login')
def HomePage(request):
    """
    Renders the home page. Requires user to be logged in.
    If not logged in, redirects to the login page.
    """
    return render(request, 'accounts/home.html')

def SignupPage(request):
    """
    Handles user registration.
    If request is POST, attempts to create a new user.
    If passwords do not match or username/email is duplicate, adds an error message.
    Otherwise, redirects to the login page.
    If request is GET, renders the signup page.
    """
    print("SignupPage view accessed.") # Debug print
    if request.method == 'POST':
        print("POST request received for SignupPage.") # Debug print
        # Retrieve data from the form
        uname = request.POST.get('username')
        email = request.POST.get('email')
        pass1 = request.POST.get('password')
        pass2 = request.POST.get('password2')
        i_agree = request.POST.get('iAgree') # Get the checkbox value

        print(f"Received data: username={uname}, email={email}, pass1={'*' * len(pass1) if pass1 else 'None'}, pass2={'*' * len(pass2) if pass2 else 'None'}, i_agree={i_agree}") # Debug print

        # Basic validation
        if not uname or not email or not pass1 or not pass2:
            messages.error(request, "All fields are required!")
            print("Validation failed: All fields not provided.") # Debug print
            return render(request, 'accounts/signup.html')

        if pass1 != pass2:
            messages.error(request, "Your password and confirm password are not the same!!")
            print("Validation failed: Passwords do not match.") # Debug print
            return render(request, 'accounts/signup.html')
        
        if not i_agree: # Check if the "I agree" checkbox was checked
            messages.error(request, "You must agree to the terms and conditions.")
            print("Validation failed: Terms not agreed.") # Debug print
            return render(request, 'accounts/signup.html')

        try:
            print("Attempting to create user...") # Debug print
            # Create a new user. create_user handles password hashing.
            my_user = User.objects.create_user(username=uname, email=email, password=pass1)
            my_user.save() # Save the user object to the database
            
            # --- REVERTED: Redirect to login page after successful signup ---
            messages.success(request, "Account created successfully! Please log in.") # Success message
            print("User created successfully. Redirecting to login.") # Debug print
            return redirect('login') # Redirect to login page on successful signup

        except IntegrityError:
            # This error occurs if a user with the same username already exists
            messages.error(request, "Username already exists. Please choose a different one.")
            print("User creation failed: Username already exists.") # Debug print
            return render(request, 'accounts/signup.html')
        except Exception as e:
            # Catch any other unexpected errors during user creation
            messages.error(request, f"An unexpected error occurred during signup: {e}")
            print(f"User creation failed: Unexpected error - {e}") # Debug print
            return render(request, 'accounts/signup.html')

    print("GET request received for SignupPage.") # Debug print
    return render(request, 'accounts/signup.html')

def LoginPage(request):
    """
    Handles user login.
    If request is POST, attempts to authenticate the user.
    If authentication is successful, logs the user in and redirects to the home page.
    Otherwise, returns an error message.
    If request is GET, renders the login page.
    """
    print("LoginPage view accessed.") # Debug print
    if request.method == 'POST':
        print("POST request received for LoginPage.") # Debug print
        username = request.POST.get('username')
        pass_input = request.POST.get('password')

        print(f"Received login data: username={username}, password={'*' * len(pass_input) if pass_input else 'None'}") # Debug print

        # Authenticate the user
        user = authenticate(request, username=username, password=pass_input)

        if user is not None:
            login(request, user) # Log the user in
            messages.success(request, f"Welcome back, {username}!") # Success message
            print(f"User '{username}' authenticated and logged in. Redirecting to home.") # Debug print
            return redirect('home') # Redirect to home page
        else:
            messages.error(request, "Invalid username or password.") # Error message for failed login
            print("Login failed: Invalid credentials.") # Debug print
            return render(request, 'accounts/login.html') # Render login page with error

    print("GET request received for LoginPage.") # Debug print
    return render(request, 'accounts/login.html')

def LogoutPage(request):
    """
    Logs out the current user and redirects to the login page.
    """
    logout(request)
    messages.info(request, "You have been logged out.") # Info message
    return redirect('login')
