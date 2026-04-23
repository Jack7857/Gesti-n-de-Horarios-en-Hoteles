"""
schema/schemas.py — Modelos Pydantic (validación de entrada/salida)
"""

from __future__ import annotations
from datetime import date, datetime, time
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ─── ENUMS ────────────────────────────────────────────────────────────────────

class RolUsuario(str, Enum):
    ADMINISTRADOR = "administrador"
    SUPERVISOR = "supervisor"
    EMPLEADO = "empleado"


class AreaTrabajo(str, Enum):
    COCINA = "Cocina"
    LIMPIEZA = "Limpieza"
    RECEPCION = "Recepción"
    GERENCIA = "Gerencia"
    ADMINISTRACION = "Administración"
    MANTENIMIENTO = "Mantenimiento"


class EstadoEmpleo(str, Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    SUSPENDIDO = "suspendido"


class EstadoAsistencia(str, Enum):
    """Debe coincidir EXACTAMENTE con el enum de Supabase (estado_asistencia)."""
    ACTIVO = "activo"
    PAUSA = "pausa"
    FINALIZADO = "finalizado"


class MovTipo(str, Enum):
    ENTRADA = "entrada"
    SALIDA = "salida"


# ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario_id: int
    empleado_id: Optional[int] = None
    nombre: str
    rol: str
    sede_id: int


# ─── SUCURSALES ───────────────────────────────────────────────────────────────

class SucursalCreate(BaseModel):
    nombre: str
    provincia: str
    descripcion: Optional[str] = None
    tipo: Optional[str] = None


class SucursalOut(SucursalCreate):
    id: int
    activa: bool
    created_at: datetime


# ─── USUARIOS ─────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    email: EmailStr
    nombre: str
    contrasena: str  # sin ñ, para compatibilidad con JS/JSON
    rol: RolUsuario
    sede_id: int


class UsuarioOut(BaseModel):
    id: int
    email: str
    nombre: str
    rol: str
    sede_id: int
    created_at: datetime


# ─── EMPLEADOS ────────────────────────────────────────────────────────────────

class EmpleadoCreate(BaseModel):
    usuario_id: int
    nombre: str
    cedula: str
    email: EmailStr
    area: AreaTrabajo
    sede_id: int
    rol: RolUsuario = RolUsuario.EMPLEADO


class EmpleadoUpdate(BaseModel):
    nombre: Optional[str] = None
    cedula: Optional[str] = None
    email: Optional[EmailStr] = None
    area: Optional[AreaTrabajo] = None
    sede_id: Optional[int] = None
    rol: Optional[RolUsuario] = None
    estado: Optional[EstadoEmpleo] = None


class EmpleadoOut(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    nombre: str
    cedula: Optional[str] = None
    email: Optional[str] = None
    area: Optional[str] = None
    sede_id: int
    rol: Optional[str] = None
    estado: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ─── TURNOS ───────────────────────────────────────────────────────────────────
# NOTA: en la BD las columnas se llaman 'dia', 'entrada', 'salida'.
# Exponemos alias 'fecha', 'hora_inicio', 'hora_fin' en la ENTRADA por compatibilidad
# con el frontend, pero la SALIDA (TurnoOut) refleja las columnas reales.

class TurnoCreate(BaseModel):
    empleado_id: int
    fecha: date           # se mapea a columna 'dia' en la query
    hora_inicio: time     # se mapea a columna 'entrada'
    hora_fin: time        # se mapea a columna 'salida'


class TurnoOut(BaseModel):
    id: int
    empleado_id: int
    dia: date
    entrada: time
    salida: time
    asignado_por: Optional[int] = None
    created_at: datetime


# ─── ASISTENCIAS / CHECADOR ───────────────────────────────────────────────────

class AsistenciaOut(BaseModel):
    id: int
    empleado_id: int
    fecha: date
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    pausa_inicio: Optional[datetime] = None
    pausa_total_min: int = 0
    estado: str
    horas_efectivas: Optional[float] = None
    created_at: Optional[datetime] = None


# ─── INVENTARIO ───────────────────────────────────────────────────────────────

class InsumoCreate(BaseModel):
    nombre: str
    unidad: str
    area: AreaTrabajo
    sede_id: int
    stock: int = 0
    umbral_critico: int = 0


class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    unidad: Optional[str] = None
    area: Optional[AreaTrabajo] = None
    stock: Optional[int] = None
    umbral_critico: Optional[int] = None
    activo: Optional[bool] = None


class InsumoOut(BaseModel):
    id: int
    nombre: str
    unidad: str
    area: str
    sede_id: int
    stock: int
    umbral_critico: int
    ultimo_mov_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    activo: Optional[bool] = True


class MovimientoCreate(BaseModel):
    insumo_id: int
    tipo: MovTipo
    cantidad: int
    referencia: Optional[str] = None

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v


class MovimientoOut(BaseModel):
    id: int
    insumo_id: int
    tipo: str
    cantidad: int
    responsable_id: Optional[int] = None
    referencia: Optional[str] = None
    stock_resultante: Optional[int] = None
    created_at: datetime


# ─── REPORTES ────────────────────────────────────────────────────────────────

class ReporteAsistenciaRequest(BaseModel):
    sede_id: int
    fecha_ini: date
    fecha_fin: date


class ReporteConsumoRequest(BaseModel):
    sede_id: int
    fecha_ini: date
    fecha_fin: date
    area: Optional[AreaTrabajo] = None


# ─── ROLES ───────────────────────────────────────────────────────────────────

class CambioRolRequest(BaseModel):
    usuario_id: int      # coincide con lo que usa routes/roles.py
    nuevo_rol: RolUsuario