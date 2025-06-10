from django.urls import path

from . import views

app_name = "map"

urlpatterns = [
    path("", views.home, name="map_home"),
    path("api/polygons/", views.polygons_list, name="polygons_list"),
    path("api/polygons/create/", views.polygons_create, name="polygons_create"),
]
