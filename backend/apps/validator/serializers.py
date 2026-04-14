from rest_framework import serializers
from .models import MigrationExperiment


class MigrationExperimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MigrationExperiment
        fields = "__all__"