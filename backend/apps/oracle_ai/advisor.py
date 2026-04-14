import requests
from apps.ir.schema import SchemaIR
 
 
OLLAMA_URL = 'http://localhost:11434/api/generate'
OLLAMA_MODEL = 'llama3'
 
 
def _call_ollama(prompt: str) -> str:
    """Call your existing Ollama/Llama3 endpoint."""
    try:
        resp = requests.post(OLLAMA_URL, json={
            'model': OLLAMA_MODEL,
            'prompt': prompt,
            'stream': False,
        }, timeout=60)
        resp.raise_for_status()
        return resp.json().get('response', '').strip()
    except Exception as e:
        return f'Oracle AI advisor unavailable: {str(e)}'
 
 
def get_schema_advisory(schema_ir: SchemaIR) -> dict:
    """
    Sends SchemaIR summary to Llama3 with Oracle Select AI framing.
    Returns structured advisory text for the frontend.
    """
    # Build a compact schema summary for the prompt
    table_summaries = []
    for t in schema_ir.tables[:10]:    # cap at 10 tables to stay in token budget
        fk_count = len(t.foreign_keys)
        col_count = len(t.columns)
        table_summaries.append(f'- {t.name}: {col_count} columns, {fk_count} FK relationships')
 
    schema_summary = '\n'.join(table_summaries)
    warning_summary = '\n'.join(schema_ir.warnings[:5]) if schema_ir.warnings else 'None'
 
    prompt = f"""You are an Oracle AI Database advisor using Oracle Select AI technology.
Analyze this Django database schema being migrated to Oracle 23ai:
 
SCHEMA SUMMARY:
{schema_summary}
 
MIGRATION WARNINGS:
{warning_summary}
 
COMPATIBILITY SCORE: {schema_ir.compatibility_score}/100
 
Provide a concise Oracle AI advisory covering:
1. Key migration considerations for Oracle 23ai
2. Which tables would benefit most from Oracle Vector Search indexing
3. One Oracle Select AI query optimization suggestion
4. Overall migration readiness assessment
 
Keep the response under 200 words. Use Oracle terminology."""
 
    ai_response = _call_ollama(prompt)
 
    return {
        'advisory': ai_response,
        'oracle_technologies': [
            'Oracle AI Database 23ai',
            'Oracle Select AI',
            'Oracle Vector Search',
            'Oracle APEX',
            'Oracle Autonomous Database',
        ],
        'schema_summary': {
            'tables': len(schema_ir.tables),
            'relationships': len(schema_ir.relationship_edges),
            'compatibility_score': schema_ir.compatibility_score,
            'warnings_count': len(schema_ir.warnings),
        }
    }