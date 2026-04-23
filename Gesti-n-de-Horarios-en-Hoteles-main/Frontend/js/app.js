'use strict';

/* ═══════════════════════════════════════════════════
   Hotel Palmares — Sistema de Gestión
   app.js — Conectado al backend FastAPI + Supabase
   ═══════════════════════════════════════════════════ */

const App = (() => {

  /* ────────────────────────────────────────────────
     CONFIGURACIÓN
     ──────────────────────────────────────────────── */
  
  const API_BASE = 'http://localhost:8000/api';
  let authToken = null;

  /* ────────────────────────────────────────────────
     ESTADO GLOBAL
     ──────────────────────────────────────────────── */

  const state = {
    user: null,
    currentBranch: null,
    currentBranchId: null,
    checadorStatus: 'libre',
    checadorEntrada: null,
    checadorPausaInicio: null,
    checadorPausaTotal: 0,
    checadorAsistenciaId: null,
    clockInterval: null,
    clockLogEntries: [],
    empleados: [],
    turnos: [],
    asistencias: [],
    insumos: [],
    movimientos: [],
    sucursales: [],
    auditLog: [],
    empEditId: null,
    insumoEditId: null,
  };

  /* ────────────────────────────────────────────────
     UTILIDADES HTTP
     ──────────────────────────────────────────────── */

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': authToken ? `Bearer ${authToken}` : '',
  });

  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...getHeaders(), ...options.headers },
      });
      
      if (response.status === 401) {
        logout();
        throw new Error('Sesión expirada');
      }
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Error en la petición');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  /* ────────────────────────────────────────────────
     UTILIDADES GENERALES
     ──────────────────────────────────────────────── */

  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const fmtTime = (d) => d.toTimeString().slice(0, 5);
  const fmtTs = (d) => d.toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' });

  const toast = (msg, type = 'default') => {
    const icons = { default: 'bi-check-circle', success: 'bi-check-circle', error: 'bi-exclamation-circle', warning: 'bi-exclamation-triangle' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<i class="bi ${icons[type] || icons.default}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

  /* ────────────────────────────────────────────────
     CARGA DE DATOS DESDE API
     ──────────────────────────────────────────────── */

  const loadSucursales = async () => {
    try {
      const data = await apiCall('/sucursales/');
      state.sucursales = data;
      const branchSel = document.getElementById('topbar-branch');
      if (branchSel && data.length > 0) {
        branchSel.innerHTML = data.map(s => `<option value="${s.nombre}">${s.nombre}</option>`).join('');
      }
      const loginBranch = document.getElementById('loginBranch');
      if (loginBranch && data.length > 0) {
        loginBranch.innerHTML = data.map(s => `<option value="${s.nombre}">${s.nombre}, ${s.provincia}</option>`).join('');
      }
      return data;
    } catch (error) {
      console.error('Error cargando sucursales:', error);
      return [];
    }
  };

  const loadEmpleados = async () => {
    try {
      const params = new URLSearchParams();
      if (state.user?.rol === 'supervisor' && state.user?.sede_id) {
        params.append('sede_id', state.user.sede_id);
      }
      const url = `/empleados/${params.toString() ? `?${params}` : ''}`;
      const data = await apiCall(url);
      const sucursalesMap = new Map(state.sucursales.map(s => [s.id, s.nombre]));
      state.empleados = data.map(e => ({
        ...e,
        sede_nombre: sucursalesMap.get(e.sede_id) || '—',
      }));
      return state.empleados;
    } catch (error) {
      console.error('Error cargando empleados:', error);
      return [];
    }
  };

  /* ────────────────────────────────────────────────
     AUTENTICACIÓN — HU-01, HU-02
     ──────────────────────────────────────────────── */

  const login = async () => {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPwd').value;

    document.getElementById('err-email').classList.remove('visible');
    document.getElementById('err-pwd').classList.remove('visible');
    document.getElementById('login-error').classList.remove('visible');

    if (!email) {
      document.getElementById('err-email').classList.add('visible');
      return;
    }
    if (!password) {
      document.getElementById('err-pwd').classList.add('visible');
      return;
    }

    const loginBtn = document.querySelector('#login-screen .btn-primary');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Iniciando...';
    loginBtn.disabled = true;

    try {
      await loadSucursales();
      
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      authToken = data.access_token;
      
      const sucursal = state.sucursales.find(s => s.id === data.sede_id);
      
      state.user = {
        usuario_id: data.usuario_id,
        empleado_id: data.empleado_id,
        nombre: data.nombre,
        rol: data.rol,
        sede_id: data.sede_id,
        sede: sucursal?.nombre || 'Palmares',
        initials: data.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase(),
        email: email,
      };
      
      state.currentBranchId = data.sede_id;
      state.currentBranch = sucursal?.nombre || 'Palmares';
      state.checadorStatus = 'libre';

      await loadEmpleados();

      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('app').classList.add('visible');

      updateTopbar();
      applyRoleRestrictions();
      setupDates();
      navigate('dashboard', document.querySelector('.nav-item[data-page="dashboard"]'));
      startClock();
      
      toast(`Bienvenido, ${state.user.nombre.split(' ')[0]}.`, 'success');
      
    } catch (error) {
      console.error('Login error:', error);
      document.getElementById('login-error').classList.add('visible');
      document.getElementById('login-error-msg').textContent = error.message || 'Credenciales incorrectas.';
    } finally {
      loginBtn.innerHTML = originalText;
      loginBtn.disabled = false;
    }
  };

  const logout = async () => {
    if (!confirm('¿Desea cerrar sesión?')) return;
    
    try {
      if (authToken) {
        await apiCall('/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.error('Error en logout:', error);
    }
    
    authToken = null;
    state.user = null;
    
    if (state.clockInterval) {
      clearInterval(state.clockInterval);
      state.clockInterval = null;
    }
    
    document.getElementById('app').classList.remove('visible');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('loginPwd').value = '';
    document.getElementById('loginEmail').value = '';
  };

  /* ────────────────────────────────────────────────
     RESTRICCIONES POR ROL — HU-03, HU-04
     ──────────────────────────────────────────────── */

  const ROL_PERMISOS = {
    administrador: ['dashboard', 'checador', 'empleados', 'horarios', 'inventario', 'reportes', 'sucursales', 'roles'],
    supervisor:    ['dashboard', 'checador', 'empleados', 'horarios', 'inventario', 'reportes'],
    empleado:      ['checador'],
  };

  const applyRoleRestrictions = () => {
    const rol = state.user?.rol || 'empleado';
    const permisos = ROL_PERMISOS[rol] || [];

    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      const page = btn.dataset.page;
      btn.style.display = permisos.includes(page) ? '' : 'none';
    });

    const navAdmin = document.getElementById('nav-admin');
    const navSuper = document.getElementById('nav-super-admin');

    if (rol === 'empleado') {
      if (navAdmin) navAdmin.style.display = 'none';
      if (navSuper) navSuper.style.display = 'none';
    } else if (rol === 'supervisor') {
      if (navAdmin) navAdmin.style.display = '';
      if (navSuper) navSuper.style.display = 'none';
    } else {
      if (navAdmin) navAdmin.style.display = '';
      if (navSuper) navSuper.style.display = '';
    }

    const btnNuevoEmp = document.getElementById('btn-nuevo-emp');
    if (btnNuevoEmp) btnNuevoEmp.style.display = rol === 'administrador' ? '' : 'none';
  };

  /* ────────────────────────────────────────────────
     NAVEGACIÓN
     ──────────────────────────────────────────────── */

  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    checador: 'Reloj Checador',
    empleados: 'Empleados',
    horarios: 'Horarios',
    inventario: 'Inventario',
    reportes: 'Reportes',
    sucursales: 'Sucursales',
    roles: 'Roles y permisos',
  };

  const navigate = (page, btn) => {
    const rol = state.user ? state.user.rol : 'empleado';
    const permisos = ROL_PERMISOS[rol] || [];

    if (!permisos.includes(page)) {
      toast('No tienes permiso para acceder a esta sección.', 'error');
      return;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else {
      const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
      if (navBtn) navBtn.classList.add('active');
    }
    
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

    if (page === 'dashboard') {
      const dashPresentes = document.getElementById('dash-presentes');
      if (dashPresentes) dashPresentes.textContent = '0';
    }
  };

  /* ────────────────────────────────────────────────
     TOPBAR
     ──────────────────────────────────────────────── */

  const updateTopbar = () => {
    const u = state.user;
    if (!u) return;
    
    const avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) avatarEl.textContent = u.initials || 'U';
    
    const nameEl = document.getElementById('topbar-name');
    if (nameEl) nameEl.textContent = u.nombre;
    
    const roleChip = document.getElementById('topbar-role');
    if (roleChip) {
      roleChip.textContent = u.rol.charAt(0).toUpperCase() + u.rol.slice(1);
      roleChip.className = `chip chip-${u.rol}`;
    }

    const branchSel = document.getElementById('topbar-branch');
    if (branchSel) {
      branchSel.value = u.sede;
      branchSel.disabled = u.rol === 'empleado';
    }
  };

  const changeBranch = (branchName) => {
    state.currentBranch = branchName;
    const sucursal = state.sucursales.find(s => s.nombre === branchName);
    if (sucursal) state.currentBranchId = sucursal.id;
  };

  /* ────────────────────────────────────────────────
     FUNCIONES BÁSICAS
     ──────────────────────────────────────────────── */

  const startClock = () => {
    if (state.clockInterval) clearInterval(state.clockInterval);
    state.clockInterval = setInterval(() => {
      const now = new Date();
      const timeEl = document.getElementById('clock-time');
      const dateEl = document.getElementById('clock-date');
      if (timeEl) timeEl.textContent = now.toTimeString().slice(0, 8);
      if (dateEl) {
        const ds = now.toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        dateEl.textContent = ds.charAt(0).toUpperCase() + ds.slice(1);
      }
    }, 1000);
  };

  const setupDates = () => {
    const now = new Date();
    const hoy = fmtDate(now);
    const desdeEl = document.getElementById('rep-asist-desde');
    const hastaEl = document.getElementById('rep-asist-hasta');
    if (desdeEl) desdeEl.value = hoy;
    if (hastaEl) hastaEl.value = hoy;
  };

  // Placeholders
  const filterEmpleados = () => {};
  const openEmpleadoModal = () => {};
  const saveEmpleado = () => {};
  const toggleEmpleado = () => {};
  const renderHorarios = () => {};
  const openTurnoModal = () => {};
  const saveTurno = () => {};
  const filterInventario = () => {};
  const openInsumoModal = () => {};
  const saveInsumo = () => {};
  const openMovimientoModal = () => {};
  const saveMovimiento = () => {};
  const generarReporte = () => {};
  const renderSucursales = () => {};
  const openSucursalModal = () => {};
  const saveSucursal = () => {};
  const changeRol = () => {};
  const renderDashboard = () => {};
  const renderChecador = () => {};
  const renderInventario = () => {};
  const renderReportes = () => {};
  const renderRoles = () => {};
  const checadorAction = () => toast('Función en desarrollo', 'warning');
  const openModal = (id) => { const modal = document.getElementById(id); if (modal) modal.classList.add('open'); };
  const closeModal = (id) => { const modal = document.getElementById(id); if (modal) modal.classList.remove('open'); };
  const setActiveBranch = (nombre) => { changeBranch(nombre); };

  /* ────────────────────────────────────────────────
     API PÚBLICA
     ──────────────────────────────────────────────── */

  return {
    login,
    logout,
    navigate,
    changeBranch,
    setActiveBranch,
    checadorAction,
    filterEmpleados,
    openEmpleadoModal,
    saveEmpleado,
    toggleEmpleado,
    renderHorarios,
    openTurnoModal,
    saveTurno,
    filterInventario,
    openInsumoModal,
    saveInsumo,
    openMovimientoModal,
    saveMovimiento,
    generarReporte,
    renderSucursales,
    openSucursalModal,
    saveSucursal,
    changeRol,
    openModal,
    closeModal,
  };

})();