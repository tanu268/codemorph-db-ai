from rest_framework.views import APIView
from rest_framework.response import Response
from .services.claude_service import convert_code

class ConvertCodeView(APIView):
    def post(self, request):
        source_code = request.data.get("source_code", "").strip()
        source_lang = request.data.get("source_lang", "Python")
        target_lang = request.data.get("target_lang", "Java")

        if not source_code:
            return Response({"error": "source_code is required"}, status=400)

        if source_lang == target_lang:
            return Response({"error": "source and target language must differ"}, status=400)

        try:
            result = convert_code(source_code, source_lang, target_lang)
            return Response(result, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)