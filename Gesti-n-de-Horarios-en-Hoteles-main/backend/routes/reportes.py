"""
routes/reportes.py — HU-13, HU-18, HU-21
Reportes de asistencia, consumo y exportación
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from config import supabase
from middleware.auth import require_roles

router = APIRouter()


@router.get("/asistencia", summary="HU-13 — Reporte de asistencia por período")
def reporte_asistencia(
    sede_id: int = Query(...),
    fecha_ini: date = Query(...),
    fecha_fin: date = Query(...),
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    query = (
        supabase.table("asistencias")
        .select("*, empleados!inner(nombre, area, sede_id)")
        .eq("empleados.sede_id", sede_id)
        .gte("fecha", fecha_ini.isoformat())
        .lte("fecha", fecha_fin.isoformat())
        .order("fecha", desc=True)
    )
    resp = query.execute()
    return resp.data or []


@router.get("/consumo", summary="HU-18 — Reporte de consumo de insumos por área y fecha")
def reporte_consumo(
    fecha_ini: date = Query(...),
    fecha_fin: date = Query(...),
    area: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    query = supabase.table("movimientos_inventario").select(
        "*, insumos!inner(nombre, unidad, area), empleados!inner(nombre, area, sede_id)"
    ).eq("tipo", "salida")

    if area:
        query = query.eq("insumos.area", area)  # ← CORREGIDO: "area" en lugar de "area_trabajo"

    query = (
        query
        .gte("created_at", f"{fecha_ini.isoformat()}T00:00:00")
        .lte("created_at", f"{fecha_fin.isoformat()}T23:59:59")
        .order("created_at", desc=True)
    )
    resp = query.execute()
    return resp.data or []


@router.get("/dashboard/{sede_id}", summary="HU-19 — Métricas del dashboard en tiempo real")
def dashboard_metricas(
    sede_id: int,
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    hoy = date.today().isoformat()

    asist = (
        supabase.table("asistencias")
        .select("estado, empleados!inner(nombre, area)")
        .eq("empleados.sede_id", sede_id)
        .eq("fecha", hoy)
        .execute()
    )
    presentes = [a for a in (asist.data or []) if a["estado"] == "activo"]
    en_pausa = [a for a in (asist.data or []) if a["estado"] == "pausa"]

    total_emp = (
        supabase.table("empleados")
        .select("id", count="exact")
        .eq("sede_id", sede_id)
        .eq("estado", "activo")
        .execute()
    )

    # CORREGIDO: obtener todos los insumos y filtrar en Python
    insumos_resp = (
        supabase.table("insumos")
        .select("*")
        .eq("sede_id", sede_id)
        .execute()
    )
    insumos = insumos_resp.data or []
    insumos_criticos = [i for i in insumos if i["stock"] <= i["umbral_critico"]]

    return {
        "sede_id": sede_id,
        "fecha": hoy,
        "empleados_presentes": len(presentes),
        "empleados_en_pausa": len(en_pausa),
        "empleados_totales": total_emp.count or 0,
        "insumos_criticos": len(insumos_criticos),
        "detalle_presentes": presentes,
        "detalle_criticos": insumos_criticos,
    }