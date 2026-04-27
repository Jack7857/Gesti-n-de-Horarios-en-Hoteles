# 🏨 Hotel Palmares — Sistema de Gestión Hotelera

> Sistema integral de gestión para cadena hotelera multi-sede. Administra empleados, turnos, control de asistencia digital, inventario de insumos y reportes operativos en tiempo real.

![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow) ![Python](https://img.shields.io/badge/python-3.12+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E) ![License](https://img.shields.io/badge/license-Academic-lightgrey)

---

## 🎓 Información académica

| | |
|---|---|
| **Universidad** | Universidad Latinoamericana de Ciencia y Tecnología (ULACIT) |
| **Carrera** | Ingeniería Informática |
| **Curso** | Pruebas de Aseguramiento de la Calidad de Software |
| **Profesor** | Clarence Ricketts Torres |
| **Período** | 2026 — I cuatrimestre |
| **Tipo de entrega** | Proyecto final / integrador |

### 👥 Equipo de desarrollo

| Nombre |
|---|
| Óscar David Charpentier Zúñiga |
| Sebastián Navarro Ortiz |
| Sebastián Herrera Rodríguez |
| Tomás Angulo Cordero |
| Ian Herrera Álvarez |

---

## 📋 Tabla de contenidos

- [Información académica](#-información-académica)
- [Resumen del proyecto](#-resumen-del-proyecto)
- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Stack tecnológico](#-stack-tecnológico)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Requisitos previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración de la base de datos](#-configuración-de-la-base-de-datos)
- [Cómo ejecutar](#-cómo-ejecutar)
- [Roles y permisos](#-roles-y-permisos)
- [API endpoints](#-api-endpoints)
- [Variables de entorno](#-variables-de-entorno)
- [Solución de problemas](#-solución-de-problemas)
- [Historias de usuario implementadas](#-historias-de-usuario-implementadas)

---

## 📖 Resumen del proyecto

**Hotel Palmares** es un sistema web full-stack que centraliza la operación de una cadena hotelera con múltiples sedes. Está pensado para resolver problemas reales del rubro hotelero costarricense:

- Control horario disperso entre planillas en papel
- Falta de visibilidad sobre el inventario de cada sede
- Dificultad para asignar y supervisar turnos
- Ausencia de trazabilidad sobre acciones administrativas

El sistema implementa **24 historias de usuario (HU-01 a HU-24)** que cubren autenticación, gestión de personal, control de asistencia, inventario, reportes y auditoría.

Como entrega del curso de **Pruebas de Aseguramiento de la Calidad de Software**, el proyecto pone especial énfasis en:

- **Validación de datos** en backend y frontend
- **Manejo robusto de errores** y mensajes claros al usuario
- **Auditoría completa** de operaciones administrativas
- **Permisos diferenciados** según rol del usuario
- **Consistencia entre frontend, backend y base de datos**

---

## ✨ Características

### Gestión de personal
- Registro de empleados con datos completos (cédula, área, sede, rol)
- Asignación de turnos semanales por empleado y sede
- **Reloj checador digital** con entrada, pausa y salida
- Cálculo automático de horas efectivas trabajadas

### Control multi-sede
- Múltiples sucursales con datos independientes
- Cambio dinámico de sede desde el header
- Vista consolidada del estado de todas las sedes

### Inventario inteligente
- Catálogo de insumos por sede y área de trabajo
- Movimientos de inventario (entradas y salidas) con responsable
- Alertas automáticas cuando el stock cae bajo el umbral crítico
- Historial completo de movimientos

### Dashboard en tiempo real
- Empleados presentes y en pausa
- Alertas de stock crítico con detalle por insumo
- Asistencia de los últimos 7 días
- Métricas globales por sede

### Reportes y auditoría
- Reportes de asistencia por período
- Reportes de consumo de insumos por área
- Log de auditoría de todas las acciones administrativas
- Exportación a Excel y PDF

### Seguridad
- Autenticación con **JWT** (8h de duración)
- Tres niveles de roles (administrador, supervisor, empleado)
- Permisos diferenciados por endpoint
- Bloqueo de operaciones según rol

---

## 🏗 Arquitectura

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │  HTTPS  │    Backend       │  HTTPS  │    Supabase     │
│  (HTML/JS/CSS)  │ ──────► │   (FastAPI)      │ ──────► │  (PostgreSQL)   │
│                 │  REST   │                  │  REST   │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        │  Single-page application   │  JWT auth + roles          │  Tablas:
        │  Bootstrap 5 + estilos     │  CORS configurado          │  - usuarios
        │  custom (paleta hotelera)  │  Audit log automático      │  - empleados
        │  Modales y widgets         │  Validación con Pydantic   │  - asistencias
        │                            │                            │  - turnos
        │                            │                            │  - sucursales
        │                            │                            │  - insumos
        │                            │                            │  - movimientos_inventario
        │                            │                            │  - audit_log
```

---

## 🛠 Stack tecnológico

### Backend
- **Python 3.12+** (recomendado, no usar 3.14 — ver [solución de problemas](#-solución-de-problemas))
- **FastAPI** — framework web asíncrono
- **Pydantic** — validación de datos
- **python-jose** — JWT
- **supabase-py** — cliente oficial de Supabase
- **uvicorn** — servidor ASGI

### Frontend
- **HTML5 + CSS3 + JavaScript** vanilla (sin frameworks pesados)
- **Bootstrap 5.3** — utilities CSS
- **Bootstrap Icons** — iconografía
- **Google Fonts** (Cormorant Garamond + DM Sans)

### Base de datos
- **PostgreSQL** vía **Supabase**
- Enums tipados para estados (`estado_asistencia`, `rol_usuario`, `area_trabajo`)
- Foreign keys con integridad referencial
- Secuencias auto-incremento

---

## 📁 Estructura del proyecto

```
hotel-palmares/
├── backend/
│   ├── app.py                    # Punto de entrada FastAPI
│   ├── config.py                 # Variables de entorno + cliente Supabase
│   ├── requirements.txt
│   ├── .env                      # ⚠️ NO subir a Git
│   ├── middleware/
│   │   └── auth.py               # JWT + control de roles
│   ├── routes/
│   │   ├── auth.py               # Login / logout / crear usuarios
│   │   ├── empleados.py          # CRUD empleados
│   │   ├── asistencias.py        # Reloj checador + turnos
│   │   ├── inventario.py         # Insumos + movimientos
│   │   ├── reportes.py           # Dashboard + reportes
│   │   ├── roles.py              # Cambio de roles + auditoría
│   │   └── sucursales.py         # CRUD sucursales
│   ├── schema/
│   │   └── schemas.py            # Modelos Pydantic
│   └── utils/
│       └── audit.py              # Helper para audit_log seguro
│
├── frontend/
│   └── hotel-palmares.html       # Single-page app (HTML + CSS + JS embebido)
│
├── docs/
│   ├── schema.sql                # Esquema completo de la BD
│   └── img/                      # Capturas de pantalla
│
└── README.md
```

---

## 📦 Requisitos previos

- **Python 3.12 o 3.13** (no recomendado Python 3.14 por bug en Windows)
- **Cuenta de Supabase** con proyecto creado
- **Navegador moderno** (Chrome, Edge, Firefox)
- **Live Server** (extensión de VS Code) o cualquier servidor HTTP estático para el frontend

---

## ⚙️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/snavarro78/hotel-palmares.git
cd hotel-palmares
```

### 2. Configurar el backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar el entorno
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

Crear archivo `backend/.env`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_role_key_aqui
JWT_SECRET=string_aleatoria_larga_y_segura
```

> ⚠️ **NUNCA subas este archivo a Git.** Asegúrate de tener `.env` en tu `.gitignore`.

Para generar un `JWT_SECRET` seguro:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## 🗄 Configuración de la base de datos

En el SQL Editor de Supabase, corré los siguientes scripts en orden:

### 1. Crear los enums

```sql
CREATE TYPE rol_usuario AS ENUM ('administrador', 'supervisor', 'empleado');
CREATE TYPE area_trabajo AS ENUM (
  'Cocina', 'Limpieza', 'Recepción', 'Gerencia',
  'Administración', 'Mantenimiento'
);
CREATE TYPE estado_asistencia AS ENUM (
  'activo', 'pausa', 'finalizado', 'ausente', 'justificado'
);
CREATE TYPE estado_empleado AS ENUM ('activo', 'inactivo', 'suspendido');
CREATE TYPE tipo_movimiento AS ENUM ('entrada', 'salida');
```

### 2. Asegurar secuencias auto-incremento

```sql
-- Crea las secuencias auto-incremento para todas las tablas con id NOT NULL
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'usuarios', 'sucursales', 'empleados', 'turnos',
    'asistencias', 'insumos', 'movimientos_inventario', 'audit_log'
  ]) LOOP
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I_id_seq', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(''%I_id_seq'')', t, t);
    EXECUTE format('SELECT setval(''%I_id_seq'', COALESCE((SELECT MAX(id) FROM %I), 0) + 1, false)', t, t);
    EXECUTE format('ALTER SEQUENCE %I_id_seq OWNED BY %I.id', t, t);
  END LOOP;
END $$;
```

### 3. Crear usuario administrador inicial

```sql
INSERT INTO usuarios (email, nombre, contrasena, rol, sede_id, iniciales)
VALUES ('admin@hotelpalmares.cr', 'Administrador', 'admin123', 'administrador', 1, 'A');
```

> 🔒 Cambiá la contraseña inmediatamente después de iniciar sesión por primera vez.

---

## 🚀 Cómo ejecutar

### Backend

```bash
cd backend
venv\Scripts\activate    # Windows
uvicorn app:app --reload
```

El backend queda disponible en `http://localhost:8000`.

Documentación interactiva de la API: `http://localhost:8000/docs`

### Frontend

Abrí `frontend/hotel-palmares.html` con un servidor estático. Recomendado:

1. Instalá la extensión **Live Server** en VS Code
2. Click derecho sobre `hotel-palmares.html` → **Open with Live Server**
3. Se abre en `http://localhost:5500`

> ⚠️ No se puede abrir el HTML directamente (file://) porque las peticiones CORS al backend fallan.

### Credenciales de prueba

```
Email:      admin@hotelpalmares.cr
Contraseña: admin123
```

---

## 👥 Roles y permisos

| Funcionalidad | Administrador | Supervisor | Empleado |
|---|:---:|:---:|:---:|
| Dashboard global | ✅ | ⚠️ Solo su sede | ❌ |
| Reloj checador | ⚠️ Si tiene ficha | ✅ | ✅ |
| Ver empleados | ✅ Todos | ⚠️ Solo su sede | ❌ |
| Crear empleados | ✅ | ❌ | ❌ |
| Editar empleados | ✅ | ⚠️ No promover a admin | ❌ |
| Asignar turnos | ✅ | ✅ | ❌ |
| Ver inventario | ✅ | ✅ | ✅ |
| Crear/editar insumos | ✅ | ✅ | ❌ |
| Movimientos inventario | ✅ | ✅ | ✅ |
| Reportes | ✅ | ✅ | ❌ |
| Gestión de sucursales | ✅ | ❌ | ❌ |
| Cambiar roles | ✅ | ❌ | ❌ |
| Log de auditoría | ✅ | ❌ | ❌ |

---

## 🌐 API endpoints

### Autenticación
- `POST /api/auth/login` — Iniciar sesión
- `POST /api/auth/logout` — Cerrar sesión
- `GET /api/auth/me` — Perfil del usuario actual
- `POST /api/auth/usuarios` — Crear usuario (admin)

### Empleados
- `GET /api/empleados/` — Listar y filtrar empleados
- `POST /api/empleados/` — Crear empleado
- `GET /api/empleados/{id}` — Detalle de empleado
- `PATCH /api/empleados/{id}` — Actualizar empleado
- `DELETE /api/empleados/{id}` — Desactivar empleado (soft delete)

### Asistencias / Checador
- `POST /api/asistencias/entrada` — Registrar entrada
- `POST /api/asistencias/pausa?accion=iniciar|finalizar` — Gestionar pausa
- `POST /api/asistencias/salida` — Registrar salida
- `GET /api/asistencias/mi-turno?fecha=YYYY-MM-DD` — Consultar turno propio
- `GET /api/asistencias/?sede_id&fecha` — Listar asistencias (admin/supervisor)
- `POST /api/asistencias/turnos` — Asignar turno
- `GET /api/asistencias/turnos` — Listar turnos asignados

### Inventario
- `GET /api/inventario/insumos` — Listar insumos
- `POST /api/inventario/insumos` — Crear insumo
- `PATCH /api/inventario/insumos/{id}` — Actualizar insumo
- `POST /api/inventario/movimientos` — Registrar movimiento
- `GET /api/inventario/movimientos` — Historial
- `GET /api/inventario/alertas` — Insumos con stock crítico

### Reportes
- `GET /api/reportes/asistencia` — Reporte de asistencia
- `GET /api/reportes/consumo` — Reporte de consumo
- `GET /api/reportes/dashboard/{sede_id}` — Métricas en tiempo real

### Roles y auditoría
- `PATCH /api/roles/cambiar` — Cambiar rol de un usuario
- `GET /api/roles/audit-log` — Historial de acciones

### Sucursales
- `GET /api/sucursales/` — Listar
- `POST /api/sucursales/` — Crear
- `PATCH /api/sucursales/{id}` — Editar

Ver documentación interactiva completa en `http://localhost:8000/docs`.

---

## 🔐 Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto en Supabase | ✅ |
| `SUPABASE_SERVICE_KEY` | Service role key (acceso total, omite RLS) | ✅ |
| `JWT_SECRET` | Secret para firmar tokens JWT | ✅ |

---

## 🧰 Solución de problemas

### `WinError 10035` en el backend (Python 3.14 + Windows)

Bug conocido de `httpx`/`httpcore` con HTTP/2 en Python 3.14 sobre Windows. **Solución:**

1. **Recomendado:** bajar a Python 3.12 o 3.13.
2. **Alternativa:** forzar HTTP/1.1 en el cliente Supabase (ver `config.py`).

### Modales no se ven al hacer click

Causado por extensiones de modo oscuro como Dark Reader. El meta tag `<meta name="darkreader-lock">` ya está incluido en el HTML para prevenirlo. Si igual persiste, deshabilitá la extensión para localhost.

### Errores `null value in column "id"`

Algunas tablas pueden carecer de secuencia auto-incremento. Correr el script de la sección [Configuración de la base de datos](#-configuración-de-la-base-de-datos).

### `duplicate key value violates unique constraint`

Indica que se está intentando crear un usuario/empleado con email o cédula que ya existen. El backend devuelve un mensaje claro con el registro existente.

### Insumos críticos no aparecen al cambiar de sede

Verificar que los insumos tengan `sede_id` asignada:

```sql
SELECT id, nombre, sede_id FROM insumos WHERE sede_id IS NULL;
```

Si hay registros sin sede, asignales una con `UPDATE insumos SET sede_id = X WHERE id IN (...)`.

---

## 📋 Historias de usuario implementadas

| ID | Historia | Estado |
|----|----------|:------:|
| HU-01 | Inicio de sesión con roles diferenciados | ✅ |
| HU-02 | Cierre de sesión seguro | ✅ |
| HU-03 | Cambio de rol de un usuario | ✅ |
| HU-04 | Validación de permisos por endpoint | ✅ |
| HU-05 | Registrar nuevo empleado | ✅ |
| HU-06 | Listar y filtrar empleados | ✅ |
| HU-07 | Editar / desactivar empleado | ✅ |
| HU-08 | Detalle de empleado | ✅ |
| HU-09 | Registrar entrada en reloj checador | ✅ |
| HU-10 | Gestión de pausa (iniciar/finalizar) y salida | ✅ |
| HU-11 | Consultar turno propio | ✅ |
| HU-12 | Asignar y listar turnos | ✅ |
| HU-13 | Reporte de asistencia por período | ✅ |
| HU-14 | Crear y listar insumos | ✅ |
| HU-15 | Registrar movimiento de inventario | ✅ |
| HU-16 | Editar insumo y alertas de stock crítico | ✅ |
| HU-17 | Historial de movimientos | ✅ |
| HU-18 | Reporte de consumo por área | ✅ |
| HU-19 | Dashboard con métricas en tiempo real | ✅ |
| HU-20 | Vista consolidada multi-sede | ✅ |
| HU-21 | Exportación de reportes (Excel/PDF) | ✅ |
| HU-22 | Log de auditoría | ✅ |
| HU-23 | Gestión de sucursales (CRUD) | ✅ |
| HU-24 | Permisos diferenciados en frontend | ✅ |

---

## 📸 Capturas

> _Agregar capturas en `docs/img/` y referenciarlas aquí:_
>
> ```markdown
> ![Login](docs/img/login.png)
> ![Dashboard](docs/img/dashboard.png)
> ![Reloj Checador](docs/img/checador.png)
> ![Inventario](docs/img/inventario.png)
> ```

---

## 📄 Licencia

Este proyecto fue desarrollado con fines **académicos** como parte del curso _Pruebas de Aseguramiento de la Calidad de Software_ de la **Universidad Latinoamericana de Ciencia y Tecnología (ULACIT)**, durante el I cuatrimestre de 2026. No tiene fines comerciales.

---

## 🙏 Reconocimientos

- **Profesor Clarence Ricketts Torres** — por la guía y retroalimentación durante el desarrollo del proyecto
- [FastAPI](https://fastapi.tiangolo.com/) — framework web
- [Supabase](https://supabase.com/) — backend-as-a-service
- [Bootstrap Icons](https://icons.getbootstrap.com/) — iconografía
- [Google Fonts](https://fonts.google.com/) — tipografía (Cormorant Garamond, DM Sans)
