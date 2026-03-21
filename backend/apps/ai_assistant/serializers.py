from rest_framework import serializers


class AiSearchCreateSerializer(serializers.Serializer):
    prompt = serializers.CharField(
        min_length=1,
        max_length=4000,
        trim_whitespace=True,
    )
