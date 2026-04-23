"""
routes/roles.py — HU-03, HU-04
Gestión de roles y permisos (sobre tabla usuarios)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from config import supabase
from middleware.auth import require_roles
from schema.schemas import CambioRolRequest

router = APIRouter()


@router.patch("/cambiar", summary="HU-03 — Cambiar rol de un usuario")
def cambiar_rol(
    body: CambioRolRequest,
    current_user: dict = Depends(require_roles(["administrador"])),
):
    user = (
        supabase.table("usuarios")
        .select("id, email, nombre, rol")
        .eq("id", body.usuario_id)
        .maybe_single()
        .execute()
    )
    if not user or not user.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    rol_anterior = user.data["rol"]
    nuevo_rol = body.nuevo_rol.value

    if rol_anterior == nuevo_rol:
        return {"message": f"El usuario ya tiene el rol '{nuevo_rol}'"}

    resp = (
        supabase.table("usuarios")
        .update({"rol": nuevo_rol})
        .eq("id", body.usuario_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Error al actualizar el rol")

    # Propagar el cambio a la tabla empleados (si existe vinculación)
    supabase.table("empleados").update({"rol": nuevo_rol}).eq("usuario_id", body.usuario_id).execute()

    supabase.table("audit_log").insert({
        "usuario_id": current_user["usuario_id"],
        "usuario_nombre": current_user["nombre"],
        "accion": "CHANGE_ROL",
        "modulo": "roles",
        "metadata": {
            "email": user.data["email"],
            "nombre": user.data["nombre"],
            "rol_anterior": rol_anterior,
            "rol_nuevo": nuevo_rol,
        },
    }).execute()

    return {
        "message": "Rol actualizado correctamente",
        "usuario": user.data["nombre"],
        "rol_anterior": rol_anterior,
        "rol_nuevo": nuevo_rol,
    }


@router.get("/audit-log", summary="HU-22 — Historial de acciones (log de auditoría)")
def audit_log(
    limit: int = 100,
    current_user: dict = Depends(require_roles(["administrador"])),
):
    # No hacemos join con usuarios (no siempre existe); el audit_log ya trae usuario_nombre
    resp = (
        supabase.table("audit_log")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []