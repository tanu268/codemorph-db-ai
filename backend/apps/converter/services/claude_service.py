import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3"

def convert_code(source_code: str, source_lang: str, target_lang: str) -> dict:
    prompt = f"""You are an expert code translator.
Convert the following {source_lang} code to {target_lang}.
Return ONLY the converted code. No explanation, no markdown, no backticks.

{source_lang} code:
{source_code}

{target_lang} code:"""

    response = requests.post(OLLAMA_URL, json={
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    })

    response.raise_for_status()
    data = response.json()

    return {
        "converted_code": data["response"].strip(),
        "model": MODEL,
    }