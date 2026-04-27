"""
routes/auth.py — HU-01, HU-02
Inicio de sesión con roles diferenciados usando tabla 'usuarios'
"""

from fastapi import APIRouter, HTTPException, status, Depends
from config import supabase
from schema.schemas import LoginRequest, LoginResponse, UsuarioCreate, UsuarioOut
from middleware.auth import get_current_user, create_access_token, require_roles

router = APIRouter()


@router.post("/login", response_model=LoginResponse, summary="HU-01 — Inicio de sesión")
def login(body: LoginRequest):
    """Autentica al usuario contra la tabla 'usuarios'."""
    print(f"Intentando login para: {body.email}")

    user_resp = (
        supabase.table("usuarios")
        .select("*")
        .eq("email", body.email)
        .maybe_single()
        .execute()
    )

    if not user_resp.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    user = user_resp.data

    if user.get("contrasena") != body.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    # Buscar empleado vinculado (puede no existir, ej. administrador sin ficha de empleado)
    empleado_id = None
    sede_id_emp = None
    emp_resp = (
        supabase.table("empleados")
        .select("id, sede_id")
        .eq("usuario_id", user["id"])
        .limit(1)
        .execute()
    )
    if emp_resp.data:
        empleado_id = emp_resp.data[0]["id"]
        sede_id_emp = emp_resp.data[0].get("sede_id")

    sede_id_final = sede_id_emp or user.get("sede_id") or 1

    access_token = create_access_token(
        data={
            "usuario_id": user["id"],
            "email": user["email"],
            "rol": user.get("rol", "empleado"),
        }
    )

    return LoginResponse(
        access_token=access_token,
        usuario_id=user["id"],
        empleado_id=empleado_id,
        nombre=user.get("nombre", "Usuario"),
        rol=user.get("rol", "empleado"),
        sede_id=sede_id_final,
    )


@router.post("/logout", summary="HU-02 — Cierre de sesión")
def logout(current_user: dict = Depends(get_current_user)):
    print(f"Logout para usuario: {current_user.get('email')}")
    return {"message": "Sesión cerrada correctamente"}


@router.get("/me", summary="Obtener perfil del usuario autenticado")
def me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post(
    "/usuarios",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo usuario (paso previo a registrar empleado)",
)
def crear_usuario(
    body: UsuarioCreate,
    current_user: dict = Depends(require_roles(["administrador"])),
):
    """Crea un usuario en la tabla 'usuarios'. Usado por el frontend antes de
    crear el empleado."""
    # Verificar que no exista ya un usuario con ese email
    existing = (
        supabase.table("usuarios")
        .select("id")
        .eq("email", body.email)
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email",
        )

    iniciales = "".join([p[0] for p in body.nombre.split()[:2]]).upper() or "U"

    data = {
        "email": body.email,
        "nombre": body.nombre,
        "contrasena": body.contrasena,
        "rol": body.rol.value,
        "sede_id": body.sede_id,
        "iniciales": iniciales,
    }
    resp = supabase.table("usuarios").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Error al crear el usuario")

    return resp.data[0]