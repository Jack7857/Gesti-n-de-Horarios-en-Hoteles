"""
routes/inventario.py — HU-14, HU-15, HU-16, HU-17
Catálogo de insumos, movimientos y alertas de stock crítico
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from config import supabase
from middleware.auth import get_current_user, require_roles
from schema.schemas import (
    InsumoCreate,
    InsumoOut,
    InsumoUpdate,
    MovimientoCreate,
    MovimientoOut,
)

router = APIRouter()


# ── CATÁLOGO DE INSUMOS ───────────────────────────────────────────────────────

@router.post("/insumos", response_model=InsumoOut, status_code=201, summary="HU-14 — Crear insumo")
def crear_insumo(
    body: InsumoCreate,
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    data = {
        "nombre": body.nombre,
        "unidad": body.unidad,
        "area": body.area.value,
        "sede_id": body.sede_id,
        "stock": body.stock,
        "umbral_critico": body.umbral_critico,
        "activo": True,
    }
    resp = supabase.table("insumos").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Error al crear el insumo")

    supabase.table("audit_log").insert({
        "usuario_id": current_user["usuario_id"],
        "usuario_nombre": current_user["nombre"],
        "accion": "CREATE_INSUMO",
        "modulo": "inventario",
        "metadata": {"nombre": body.nombre},
    }).execute()

    return resp.data[0]


@router.get("/insumos", response_model=List[InsumoOut], summary="HU-14 — Listar insumos")
def listar_insumos(
    area: Optional[str] = Query(None),
    solo_criticos: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    query = supabase.table("insumos").select("*").eq("activo", True)

    if area:
        query = query.eq("area", area)

    resp = query.order("nombre").execute()
    insumos = resp.data or []

    if solo_criticos:
        insumos = [i for i in insumos if i["stock"] <= i["umbral_critico"]]

    return insumos


@router.get("/insumos/{insumo_id}", response_model=InsumoOut, summary="Obtener insumo por ID")
def obtener_insumo(insumo_id: int, current_user: dict = Depends(get_current_user)):
    resp = supabase.table("insumos").select("*").eq("id", insumo_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    return resp.data


@router.patch("/insumos/{insumo_id}", response_model=InsumoOut, summary="HU-16 — Actualizar insumo")
def actualizar_insumo(
    insumo_id: int,
    body: InsumoUpdate,
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")

    # Convertir enum si viene
    if "area" in data and data["area"]:
        data["area"] = data["area"].value if hasattr(data["area"], "value") else data["area"]

    resp = (
        supabase.table("insumos")
        .update(data)
        .eq("id", insumo_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    supabase.table("audit_log").insert({
        "usuario_id": current_user["usuario_id"],
        "usuario_nombre": current_user["nombre"],
        "accion": "UPDATE_INSUMO",
        "modulo": "inventario",
        "metadata": {"insumo_id": insumo_id, "changes": data},
    }).execute()

    return resp.data[0]


# ── MOVIMIENTOS DE INVENTARIO ─────────────────────────────────────────────────

@router.post("/movimientos", response_model=MovimientoOut, status_code=201, summary="HU-15 — Registrar movimiento")
def registrar_movimiento(
    body: MovimientoCreate,
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("empleado_id"):
        raise HTTPException(status_code=403, detail="Este usuario no tiene ficha de empleado asociada")

    ins = (
        supabase.table("insumos")
        .select("stock, nombre, umbral_critico")
        .eq("id", body.insumo_id)
        .single()
        .execute()
    )
    if not ins.data:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    stock_ant = ins.data["stock"]
    cantidad_int = int(body.cantidad)

    if body.tipo.value == "salida" and stock_ant < cantidad_int:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Stock insuficiente. Disponible: {stock_ant} | Solicitado: {cantidad_int}",
        )

    stock_nuevo = stock_ant + cantidad_int if body.tipo.value == "entrada" else stock_ant - cantidad_int

    data = {
        "insumo_id": body.insumo_id,
        "tipo": body.tipo.value,
        "cantidad": cantidad_int,
        "responsable_id": current_user["empleado_id"],
        "referencia": body.referencia,
        "stock_resultante": stock_nuevo,
    }
    resp = supabase.table("movimientos_inventario").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Error al registrar el movimiento")

    supabase.table("insumos").update({
        "stock": stock_nuevo,
        "ultimo_mov_at": datetime.now().isoformat()
    }).eq("id", body.insumo_id).execute()

    return resp.data[0]


@router.get("/movimientos", response_model=List[MovimientoOut], summary="HU-17 — Historial de movimientos")
def listar_movimientos(
    insumo_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_roles(["administrador", "supervisor"])),
):
    query = supabase.table("movimientos_inventario").select("*")
    if insumo_id:
        query = query.eq("insumo_id", insumo_id)

    resp = query.order("created_at", desc=True).limit(limit).execute()
    return resp.data or []


# ── ALERTAS DE STOCK CRÍTICO ──────────────────────────────────────────────────

@router.get("/alertas", summary="HU-16 — Insumos con stock crítico")
def alertas_stock_critico(current_user: dict = Depends(get_current_user)):
    # Supabase PostgREST no permite comparar dos columnas directamente desde
    # el cliente Python, así que traemos todo y filtramos en memoria.
    resp = (
        supabase.table("insumos")
        .select("*")
        .eq("activo", True)
        .execute()
    )
    insumos = resp.data or []
    return [i for i in insumos if i["stock"] <= i["umbral_critico"]]