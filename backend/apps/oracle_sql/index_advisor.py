"""
Recommends Oracle indexes for a SchemaIR.
 
Rules applied (mirrors Oracle Autonomous DB auto-indexing logic):
1. Every FK column gets an index (Oracle does NOT auto-index FKs unlike MySQL InnoDB)
2. Unique fields get a UNIQUE index
3. Fields named *_code, *_slug, *_email, *_username → likely lookup → index
4. Boolean fields are skipped (low cardinality, index unused by optimizer)
"""
 
from typing import List
from apps.ir.schema import SchemaIR, IndexSchema
 
 
LOOKUP_SUFFIXES = ('_code', '_slug', '_email', '_username', '_token', '_key', '_ref')
 
 
def recommend_indexes(schema_ir: SchemaIR) -> List[IndexSchema]:
    """
    Returns a list of IndexSchema recommendations.
    Also mutates schema_ir.tables[*].indexes in place so the DDL generator
    can include them.
    """
    recommendations: List[IndexSchema] = []
 
    for table in schema_ir.tables:
        tname = table.table_name
        existing_cols = {idx.column_name for idx in table.indexes}
 
        # Rule 1: FK columns
        for fk in table.foreign_keys:
            if fk.relationship_type != 'ManyToManyField' and fk.from_column not in existing_cols:
                idx = IndexSchema(
                    table_name=tname,
                    column_name=fk.from_column,
                    index_name=f'IDX_{tname.upper()}_{fk.from_column.upper()}',
                    reason='Foreign key column — Oracle does not auto-index FK columns',
                    is_unique=False,
                )
                table.indexes.append(idx)
                recommendations.append(idx)
                existing_cols.add(fk.from_column)
 
        # Rule 2 & 3: Column name patterns
        for col in table.columns:
            if col.name in existing_cols or col.is_primary_key:
                continue
            if col.is_unique:
                idx = IndexSchema(
                    table_name=tname,
                    column_name=col.name,
                    index_name=f'UQ_{tname.upper()}_{col.name.upper()}',
                    reason='Unique constraint — explicit index improves lookup performance',
                    is_unique=True,
                )
                table.indexes.append(idx)
                recommendations.append(idx)
                existing_cols.add(col.name)
            elif any(col.name.endswith(suffix) for suffix in LOOKUP_SUFFIXES):
                idx = IndexSchema(
                    table_name=tname,
                    column_name=col.name,
                    index_name=f'IDX_{tname.upper()}_{col.name.upper()}',
                    reason=f'Likely lookup column (name pattern: {col.name}) — recommended by Oracle index advisor',
                    is_unique=False,
                )
                table.indexes.append(idx)
                recommendations.append(idx)
                existing_cols.add(col.name)
 
    return recommendations
