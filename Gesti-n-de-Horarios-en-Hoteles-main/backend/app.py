"""
Hotel Palmares — Backend FastAPI
app.py — Punto de entrada principal
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import auth, empleados, asistencias, inventario, reportes, sucursales, roles

app = FastAPI(
    title="Hotel Palmares API",
    description="Sistema de Gestión Hotelera — Hotel Palmares",
    version="1.0.0",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
# IMPORTANTE: No se puede usar allow_origins=["*"] junto con allow_credentials=True
# Los navegadores rechazan esa combinación. Usamos allow_origin_regex para
# permitir cualquier origen durante desarrollo sin romper credenciales.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── ROUTERS ─────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/api/auth",        tags=["Autenticación"])
app.include_router(empleados.router,   prefix="/api/empleados",   tags=["Empleados"])
app.include_router(asistencias.router, prefix="/api/asistencias", tags=["Asistencias / Checador"])
app.include_router(inventario.router,  prefix="/api/inventario",  tags=["Inventario"])
app.include_router(reportes.router,    prefix="/api/reportes",    tags=["Reportes"])
app.include_router(sucursales.router,  prefix="/api/sucursales",  tags=["Sucursales"])
app.include_router(roles.router,       prefix="/api/roles",       tags=["Roles y Permisos"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "Hotel Palmares API v1.0.0"}