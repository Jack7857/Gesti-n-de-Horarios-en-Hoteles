"""
middleware/auth.py — Validación JWT y control de roles
"""

from typing import List, Optional
from datetime import datetime, timedelta

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, Header, status
from config import supabase, JWT_SECRET


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=8)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
    return encoded_jwt


def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización requerido",
        )
    token = authorization.split(" ", 1)[1]

    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    usuario_id = payload.get("usuario_id")
    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    # Obtener usuario
    user_resp = (
        supabase.table("usuarios")
        .select("*")
        .eq("id", usuario_id)
        .maybe_single()
        .execute()
    )

    if not user_resp.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )

    user = user_resp.data

    # CLAVE: buscar el empleado_id REAL vinculado a este usuario.
    # Puede no existir (ej. un administrador que solo tiene registro en 'usuarios').
    empleado_id = None
    sede_id_emp = None
    emp_resp = (
        supabase.table("empleados")
        .select("id, sede_id")
        .eq("usuario_id", usuario_id)
        .limit(1)
        .execute()
    )
    if emp_resp.data:
        empleado_id = emp_resp.data[0]["id"]
        sede_id_emp = emp_resp.data[0].get("sede_id")

    return {
        "usuario_id": user["id"],
        "empleado_id": empleado_id,                  # None si no hay empleado vinculado
        "email": user["email"],
        "nombre": user.get("nombre", "Usuario"),
        "rol": user.get("rol", "empleado"),
        "sede_id": sede_id_emp or user.get("sede_id") or 1,
        "token": token,
    }


def require_roles(roles: List[str]):
    def dependency(current_user: dict = Depends(get_current_user)):
        if current_user["rol"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los roles: {roles}",
            )
        return current_user
    return dependency


admin_only = Depends(require_roles(["administrador"]))
admin_supervisor = Depends(require_roles(["administrador", "supervisor"]))
all_roles = Depends(get_current_user)