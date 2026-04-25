"""
utils/audit.py — Helper para registrar acciones en audit_log de forma segura.

El registro en audit_log es secundario a la operación principal: si falla
(por configuración de la BD, secuencia mal definida, etc.), la operación
de negocio NO debe romperse. Este helper captura cualquier error y lo
loggea por consola sin propagarlo.
"""

from config import supabase


def safe_audit(usuario_id: int, usuario_nombre: str, accion: str, modulo: str, metadata: dict | None = None) -> None:
    """Inserta una entrada en audit_log. Si falla, solo imprime y sigue."""
    try:
        supabase.table("audit_log").insert({
            "usuario_id": usuario_id,
            "usuario_nombre": usuario_nombre,
            "accion": accion,
            "modulo": modulo,
            "metadata": metadata or {},
        }).execute()
    except Exception as e:
        # No propagamos: la operación principal ya se completó.
        print(f"[AUDIT WARN] No se pudo registrar acción '{accion}' en módulo '{modulo}': {e}")