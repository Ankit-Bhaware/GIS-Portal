import json

from django.contrib.auth.decorators import login_required
from django.contrib.gis.geos import GEOSGeometry
from django.core.serializers import serialize
from django.http import HttpResponseBadRequest, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import UserPolygon

login_required


@require_http_methods(["GET"])
def polygons_list(request):
    """Return this user’s saved polygons as GeoJSON FeatureCollection."""
    qs = UserPolygon.objects.filter(user=request.user)
    geojson = serialize(
        "geojson",
        qs,
        geometry_field="geometry",
        fields=("crop_name", "sowing_date", "notes", "crop_type"),
    )
    return JsonResponse(json.loads(geojson))


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def polygons_create(request):
    try:
        data = json.loads(request.body)
        geom = GEOSGeometry(json.dumps(data["geometry"]), srid=4326)
        props = data.get("properties", {})
        poly = UserPolygon.objects.create(
            user=request.user,
            geometry=geom,
            crop_name=props.get("crop_name", ""),
            crop_type=props.get("crop_type", ""),
            sowing_date=props.get("sowing_date") or None,
            notes=props.get("notes", ""),
        )
        return JsonResponse({"id": poly.id}, status=201)
    except Exception as e:
        return HttpResponseBadRequest(str(e))


def home(request):
    """Render the map page."""
    return render(request, "map/home.html")
