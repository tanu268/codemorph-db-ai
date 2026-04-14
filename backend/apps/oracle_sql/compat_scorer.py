"""
Computes an Oracle compatibility score (0–100) for a SchemaIR.
 
Scoring model:
  Base score: 100
  Deductions per warning: -5 (capped at -40 total from warnings)
  No models found: -50
  No relationships found (possibly non-relational design): -10
  Bonus for JSON fields used: +2 (Oracle 23ai JSON support)
  Bonus for UUID fields: +1 (Oracle 23ai UUID support)
"""
 
from apps.ir.schema import SchemaIR
 
 
def compute_compatibility_score(schema_ir: SchemaIR) -> float:
    score = 100.0
 
    if not schema_ir.tables:
        return 50.0     # nothing to score
 
    # Deduct for warnings (type mapping issues)
    warning_deduction = min(len(schema_ir.warnings) * 5, 40)
    score -= warning_deduction
 
    # No FK relationships might mean the schema uses no referential integrity
    total_fks = sum(len(t.foreign_keys) for t in schema_ir.tables)
    if total_fks == 0 and len(schema_ir.tables) > 1:
        score -= 5
 
    # Bonus for Oracle 23ai-friendly types
    for table in schema_ir.tables:
        for col in table.columns:
            if col.django_type == 'JSONField':
                score = min(score + 2, 100)
                break
            if col.django_type == 'UUIDField':
                score = min(score + 1, 100)
                break
 
    return round(max(score, 0), 1)

