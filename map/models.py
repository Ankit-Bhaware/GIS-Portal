from django.contrib.auth.models import User
from django.contrib.gis.db import models


class UserPolygon(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="polygons")
    crop_name = models.CharField(max_length=100, blank=True)
    crop_type = models.CharField(max_length=50, blank=True)
    sowing_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    geometry = models.PolygonField(srid=4326)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "User Polygon"
        verbose_name_plural = "User Polygons"

    def __str__(self):
        return f"{self.user.username}: {self.crop_name or 'Unnamed'} ({self.created_at:%Y-%m-%d %H:%M})"
