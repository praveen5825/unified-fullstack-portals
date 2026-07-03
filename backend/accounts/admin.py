from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin

# Using Django's default User model -- registered here just so it shows
# up cleanly in this project's admin (your existing project likely
# already has this registered; skip if so).
User = get_user_model()
if not admin.site.is_registered(User):
    admin.site.register(User, UserAdmin)
