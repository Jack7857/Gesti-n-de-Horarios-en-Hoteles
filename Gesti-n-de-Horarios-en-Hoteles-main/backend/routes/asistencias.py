"""
routes/asistencias.py — HU-09, HU-10, HU-11, HU-12, HU-13
Reloj checador digital: entrada, pausa y salida
"""

from datetime import date, datetime, time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from config import supabase
from middleware.auth import get_current_user, require_roles
from schema.schemas import (
    AsistenciaOut,
    TurnoCreate,
    TurnoOut,
)

router = APIRouter()


# ── CHECADOR ──────────────────────────────────────────────────────────────────

@router.post("/entrada", response_model=AsistenciaOut, summary="HU-09 — Registrar entrada")
def registrar_entrada(current_user: dict = Depends(get_current_user)):
    if not current_user.get("empleado_id"):
        raise HTTPException(
            status_code=403,
            detail="Este usuario no tiene ficha de empleado asociada. Solicite a un administrador que lo registre como empleado.",
        )

    hoy = date.today().isoformat()
    emp_id = current_user["empleado_id"]
    now = datetime.now()

    existing = (
        supabase.table("asistencias")
        .select("id, estado")
        .eq("empleado_id", emp_id)
        .eq("fecha", hoy)
        .execute()
    )
    if existing.data:
        est = existing.data[0]["estado"]
        if est in ("activo", "pausa"):
            raise HTTPException(status_code=409, detail=f"Ya tienes una entrada activa hoy (estado: {est})")
        # Si el estado es 'finalizado', ya se cerró el turno del día
        raise HTTPException(status_code=409, detail="Ya completaste tu turno de hoy.")

    hora_entrada_str = now.strftime("%H:%M:%S")

    data = {
        "empleado_id": emp_id,
        "fecha": hoy,
        "hora_entrada": hora_entrada_str,
        "estado": "activo",
        "pausa_total_min": 0,
    }
    resp = supabase.table("asistencias").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Error al registrar la entrada")
    return resp.data[0]


@router.post("/salida", response_model=AsistenciaOut, summary="HU-10 — Registrar salida")
def registrar_salida(current_user: dict = Depends(get_current_user)):
    if not current_user.get("empleado_id"):
        raise HTTPException(status_code=403, detail="Solo empleados pueden registrar salida")

    hoy = date.today().isoformat()
    emp_id = current_user["empleado_id"]

    reg = (
        supabase.table("asistencias")
        .select("*")
        .eq("empleado_id", emp_id)
        .eq("fecha", hoy)
        .maybe_single()
        .execute()
    )
    if not reg or not reg.data:
        raise HTTPException(status_code=404, detail="No hay registro de entrada para hoy")

    if reg.data["estado"] not in ("activo", "pausa"):
        raise HTTPException(status_code=409, detail="El turno ya fue finalizado")

    now = datetime.now()

    hora_entrada_raw = reg.data["hora_entrada"]
    if '.' in hora_entrada_raw:
        hora_entrada_clean = hora_entrada_raw.split('.')[0]
    else:
        hora_entrada_clean = hora_entrada_raw

    entrada_time = datetime.strptime(hora_entrada_clean, "%H:%M:%S").time()
    entrada = datetime.combine(date.today(), entrada_time)

    minutos_trabajados = int((now - entrada).total_seconds() / 60)
    pausa_total = reg.data["pausa_total_min"] or 0
    horas_efectivas = (minutos_trabajados - pausa_total) / 60

    hora_salida_str = now.strftime("%H:%M:%S")

    update = {
        "hora_salida": hora_salida_str,
        "estado": "finalizado",
        "horas_efectivas": round(horas_efectivas, 2),
    }
    resp = (
        supabase.table("asistencias")
        .update(update)
        .eq("id", reg.data["id"])
        .execute()
    )
    return resp.data[0]


