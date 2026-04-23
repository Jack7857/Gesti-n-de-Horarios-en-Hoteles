"""
routes/empleados.py — HU-05, HU-06, HU-07, HU-08
Gestión completa de empleados
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from config import supabase
from middleware.auth import get_current_user, require_roles
from schema.schemas import EmpleadoCreate, EmpleadoOut, EmpleadoUpdate

router = APIRouter()


@router.post(
    "/",
    response_model=EmpleadoOut,
    status_code=status.HTTP_201_CREATED,
    summary="HU-05 — Registrar nuevo empleado",
)
def crear_empleado(
    body: EmpleadoCreate,
    current_user: dict = Depends(require_roles(["administrador"])),
):
    user_resp = (
        supabase.table("usuarios")
        .select("id")
        .eq("id", body.usuario_id)
        .single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario especificado no existe",
        )

    data = {
        "usuario_id": body.usuario_id,
        "nombre": body.nombre,
        "cedula": body.cedula,
        "email": body.email,
        "area": body.area.value,  # ← CORREGIDO
        "sede_id": body.sede_id,
        "rol": body.rol.value,  # ← CORREGIDO
        "estado": "activo",  # ← CORREGIDO
    }
    resp = supabase.table("empleados").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Error al registrar el empleado")

    supabase.table("audit_log").insert({
        "usuario_id": current_user["usuario_id"],
        "usuario_nombre": current_user["nombre"],
        "accion": "CREATE_EMP",
        "modulo": "empleados",
        "metadata": {"nombre": body.nombre, "email": body.email},
    }).execute()

    return resp.data[0]


@router.get(
    "/",
    response_model=List[EmpleadoOut],
    summary="HU-06 — Listar y filtrar empleados",
)
def listar_empleados(
    sede_id: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    rol: Optional[str] = Query(None),
    estado: Optional[str] = Query("activo"),
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    query = supabase.table("empleados").select("*")

    if current_user["rol"] == "supervisor":
        query = query.eq("sede_id", current_user["sede_id"])
    elif sede_id:
        query = query.eq("sede_id", sede_id)

    if area:
        query = query.eq("area", area)  # ← CORREGIDO
    if rol:
        query = query.eq("rol", rol)  # ← CORREGIDO
    if estado:
        query = query.eq("estado", estado)  # ← CORREGIDO

    resp = query.order("nombre").execute()
    return resp.data or []


@router.get(
    "/{empleado_id}",
    response_model=EmpleadoOut,
    summary="Obtener empleado por ID",
)
def obtener_empleado(
    empleado_id: int,
    current_user: dict = Depends(get_current_user),
):
    if current_user["rol"] == "empleado" and current_user.get("empleado_id") != empleado_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    resp = supabase.table("empleados").select("*").eq("id", empleado_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return resp.data


@router.patch(
    "/{empleado_id}",
    response_model=EmpleadoOut,
    summary="HU-07 — Editar empleado",
)
def actualizar_empleado(
    empleado_id: int,
    body: EmpleadoUpdate,
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")

    if current_user["rol"] == "supervisor" and data.get("rol") == "administrador":
        raise HTTPException(status_code=403, detail="Un supervisor no puede asignar el rol de administrador")

    # Convertir enums a string
    if "area" in data and data["area"]:
        data["area"] = data["area"].value
    if "rol" in data and data["rol"]:
        data["rol"] = data["rol"].value
    if "estado" in data and data["estado"]:
        data["estado"] = data["estado"].value

    resp = supabase.table("empleados").update(data).eq("id", empleado_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    supabase.table("audit_log").insert({
        "usuario_id": current_user["usuario_id"],
        "usuario_nombre": current_user["nombre"],
        "accion": "UPDATE_EMP",
        "modulo": "empleados",
        "metadata": {"empleado_id": empleado_id, "changes": data},
    }).execute()

    return resp.data[0]


@router.delete(
    "/{empleado_id}",
    summary="HU-07 — Desactivar empleado (soft delete)",
)
def desactivar_empleado(
    empleado_id: int,
    current_user: dict = Depends(require_roles(["administrador"])),
):
    resp = (
        supabase.table("empleados")
        .update({"estado": "inactivo"})
        .eq("id", empleado_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    supabase.table("audit_log").insert({
        "usuario_id": current_user["usuario_id"],
        "usuario_nombre": current_user["nombre"],
        "accion": "DEACTIVATE_EMP",
        "modulo": "empleados",
        "metadata": {"empleado_id": empleado_id},
    }).execute()

    return {"message": "Empleado desactivado correctamente"}