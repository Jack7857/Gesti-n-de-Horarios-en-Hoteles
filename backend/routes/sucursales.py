"""
routes/sucursales.py — HU-23, HU-24
Administración de sedes
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from config import supabase
from middleware.auth import get_current_user, require_roles
from schema.schemas import SucursalCreate, SucursalOut

router = APIRouter()


@router.get("/", response_model=List[SucursalOut], summary="HU-23 — Listar sucursales")
def listar_sucursales(current_user: dict = Depends(get_current_user)):
    resp = supabase.table("sucursales").select("*").eq("activa", True).order("nombre").execute()
    return resp.data or []


@router.post("/", response_model=SucursalOut, status_code=201, summary="HU-23 — Crear sucursal")
def crear_sucursal(
    body: SucursalCreate,
    current_user: dict = Depends(require_roles(["administrador"])),
):
    resp = supabase.table("sucursales").insert(body.model_dump()).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Error al crear la sucursal")
    return resp.data[0]


@router.patch("/{sucursal_id}", response_model=SucursalOut, summary="HU-23 — Editar sucursal")
def editar_sucursal(
    sucursal_id: int,
    body: SucursalCreate,
    current_user: dict = Depends(require_roles(["administrador"])),
):
    resp = (
        supabase.table("sucursales")
        .update(body.model_dump(exclude_none=True))
        .eq("id", sucursal_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    return resp.data[0]