@router.post("/pausa", response_model=AsistenciaOut, summary="HU-10 — Iniciar / finalizar pausa")
def gestionar_pausa(
    accion: str = Query(..., regex="^(iniciar|finalizar)$"),
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("empleado_id"):
        raise HTTPException(status_code=403, detail="Solo empleados pueden gestionar pausas")

    hoy = date.today().isoformat()
    emp_id = current_user["empleado_id"]

    reg = (
        supabase.table("asistencias")
        .select("*")
        .eq("empleado_id", emp_id)
        .eq("fecha", hoy)
        .maybe_single()
        .execute()
    )
    if not reg or not reg.data:
        raise HTTPException(status_code=404, detail="No hay registro de entrada para hoy")

    r = reg.data
    now = datetime.now()

    if accion == "iniciar":
        if r["estado"] != "activo":
            raise HTTPException(status_code=409, detail=f"No puedes iniciar pausa en estado: {r['estado']}")
        update = {
            "pausa_inicio": now.isoformat(),
            "estado": "pausa",
        }
    else:
        if r["estado"] != "pausa":
            raise HTTPException(status_code=409, detail="No tienes una pausa activa")
        inicio = datetime.fromisoformat(r["pausa_inicio"])
        minutos = int((now - inicio).total_seconds() / 60)
        update = {
            "pausa_total_min": (r["pausa_total_min"] or 0) + minutos,
            "estado": "activo",
        }

    resp = (
        supabase.table("asistencias")
        .update(update)
        .eq("id", r["id"])
        .execute()
    )
    return resp.data[0]


# ── CONSULTA DE TURNO ─────────────────────────────────────────────────────────

@router.get("/mi-turno", response_model=Optional[AsistenciaOut], summary="HU-11 — Consultar turno propio")
def mi_turno(
    fecha: Optional[date] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("empleado_id"):
        # Si no hay empleado_id (p.ej. admin sin ficha), devolvemos None en lugar de 403
        # para que el frontend no rompa.
        return None

    target = fecha.isoformat() if fecha else date.today().isoformat()
    resp = (
        supabase.table("asistencias")
        .select("*")
        .eq("empleado_id", current_user["empleado_id"])
        .eq("fecha", target)
        .execute()
    )
    return resp.data[0] if resp.data else None


# ── TURNOS ASIGNADOS ──────────────────────────────────────────────────────────

@router.post("/turnos", response_model=TurnoOut, status_code=201, summary="HU-12 — Asignar turno")
def asignar_turno(
    body: TurnoCreate,
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    data = {
        "empleado_id": body.empleado_id,
        "dia": body.fecha.isoformat(),
        "entrada": body.hora_inicio.strftime("%H:%M:%S"),
        "salida": body.hora_fin.strftime("%H:%M:%S"),
        "asignado_por": current_user.get("empleado_id"),
    }
    resp = supabase.table("turnos").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Error al asignar el turno")
    return resp.data[0]


@router.get("/turnos", response_model=List[TurnoOut], summary="HU-12 — Listar turnos")
def listar_turnos(
    empleado_id: Optional[int] = Query(None),
    fecha_ini: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    query = supabase.table("turnos").select("*")
    if empleado_id:
        query = query.eq("empleado_id", empleado_id)
    if fecha_ini:
        query = query.gte("dia", fecha_ini.isoformat())
    if fecha_fin:
        query = query.lte("dia", fecha_fin.isoformat())
    resp = query.order("dia").execute()
    return resp.data or []


# ── PANEL DE ASISTENCIA ─────────────────────────────────────────────────────

@router.get("/", response_model=List[AsistenciaOut], summary="Ver asistencias por sede y fecha")
def listar_asistencias(
    sede_id: Optional[int] = Query(None),
    fecha: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    query = supabase.table("asistencias").select("*, empleados!inner(sede_id, nombre, area)")

    if current_user["rol"] == "supervisor":
        query = query.eq("empleados.sede_id", current_user["sede_id"])
    elif sede_id:
        query = query.eq("empleados.sede_id", sede_id)

    target = fecha.isoformat() if fecha else date.today().isoformat()
    query = query.eq("fecha", target)

    resp = query.execute()
    return resp.data or []