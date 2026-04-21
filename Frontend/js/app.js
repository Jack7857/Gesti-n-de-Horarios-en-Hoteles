'use strict';

/* ═══════════════════════════════════════════════════
   Hotel Palmares — Sistema de Gestión
   app.js — Lógica principal de la aplicación
   Estándar: Airbnb JavaScript Style Guide
   Módulos: HU-01 al HU-27
   ═══════════════════════════════════════════════════ */

const App = (() => {

  /* ────────────────────────────────────────────────
     ESTADO GLOBAL DE LA APLICACIÓN
     ──────────────────────────────────────────────── */

  const state = {
    user: null,
    currentBranch: 'Palmares',
    checadorStatus: 'libre',   // libre | activo | pausa | cerrado
    checadorEntrada: null,
    checadorPausaInicio: null,
    checadorPausaTotal: 0,
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
     USUARIOS DE PRUEBA — HU-01, HU-04
     Simula la autenticación diferenciada por rol.
     En producción: Supabase Auth.
     ──────────────────────────────────────────────── */

  const USUARIOS = [
    { email: 'admin', rol: 'administrador', nombre: 'Óscar Charpentier',     initials: 'OC', sede: 'Palmares' },
    { email: 'supervisor', rol: 'supervisor',    nombre: 'Sebastián Navarro',     initials: 'SN', sede: 'La Fortuna' },
    { email: 'empleado', rol: 'empleado',      nombre: 'María González',         initials: 'MG', sede: 'Palmares' },
    { email: 'admin.palmares@hotelpalmares.cr', rol: 'administrador', nombre: 'Óscar Charpentier', initials: 'OC', sede: 'Palmares' },
    { email: 'admin.jaco@hotelpalmares.cr',     rol: 'administrador', nombre: 'Admin Jacó',         initials: 'AJ', sede: 'Jacó' },
    { email: 'admin.fortuna@hotelpalmares.cr',  rol: 'administrador', nombre: 'Admin La Fortuna',   initials: 'AF', sede: 'La Fortuna' },
  ];

  const ROL_PERMISOS = {
    administrador: ['dashboard','checador','empleados','horarios','inventario','reportes','sucursales','roles'],
    supervisor:    ['dashboard','checador','empleados','horarios','inventario','reportes'],
    empleado:      ['checador'],
  };

  /* ────────────────────────────────────────────────
     DATOS INICIALES DE EJEMPLO
     Simula carga inicial de la BD (HU-08)
     ──────────────────────────────────────────────── */

  const initData = () => {
    state.empleados = [
      { id: 1, nombre: 'María González',      cedula: '1-9876-5432', email: 'maria@hotelpalmares.cr',    area: 'Cocina',        sede: 'Palmares',   rol: 'empleado',      estado: 'activo' },
      { id: 2, nombre: 'Carlos Méndez',        cedula: '2-1234-5678', email: 'carlos@hotelpalmares.cr',   area: 'Limpieza',      sede: 'La Fortuna', rol: 'empleado',      estado: 'activo' },
      { id: 3, nombre: 'Andrés Vargas',         cedula: '3-5678-9012', email: 'andres@hotelpalmares.cr',   area: 'Recepción',     sede: 'Palmares',   rol: 'empleado',      estado: 'activo' },
      { id: 4, nombre: 'Laura Aguilar Brenes', cedula: '1-2345-6789', email: 'laura@hotelpalmares.cr',    area: 'Cocina',        sede: 'La Fortuna', rol: 'empleado',      estado: 'activo' },
      { id: 5, nombre: 'Sebastián Navarro',     cedula: '1-1111-2222', email: 'sebastian@hotelpalmares.cr',area: 'Administración',sede: 'La Fortuna', rol: 'supervisor',    estado: 'activo' },
      { id: 6, nombre: 'Óscar Charpentier',     cedula: '1-3333-4444', email: 'oscar@hotelpalmares.cr',    area: 'Gerencia',      sede: 'Palmares',   rol: 'administrador', estado: 'activo' },
      { id: 7, nombre: 'Tomás Angulo',           cedula: '4-4444-5555', email: 'tomas@hotelpalmares.cr',    area: 'Mantenimiento', sede: 'Jacó',       rol: 'empleado',      estado: 'activo' },
      { id: 8, nombre: 'Ian Herrera',            cedula: '5-5555-6666', email: 'ian@hotelpalmares.cr',      area: 'Recepción',     sede: 'Jacó',       rol: 'supervisor',    estado: 'activo' },
    ];

    state.sucursales = [
      { id: 1, nombre: 'Palmares',   provincia: 'Alajuela',   desc: 'Sede central', tipo: 'Principal' },
      { id: 2, nombre: 'Jacó',       provincia: 'Puntarenas', desc: 'Sede turística de playa', tipo: 'Turística' },
      { id: 3, nombre: 'La Fortuna', provincia: 'Alajuela',   desc: 'Sede turística volcánica', tipo: 'Turística' },
    ];

    const hoy = fmtDate(new Date());
    state.asistencias = [
      { empId: 1, nombre: 'María González',  fecha: hoy, entrada: '06:58', pausa: 0,  salida: '',    estado: 'activo' },
      { empId: 2, nombre: 'Carlos Méndez',   fecha: hoy, entrada: '07:00', pausa: 20, salida: '',    estado: 'pausa' },
      { empId: 3, nombre: 'Andrés Vargas',   fecha: hoy, entrada: '08:00', pausa: 0,  salida: '',    estado: 'activo' },
      { empId: 4, nombre: 'Laura Aguilar',   fecha: hoy, entrada: '06:45', pausa: 0,  salida: '',    estado: 'activo' },
      { empId: 7, nombre: 'Tomás Angulo',    fecha: hoy, entrada: '07:30', pausa: 0,  salida: '15:00', estado: 'cerrado' },
    ];

    state.insumos = [
      { id: 1, nombre: 'Detergente multiusos', unidad: 'Galón', area: 'Limpieza', sede: 'Palmares',   stock: 4,  umbral: 5,  ultimoMov: 'Hoy 09:14' },
      { id: 2, nombre: 'Aceite vegetal',        unidad: 'Litro', area: 'Cocina',   sede: 'Palmares',   stock: 12, umbral: 15, ultimoMov: 'Hoy 11:30' },
      { id: 3, nombre: 'Cloro',                  unidad: 'Litro', area: 'Limpieza', sede: 'Palmares',   stock: 2,  umbral: 8,  ultimoMov: 'Ayer 16:00' },
      { id: 4, nombre: 'Arroz',                  unidad: 'kg',    area: 'Cocina',   sede: 'Palmares',   stock: 45, umbral: 10, ultimoMov: 'Hoy 06:30' },
      { id: 5, nombre: 'Papel higiénico',        unidad: 'Rollo', area: 'Limpieza', sede: 'La Fortuna', stock: 25, umbral: 10, ultimoMov: 'Ayer 14:20' },
      { id: 6, nombre: 'Frijoles',               unidad: 'kg',    area: 'Cocina',   sede: 'La Fortuna', stock: 30, umbral: 8,  ultimoMov: 'Hace 2 días' },
      { id: 7, nombre: 'Jabón de manos',         unidad: 'Litro', area: 'Limpieza', sede: 'Jacó',       stock: 8,  umbral: 5,  ultimoMov: 'Hace 1 día' },
      { id: 8, nombre: 'Azúcar',                 unidad: 'kg',    area: 'Cocina',   sede: 'Jacó',       stock: 20, umbral: 10, ultimoMov: 'Hace 2 días' },
    ];

    state.movimientos = [
      { fecha: 'Hoy 09:14', insumo: 'Detergente multiusos', tipo: 'salida',  cantidad: 2,  responsable: 'Carlos Méndez',   ref: '' },
      { fecha: 'Hoy 11:30', insumo: 'Aceite vegetal',        tipo: 'salida',  cantidad: 3,  responsable: 'María González',   ref: '' },
      { fecha: 'Ayer 14:20', insumo: 'Papel higiénico',      tipo: 'entrada', cantidad: 20, responsable: 'Óscar Charpentier', ref: 'OC-2026-087' },
    ];

    const now = new Date();
    state.turnos = [];
    [-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].forEach(offset => {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const ds = fmtDate(d);
      state.empleados.slice(0,5).forEach(emp => {
        const libre = (d.getDay() === 0 && emp.id % 2 === 0);
        if (!libre) {
          state.turnos.push({ empId: emp.id, nombre: emp.nombre, sede: emp.sede, dia: ds, entrada: '07:00', salida: '15:00' });
        }
      });
    });

    state.auditLog = [
      { ts: fmtTs(new Date(Date.now()-1000*60*30)), usuario: 'Óscar Charpentier', accion: 'Actualizó stock de Detergente multiusos',     modulo: 'Inventario', icon: 'bi-box-seam', color: 'var(--info-lt)', tc: 'var(--info)' },
      { ts: fmtTs(new Date(Date.now()-1000*60*90)), usuario: 'Sebastián Navarro', accion: 'Asignó turno a Andrés Vargas — Viernes',       modulo: 'Horarios',   icon: 'bi-calendar3', color: 'var(--warning-lt)', tc: 'var(--warning)' },
      { ts: fmtTs(new Date(Date.now()-1000*60*180)), usuario: 'María González',   accion: 'Registró entrada a las 06:58',                 modulo: 'Checador',   icon: 'bi-clock', color: 'var(--success-lt)', tc: 'var(--success)' },
      { ts: fmtTs(new Date(Date.now()-1000*60*360)), usuario: 'Óscar Charpentier', accion: 'Creó empleado Laura Aguilar Brenes',          modulo: 'Empleados',  icon: 'bi-person-plus', color: 'var(--success-lt)', tc: 'var(--success)' },
    ];
  };

  /* ────────────────────────────────────────────────
     UTILIDADES
     ──────────────────────────────────────────────── */

  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const fmtTs   = (d) => d.toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' });
  const fmtTime = (d) => d.toTimeString().slice(0, 5);

  const uid = () => Date.now() + Math.floor(Math.random() * 1000);

  const toast = (msg, type = 'default') => {
    const icons = { default: 'bi-check-circle', success: 'bi-check-circle', error: 'bi-exclamation-circle', warning: 'bi-exclamation-triangle' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<i class="bi ${icons[type] || icons.default}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

  const addAudit = (accion, modulo) => {
    state.auditLog.unshift({
      ts: fmtTs(new Date()),
      usuario: state.user ? state.user.nombre : 'Sistema',
      accion,
      modulo,
      icon: 'bi-activity',
      color: 'var(--warm)',
      tc: 'var(--muted)',
    });
    renderAuditLog();
  };

  /* ────────────────────────────────────────────────
     AUTENTICACIÓN — HU-01, HU-02
     ──────────────────────────────────────────────── */

  const login = () => {
    const email  = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pwd    = document.getElementById('loginPwd').value;
    const branch = document.getElementById('loginBranch').value;

    document.getElementById('err-email').classList.remove('visible');
    document.getElementById('err-pwd').classList.remove('visible');
    document.getElementById('login-error').classList.remove('visible');

    if (!email) {
      document.getElementById('err-email').classList.add('visible');
      return;
    }
    if (!pwd) {
      document.getElementById('err-pwd').classList.add('visible');
      return;
    }

    const user = USUARIOS.find(u => u.email === email) ||
                 (email.endsWith('@hotelpalmares.cr') ? { email, rol: 'empleado', nombre: email.split('@')[0], initials: email[0].toUpperCase(), sede: branch } : null);

    if (!user) {
      document.getElementById('login-error').classList.add('visible');
      document.getElementById('login-error-msg').textContent = 'Correo no registrado en el sistema.';
      return;
    }

    state.user = { ...user, sede: branch || user.sede };
    state.currentBranch = state.user.sede;
    state.checadorStatus = 'libre';

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.add('visible');

    updateTopbar();
    applyRoleRestrictions();
    setupDates();
    navigate('dashboard', document.querySelector('.nav-item[data-page="dashboard"]'));
    startClock();
    addAudit(`Inicio de sesión — ${state.user.nombre}`, 'Autenticación');
    toast(`Bienvenido, ${state.user.nombre.split(' ')[0]}.`, 'success');
  };

  const logout = () => {
    if (!confirm('¿Desea cerrar sesión?')) return;
    addAudit(`Cierre de sesión — ${state.user.nombre}`, 'Autenticación');
    state.user = null;
    clearInterval(state.clockInterval);
    document.getElementById('app').classList.remove('visible');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('loginPwd').value = '';
    document.getElementById('loginEmail').value = '';
  };

  /* ────────────────────────────────────────────────
     RESTRICCIONES POR ROL — HU-03, HU-04
     ──────────────────────────────────────────────── */

  const applyRoleRestrictions = () => {
    const rol = state.user.rol;
    const permisos = ROL_PERMISOS[rol] || [];

    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      const page = btn.dataset.page;
      btn.style.display = permisos.includes(page) ? '' : 'none';
    });

    const navAdmin  = document.getElementById('nav-admin');
    const navSuper  = document.getElementById('nav-super-admin');

    if (rol === 'empleado') {
      navAdmin.style.display = 'none';
      navSuper.style.display = 'none';
    } else if (rol === 'supervisor') {
      navAdmin.style.display = '';
      navSuper.style.display = 'none';
    } else {
      navAdmin.style.display = '';
      navSuper.style.display = '';
    }

    document.getElementById('btn-nuevo-emp').style.display = rol === 'administrador' ? '' : 'none';
  };

  /* ────────────────────────────────────────────────
     NAVEGACIÓN
     ──────────────────────────────────────────────── */

  const PAGE_TITLES = {
    dashboard: 'Dashboard', checador: 'Reloj Checador',
    empleados: 'Empleados', horarios: 'Horarios',
    inventario: 'Inventario', reportes: 'Reportes',
    sucursales: 'Sucursales', roles: 'Roles y permisos',
  };

  const navigate = (page, btn) => {
    const rol = state.user ? state.user.rol : 'empleado';
    const permisos = ROL_PERMISOS[rol] || [];

    if (!permisos.includes(page)) {
      toast('No tienes permiso para acceder a esta sección.', 'error');
      return;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else {
      const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
      if (navBtn) navBtn.classList.add('active');
    }
    document.getElementById('topbar-title').textContent = PAGE_TITLES[page] || page;

    const renders = {
      dashboard:  renderDashboard,
      checador:   renderChecador,
      empleados:  renderEmpleados,
      horarios:   renderHorarios,
      inventario: renderInventario,
      reportes:   renderReportes,
      sucursales: renderSucursales,
      roles:      renderRoles,
    };
    if (renders[page]) renders[page]();
  };

  /* ────────────────────────────────────────────────
     TOPBAR
     ──────────────────────────────────────────────── */

  const updateTopbar = () => {
    const u = state.user;
    document.getElementById('topbar-avatar').textContent = u.initials;
    document.getElementById('topbar-name').textContent = u.nombre;
    const roleChip = document.getElementById('topbar-role');
    roleChip.textContent = u.rol.charAt(0).toUpperCase() + u.rol.slice(1);
    roleChip.className = `chip chip-${u.rol}`;

    const branchSel = document.getElementById('topbar-branch');
    branchSel.value = state.currentBranch;
    branchSel.disabled = u.rol === 'empleado';
  };

  const changeBranch = (branch) => {
    state.currentBranch = branch;
    addAudit(`Cambió vista a sede ${branch}`, 'Dashboard');
    renderDashboard();
    renderInventario();
  };

  /* ────────────────────────────────────────────────
     DASHBOARD — HU-19, HU-20
     ──────────────────────────────────────────────── */

  const renderDashboard = () => {
    const branch = state.currentBranch;
    document.getElementById('dash-branch-label').textContent = `Sede: ${branch}`;

    const branchEmps = state.empleados.filter(e => e.sede === branch);
    const asistHoy   = state.asistencias.filter(a => a.fecha === fmtDate(new Date()));
    const presentes  = asistHoy.filter(a => a.estado === 'activo').length;
    const pausas     = asistHoy.filter(a => a.estado === 'pausa').length;

    const branchInsumos = state.insumos.filter(i => i.sede === branch);
    const criticos      = branchInsumos.filter(i => i.stock <= i.umbral).length;
    const okPct         = branchInsumos.length
      ? Math.round(((branchInsumos.length - criticos) / branchInsumos.length) * 100)
      : 100;

    document.getElementById('dash-presentes').textContent = presentes;
    document.getElementById('dash-total-emp').textContent = `/${branchEmps.length}`;
    document.getElementById('dash-pausas').textContent = pausas;
    document.getElementById('dash-alertas').textContent = criticos;
    document.getElementById('dash-stock-ok').textContent = okPct;

    updateNavBadge(criticos);

    const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Hoy'];
    const vals = [9, 12, 11, 8, 13, 6, presentes || 12];
    const maxV = Math.max(...vals);
    const chartEl = document.getElementById('dash-barchart');
    const labelsEl = document.getElementById('dash-barlabels');
    chartEl.innerHTML = vals.map((v, i) =>
      `<div class="bar ${i === 6 ? 'today' : ''}" style="height:${Math.round((v/maxV)*100)}%" title="${days[i]}: ${v}"></div>`
    ).join('');
    labelsEl.innerHTML = days.map(d => `<span>${d}</span>`).join('');

    const personalList = document.getElementById('dash-personal-list');
    const activos = asistHoy.filter(a => ['activo','pausa'].includes(a.estado));
    if (activos.length === 0) {
      personalList.innerHTML = '<p class="text-sm text-muted">Sin personal activo.</p>';
    } else {
      personalList.innerHTML = activos.map(a => {
        const chip = a.estado === 'activo' ? 'chip-activo' : 'chip-pausa';
        const lbl  = a.estado === 'activo' ? 'Activo' : 'Pausa';
        return `<div class="d-flex align-center gap-12 mb-8" style="font-size:12px;">
          <span style="flex:1">${a.nombre}</span>
          <span class="text-muted">${a.entrada}</span>
          <span class="chip ${chip}">${lbl}</span>
        </div>`;
      }).join('');
    }

    const alertasList = document.getElementById('dash-alertas-list');
    const alertas = branchInsumos.filter(i => i.stock <= i.umbral);
    if (alertas.length === 0) {
      alertasList.innerHTML = '<p class="text-sm text-muted">Sin alertas de inventario.</p>';
    } else {
      alertasList.innerHTML = alertas.slice(0,3).map(i => {
        const pct = Math.round((i.stock / i.umbral) * 60);
        return `<div class="alert-strip">
          <i class="bi bi-exclamation-circle-fill"></i>
          <div style="flex:1">
            <div class="alert-strip-title">STOCK CRÍTICO — ${i.nombre} (${i.unidad})</div>
            <div class="alert-strip-sub">Sede ${i.sede} &middot; Área ${i.area} &middot; Stock: ${i.stock} &middot; Mínimo: ${i.umbral}</div>
            <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:var(--danger)"></div></div>
          </div>
        </div>`;
      }).join('');
    }

    document.getElementById('dash-mini-metrics').innerHTML = `
      <div class="col-6"><div class="metric-mini"><div class="metric-mini-val">${state.empleados.length}</div><div class="metric-mini-label">Empleados totales</div></div></div>
      <div class="col-6"><div class="metric-mini"><div class="metric-mini-val">${state.sucursales.length}</div><div class="metric-mini-label">Sucursales activas</div></div></div>
      <div class="col-6"><div class="metric-mini"><div class="metric-mini-val">${state.insumos.length}</div><div class="metric-mini-label">Insumos registrados</div></div></div>
      <div class="col-6"><div class="metric-mini"><div class="metric-mini-val">${state.movimientos.length}</div><div class="metric-mini-label">Movimientos hoy</div></div></div>
    `;
  };

  const updateNavBadge = (count) => {
    const badge = document.getElementById('badge-inventario');
    if (count > 0) {
      badge.textContent = count;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  };

  /* ────────────────────────────────────────────────
     RELOJ CHECADOR — HU-09, HU-10, HU-11
     ──────────────────────────────────────────────── */

  const startClock = () => {
    if (state.clockInterval) clearInterval(state.clockInterval);
    state.clockInterval = setInterval(tickClock, 1000);
    tickClock();
  };

  const tickClock = () => {
    const now = new Date();
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    if (!timeEl) return;
    timeEl.textContent = now.toTimeString().slice(0, 8);
    const ds = now.toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    dateEl.textContent = ds.charAt(0).toUpperCase() + ds.slice(1);
  };

  const renderChecador = () => {
    const u = state.user;
    document.getElementById('clock-user-info').innerHTML =
      `<span><strong>Empleado:</strong> ${u.nombre}</span>
       <span><strong>Sede:</strong> ${u.sede}</span>
       <span><strong>Rol:</strong> ${u.rol}</span>`;

    updateChecadorUI();
    renderWeekGrid();
    renderTurnoTable();
    renderClockLog();
  };

  const updateChecadorUI = () => {
    const statusEl = document.getElementById('checador-status-chip');
    const btnEntrada = document.getElementById('btn-entrada');
    const btnPausa   = document.getElementById('btn-pausa');
    const btnSalida  = document.getElementById('btn-salida');

    if (!statusEl) return;

    const statusMap = {
      libre:   { chip: 'chip-pendiente', label: 'Sin turno activo' },
      activo:  { chip: 'chip-activo',    label: `Turno activo desde ${state.checadorEntrada}` },
      pausa:   { chip: 'chip-pausa',     label: 'En pausa' },
      cerrado: { chip: 'chip-ok',        label: `Turno cerrado` },
    };
    const s = statusMap[state.checadorStatus] || statusMap.libre;
    statusEl.innerHTML = `<span class="chip ${s.chip}">${s.label}</span>`;

    btnEntrada.disabled = state.checadorStatus !== 'libre';
    btnPausa.disabled   = !['activo','pausa'].includes(state.checadorStatus);
    btnSalida.disabled  = !['activo','pausa'].includes(state.checadorStatus);

    if (state.checadorStatus === 'pausa') {
      btnPausa.innerHTML = '<i class="bi bi-play"></i> Reanudar';
    } else {
      btnPausa.innerHTML = '<i class="bi bi-pause"></i> Pausa';
    }
  };

  const checadorAction = (type) => {
    const now     = new Date();
    const nowStr  = fmtTime(now);
    const hoy     = fmtDate(now);

    let msg = '';

    if (type === 'entrada') {
      if (state.checadorStatus !== 'libre') {
        toast('Ya tienes una entrada activa.', 'warning');
        return;
      }
      state.checadorStatus  = 'activo';
      state.checadorEntrada = nowStr;
      msg = `Entrada registrada a las ${nowStr}`;
      addClockLogEntry('entrada', nowStr, 'var(--success)');
      updateAsistencia({ empId: -1, nombre: state.user.nombre, fecha: hoy, entrada: nowStr, pausa: 0, salida: '', estado: 'activo' });
      addAudit(`Registró entrada a las ${nowStr}`, 'Checador');
      toast(`Entrada registrada correctamente a las ${nowStr}.`, 'success');
    }

    if (type === 'pausa') {
      if (state.checadorStatus === 'activo') {
        state.checadorStatus = 'pausa';
        state.checadorPausaInicio = now;
        addClockLogEntry('pausa iniciada', nowStr, 'var(--warning)');
        toast('Pausa iniciada.', 'warning');
      } else if (state.checadorStatus === 'pausa') {
        const mins = Math.round((now - state.checadorPausaInicio) / 60000);
        state.checadorPausaTotal += mins;
        state.checadorStatus = 'activo';
        addClockLogEntry(`pausa finalizada (${mins} min)`, nowStr, 'var(--success)');
        toast(`Pausa finalizada — ${mins} min.`, 'success');
      }
      addAudit(`Registró ${type} a las ${nowStr}`, 'Checador');
    }

    if (type === 'salida') {
      if (!['activo','pausa'].includes(state.checadorStatus)) return;
      const entradaMins = timeToMins(state.checadorEntrada);
      const salidaMins  = timeToMins(nowStr);
      const efectivos   = salidaMins - entradaMins - state.checadorPausaTotal;
      const hrs  = Math.floor(efectivos / 60);
      const mins = efectivos % 60;
      state.checadorStatus = 'cerrado';
      addClockLogEntry(`Salida — horas efectivas: ${hrs}h ${mins}min`, nowStr, 'var(--muted)');
      addAudit(`Registró salida a las ${nowStr}. Horas efectivas: ${hrs}h ${mins}min`, 'Checador');
      toast(`Salida registrada. Horas efectivas: ${hrs}h ${mins}min.`, 'success');
    }

    updateChecadorUI();
  };

  const timeToMins = (str) => {
    if (!str) return 0;
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };

  const addClockLogEntry = (label, time, color) => {
    state.clockLogEntries.push({ label, time, color });
    renderClockLog();
  };

  const renderClockLog = () => {
    const el = document.getElementById('clock-log');
    if (!el) return;
    if (state.clockLogEntries.length === 0) {
      el.innerHTML = '<p class="text-sm text-muted text-center" style="padding:16px 0;">Sin registros hoy.</p>';
      return;
    }
    el.innerHTML = state.clockLogEntries.map(e =>
      `<div class="d-flex align-center gap-12" style="padding:8px 0;border-bottom:1px solid var(--warm);font-size:13px;">
        <span style="flex:1;text-transform:capitalize;">${e.label}</span>
        <span style="font-weight:500;color:${e.color}">${e.time}</span>
      </div>`
    ).join('');
  };

  const updateAsistencia = (entry) => {
    const idx = state.asistencias.findIndex(a => a.empId === entry.empId && a.fecha === entry.fecha);
    if (idx >= 0) Object.assign(state.asistencias[idx], entry);
    else state.asistencias.push(entry);
    renderTurnoTable();
  };

  const renderWeekGrid = () => {
    const el = document.getElementById('week-grid');
    if (!el) return;
    const today = new Date();
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const html = [];

    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const ds = fmtDate(d);
      const isToday = i === 0;
      const turno = state.turnos.find(t => t.empId === (state.user ? state.user.id || 1 : 1) && t.dia === ds)
        || state.turnos.find(t => t.dia === ds);

      html.push(`<div class="week-day ${isToday ? 'today' : ''}">
        <div class="week-day-name">${dayNames[d.getDay()]}</div>
        <div class="week-day-num">${d.getDate()}</div>
        ${turno
          ? `<div class="week-day-shift chip chip-info" style="font-size:10px;">${turno.entrada.slice(0,5)}–${turno.salida.slice(0,5)}</div>`
          : `<div class="week-day-shift chip chip-pendiente" style="font-size:10px;">Libre</div>`}
      </div>`);
    }
    el.innerHTML = html.join('');
  };

  const renderTurnoTable = () => {
    const tbody = document.getElementById('turno-tbody');
    if (!tbody) return;
    const hoy = fmtDate(new Date());
    const asist = state.asistencias.filter(a => a.fecha === hoy);

    if (asist.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Sin registros de asistencia hoy.</td></tr>`;
      return;
    }

    tbody.innerHTML = asist.map(a => {
      const chipClass = { activo: 'chip-activo', pausa: 'chip-pausa', cerrado: 'chip-ok' }[a.estado] || 'chip-pendiente';
      const chipLabel = { activo: 'Activo', pausa: 'En pausa', cerrado: 'Cerrado' }[a.estado] || a.estado;
      return `<tr>
        <td>${a.nombre}</td>
        <td class="text-muted">—</td>
        <td>${a.entrada}</td>
        <td><span class="chip ${chipClass}">${chipLabel}</span></td>
      </tr>`;
    }).join('');
  };

  /* ────────────────────────────────────────────────
     EMPLEADOS — HU-05, HU-06, HU-07, HU-08
     ──────────────────────────────────────────────── */

  const renderEmpleados = () => filterEmpleados();

  const filterEmpleados = () => {
    const search = (document.getElementById('emp-search')?.value || '').toLowerCase();
    const sede   = document.getElementById('emp-filter-sede')?.value || '';
    const rol    = document.getElementById('emp-filter-rol')?.value || '';
    const area   = document.getElementById('emp-filter-area')?.value || '';

    let list = state.empleados.filter(e =>
      (!search || e.nombre.toLowerCase().includes(search) || e.cedula.includes(search)) &&
      (!sede || e.sede === sede) &&
      (!rol  || e.rol  === rol)  &&
      (!area || e.area === area)
    );

    const tbody = document.getElementById('emp-tbody');
    if (!tbody) return;

    document.getElementById('emp-count').textContent = `${list.length} de ${state.empleados.length} empleados`;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Sin resultados.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(e => `
      <tr>
        <td><span class="fw-500">${e.nombre}</span></td>
        <td class="text-sm text-muted">${e.cedula}</td>
        <td>${e.area}</td>
        <td>${e.sede}</td>
        <td><span class="chip chip-${e.rol}">${e.rol.charAt(0).toUpperCase()+e.rol.slice(1)}</span></td>
        <td><span class="chip chip-${e.estado}">${e.estado.charAt(0).toUpperCase()+e.estado.slice(1)}</span></td>
        <td>
          <div class="d-flex gap-8">
            <button class="btn btn-outline btn-sm" onclick="App.openEmpleadoModal(${e.id})">Editar</button>
            <button class="btn btn-ghost btn-sm" onclick="App.toggleEmpleado(${e.id})" title="${e.estado === 'activo' ? 'Desactivar' : 'Activar'}">
              <i class="bi bi-${e.estado === 'activo' ? 'person-dash' : 'person-check'}"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  };

  const openEmpleadoModal = (id = null) => {
    state.empEditId = id;
    document.getElementById('emp-modal-title').textContent = id ? 'Editar empleado' : 'Nuevo empleado';
    document.getElementById('emp-estado-wrap').style.display = id ? '' : 'none';
    document.getElementById('err-emp-nombre').classList.remove('visible');
    document.getElementById('err-emp-cedula').classList.remove('visible');

    if (id) {
      const e = state.empleados.find(x => x.id === id);
      if (!e) return;
      document.getElementById('emp-id').value      = e.id;
      document.getElementById('emp-nombre').value  = e.nombre;
      document.getElementById('emp-cedula').value  = e.cedula;
      document.getElementById('emp-email').value   = e.email;
      document.getElementById('emp-area').value    = e.area;
      document.getElementById('emp-sede').value    = e.sede;
      document.getElementById('emp-rol').value     = e.rol;
      document.getElementById('emp-estado').value  = e.estado;
    } else {
      ['emp-nombre','emp-cedula','emp-email'].forEach(fid => { document.getElementById(fid).value = ''; });
      document.getElementById('emp-area').value   = 'Cocina';
      document.getElementById('emp-sede').value   = state.currentBranch;
      document.getElementById('emp-rol').value    = 'empleado';
    }
    openModal('modal-empleado');
  };

  const saveEmpleado = () => {
    const nombre = document.getElementById('emp-nombre').value.trim();
    const cedula = document.getElementById('emp-cedula').value.trim();
    const email  = document.getElementById('emp-email').value.trim();
    const area   = document.getElementById('emp-area').value;
    const sede   = document.getElementById('emp-sede').value;
    const rol    = document.getElementById('emp-rol').value;
    const estado = document.getElementById('emp-estado').value || 'activo';

    let valid = true;
    if (!nombre) { document.getElementById('err-emp-nombre').classList.add('visible'); valid = false; }

    const dupCedula = state.empleados.find(e => e.cedula === cedula && e.id !== state.empEditId);
    if (dupCedula) { document.getElementById('err-emp-cedula').classList.add('visible'); valid = false; }
    if (!valid) return;

    if (state.empEditId) {
      const idx = state.empleados.findIndex(e => e.id === state.empEditId);
      if (idx >= 0) Object.assign(state.empleados[idx], { nombre, cedula, email, area, sede, rol, estado });
      addAudit(`Editó empleado ${nombre}`, 'Empleados');
      toast('Empleado actualizado.', 'success');
    } else {
      const newEmp = { id: uid(), nombre, cedula, email, area, sede, rol, estado };
      state.empleados.push(newEmp);
      addAudit(`Registró nuevo empleado: ${nombre} — Cédula ${cedula} — Sede ${sede} — Rol ${rol}`, 'Empleados');
      toast(`Empleado ${nombre} registrado. Credenciales generadas.`, 'success');
    }

    closeModal('modal-empleado');
    filterEmpleados();
  };

  const toggleEmpleado = (id) => {
    const emp = state.empleados.find(e => e.id === id);
    if (!emp) return;
    emp.estado = emp.estado === 'activo' ? 'inactivo' : 'activo';
    addAudit(`${emp.estado === 'activo' ? 'Activó' : 'Desactivó'} al empleado ${emp.nombre}`, 'Empleados');
    toast(`${emp.nombre} marcado como ${emp.estado}.`, 'success');
    filterEmpleados();
  };

  /* ────────────────────────────────────────────────
     HORARIOS — HU-12, HU-13
     ──────────────────────────────────────────────── */

  const renderHorarios = () => {
    const sede = document.getElementById('hor-filter-sede')?.value || 'Palmares';
    const emps = state.empleados.filter(e => e.sede === sede);
    const today = new Date();
    const days = [];
    for (let i = -2; i <= 4; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push({ date: fmtDate(d), label: d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' }) });
    }

    const thead = document.getElementById('hor-thead');
    const tbody = document.getElementById('hor-tbody');
    if (!thead || !tbody) return;

    thead.innerHTML = `<tr><th>Empleado</th><th>Área</th>${days.map(d => `<th style="white-space:nowrap;">${d.label}</th>`).join('')}</tr>`;

    tbody.innerHTML = emps.map(emp =>
      `<tr>
        <td class="fw-500">${emp.nombre}</td>
        <td class="text-sm text-muted">${emp.area}</td>
        ${days.map(d => {
          const t = state.turnos.find(tt => tt.empId === emp.id && tt.dia === d.date);
          return `<td class="text-sm">${t ? `<span class="chip chip-info" style="font-size:10px;">${t.entrada.slice(0,5)}–${t.salida.slice(0,5)}</span>` : '<span class="text-muted">—</span>'}</td>`;
        }).join('')}
      </tr>`
    ).join('');

    renderAsistencias();
  };

  const renderAsistencias = () => {
    const tbody = document.getElementById('asist-tbody');
    if (!tbody) return;
    const hoy = fmtDate(new Date());

    if (state.asistencias.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Sin registros de asistencia.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.asistencias.map(a => {
      const efectivas = a.salida ? calcHorasEfectivas(a.entrada, a.salida, a.pausa) : '—';
      const chip = { activo: 'chip-activo', pausa: 'chip-pausa', cerrado: 'chip-ok' }[a.estado] || 'chip-pendiente';
      return `<tr>
        <td>${a.nombre}</td>
        <td class="text-sm text-muted">${a.fecha}</td>
        <td>${a.entrada}</td>
        <td>${a.pausa}</td>
        <td>${a.salida || '—'}</td>
        <td>${efectivas}</td>
        <td><span class="chip ${chip}">${a.estado}</span></td>
      </tr>`;
    }).join('');
  };

  const calcHorasEfectivas = (entrada, salida, pausaMins) => {
    const mins = timeToMins(salida) - timeToMins(entrada) - (pausaMins || 0);
    return `${Math.floor(mins/60)}h ${mins%60}min`;
  };

  const openTurnoModal = () => {
    const empSelect = document.getElementById('turno-emp');
    empSelect.innerHTML = state.empleados.map(e => `<option value="${e.id}">${e.nombre} — ${e.sede}</option>`).join('');
    document.getElementById('turno-dia').value = fmtDate(new Date());
    openModal('modal-turno');
  };

  const saveTurno = () => {
    const empId   = Number(document.getElementById('turno-emp').value);
    const dia     = document.getElementById('turno-dia').value;
    const entrada = document.getElementById('turno-entrada').value;
    const salida  = document.getElementById('turno-salida').value;
    const emp     = state.empleados.find(e => e.id === empId);
    if (!emp || !dia) { toast('Complete todos los campos.', 'error'); return; }

    const idx = state.turnos.findIndex(t => t.empId === empId && t.dia === dia);
    const turno = { empId, nombre: emp.nombre, sede: emp.sede, dia, entrada, salida };
    if (idx >= 0) state.turnos[idx] = turno;
    else state.turnos.push(turno);

    addAudit(`Asignó turno a ${emp.nombre} — ${dia} ${entrada}–${salida}`, 'Horarios');
    toast(`Turno asignado a ${emp.nombre}.`, 'success');
    closeModal('modal-turno');
    renderHorarios();
  };

  /* ────────────────────────────────────────────────
     INVENTARIO — HU-14, HU-15, HU-16, HU-17
     ──────────────────────────────────────────────── */

  const renderInventario = () => {
    renderAlertasCriticas();
    filterInventario();
    renderMovimientos();
  };

  const renderAlertasCriticas = () => {
    const el = document.getElementById('inv-alertas');
    if (!el) return;
    const criticos = state.insumos.filter(i => i.stock <= i.umbral);
    if (criticos.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = criticos.map(i => {
      const pct = Math.min(Math.round((i.stock / (i.umbral * 2)) * 100), 100);
      return `<div class="alert-strip">
        <i class="bi bi-exclamation-circle-fill"></i>
        <div style="flex:1">
          <div class="alert-strip-title">STOCK CRÍTICO — ${i.nombre} (${i.unidad})</div>
          <div class="alert-strip-sub">Sede ${i.sede} &middot; ${i.area} &middot; Stock: ${i.stock} &middot; Mínimo: ${i.umbral}</div>
          <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:var(--danger)"></div></div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="App.openInsumoModal(${i.id})" style="flex-shrink:0;">Editar umbral</button>
      </div>`;
    }).join('');
  };

  const filterInventario = () => {
    const area   = document.getElementById('inv-filter-area')?.value || '';
    const sede   = document.getElementById('inv-filter-sede')?.value || '';
    const search = (document.getElementById('inv-search')?.value || '').toLowerCase();

    const list = state.insumos.filter(i =>
      (!area   || i.area === area) &&
      (!sede   || i.sede === sede) &&
      (!search || i.nombre.toLowerCase().includes(search))
    );

    const tbody = document.getElementById('inv-tbody');
    if (!tbody) return;
    document.getElementById('inv-count').textContent = `${list.length} insumos`;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Sin insumos.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(i => {
      const critico = i.stock <= i.umbral;
      const chipClass = critico ? 'chip-critico' : 'chip-ok';
      const chipLabel = critico ? 'Crítico' : 'Normal';
      const pct = Math.min(Math.round((i.stock / (i.umbral * 2)) * 100), 100);
      return `<tr>
        <td class="fw-500">${i.nombre}</td>
        <td>${i.area}</td>
        <td>${i.sede}</td>
        <td>
          <div class="d-flex align-center gap-8">
            <span class="stock-number">${i.stock}</span>
            <div style="flex:1;min-width:60px;">
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width:${pct}%;background:${critico ? 'var(--danger)' : 'var(--success)'}"></div>
              </div>
            </div>
          </div>
        </td>
        <td class="text-sm text-muted">${i.umbral}</td>
        <td class="text-sm">${i.unidad}</td>
        <td class="text-xs text-muted">${i.ultimoMov}</td>
        <td><span class="chip ${chipClass}">${chipLabel}</span></td>
        <td>
          <div class="d-flex gap-8">
            <button class="btn btn-outline btn-sm" onclick="App.openInsumoModal(${i.id})">Editar</button>
            <button class="btn btn-ghost btn-sm" onclick="App.openMovimientoModal(${i.id})"><i class="bi bi-arrow-left-right"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  };

  const openInsumoModal = (id = null) => {
    state.insumoEditId = id;
    document.getElementById('insumo-modal-title').textContent = id ? 'Editar insumo' : 'Nuevo insumo';
    if (id) {
      const i = state.insumos.find(x => x.id === id);
      if (!i) return;
      document.getElementById('insumo-id').value     = i.id;
      document.getElementById('insumo-nombre').value = i.nombre;
      document.getElementById('insumo-unidad').value = i.unidad;
      document.getElementById('insumo-area').value   = i.area;
      document.getElementById('insumo-sede').value   = i.sede;
      document.getElementById('insumo-stock').value  = i.stock;
      document.getElementById('insumo-umbral').value = i.umbral;
    } else {
      ['insumo-nombre','insumo-stock','insumo-umbral'].forEach(fid => { document.getElementById(fid).value = ''; });
      document.getElementById('insumo-umbral').value = 5;
      document.getElementById('insumo-sede').value   = state.currentBranch;
    }
    openModal('modal-insumo');
  };

  const saveInsumo = () => {
    const nombre = document.getElementById('insumo-nombre').value.trim();
    const unidad = document.getElementById('insumo-unidad').value;
    const area   = document.getElementById('insumo-area').value;
    const sede   = document.getElementById('insumo-sede').value;
    const stock  = Number(document.getElementById('insumo-stock').value);
    const umbral = Number(document.getElementById('insumo-umbral').value);

    if (!nombre) { toast('El nombre es requerido.', 'error'); return; }

    if (state.insumoEditId) {
      const idx = state.insumos.findIndex(i => i.id === state.insumoEditId);
      if (idx >= 0) {
        Object.assign(state.insumos[idx], { nombre, unidad, area, sede, stock, umbral, ultimoMov: 'Ahora' });
        if (stock <= umbral) {
          toast(`Alerta: ${nombre} en stock crítico (${stock}/${umbral} ${unidad}).`, 'warning');
        }
      }
      addAudit(`Actualizó insumo ${nombre} — umbral: ${umbral} — stock: ${stock}`, 'Inventario');
      toast('Insumo actualizado.', 'success');
    } else {
      state.insumos.push({ id: uid(), nombre, unidad, area, sede, stock, umbral, ultimoMov: 'Ahora' });
      addAudit(`Registró nuevo insumo: ${nombre} — ${area} — ${sede}`, 'Inventario');
      toast(`Insumo ${nombre} registrado.`, 'success');
    }

    closeModal('modal-insumo');
    renderInventario();
    updateNavBadge(state.insumos.filter(i => i.stock <= i.umbral).length);
  };

  const openMovimientoModal = (insumoId = null) => {
    const select = document.getElementById('mov-insumo');
    select.innerHTML = state.insumos.map(i =>
      `<option value="${i.id}" ${i.id === insumoId ? 'selected' : ''}>${i.nombre} — ${i.sede} (Stock: ${i.stock})</option>`
    ).join('');
    document.getElementById('mov-cantidad').value = 1;
    document.getElementById('mov-ref').value = '';
    openModal('modal-movimiento');
  };

  const saveMovimiento = () => {
    const insumoId = Number(document.getElementById('mov-insumo').value);
    const tipo     = document.getElementById('mov-tipo').value;
    const cantidad = Number(document.getElementById('mov-cantidad').value);
    const ref      = document.getElementById('mov-ref').value.trim();

    if (cantidad <= 0) { toast('La cantidad debe ser mayor a 0.', 'error'); return; }

    const insumo = state.insumos.find(i => i.id === insumoId);
    if (!insumo) return;

    if (tipo === 'salida' && cantidad > insumo.stock) {
      toast(`Stock insuficiente. Disponible: ${insumo.stock} ${insumo.unidad}.`, 'error');
      return;
    }

    insumo.stock += tipo === 'entrada' ? cantidad : -cantidad;
    insumo.ultimoMov = 'Ahora';

    state.movimientos.unshift({
      fecha: fmtTs(new Date()),
      insumo: insumo.nombre,
      tipo,
      cantidad,
      responsable: state.user.nombre,
      ref: ref || '—',
    });

    if (insumo.stock <= insumo.umbral) {
      toast(`Alerta automática: ${insumo.nombre} alcanzó stock crítico (${insumo.stock}/${insumo.umbral}).`, 'warning');
    }

    addAudit(`Registró ${tipo} de ${cantidad} ${insumo.unidad} de ${insumo.nombre}${ref ? ` — Ref: ${ref}` : ''}`, 'Inventario');
    toast(`Movimiento registrado. Nuevo stock: ${insumo.stock} ${insumo.unidad}.`, 'success');
    closeModal('modal-movimiento');
    renderInventario();
    updateNavBadge(state.insumos.filter(i => i.stock <= i.umbral).length);
  };

  const renderMovimientos = () => {
    const tbody = document.getElementById('mov-tbody');
    if (!tbody) return;
    if (state.movimientos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Sin movimientos.</td></tr>`;
      return;
    }
    tbody.innerHTML = state.movimientos.map(m => {
      const chip = m.tipo === 'entrada' ? 'chip-ok' : 'chip-pausa';
      return `<tr>
        <td class="text-sm text-muted">${m.fecha}</td>
        <td>${m.insumo}</td>
        <td><span class="chip ${chip}">${m.tipo.charAt(0).toUpperCase()+m.tipo.slice(1)}</span></td>
        <td>${m.cantidad}</td>
        <td>${m.responsable}</td>
        <td class="text-sm text-muted">${m.ref}</td>
      </tr>`;
    }).join('');
  };

  /* ────────────────────────────────────────────────
     REPORTES — HU-21, HU-22, HU-26
     ──────────────────────────────────────────────── */

  const setupDates = () => {
    const now = new Date();
    const hoy = fmtDate(now);
    const primerDia = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const desdeEl = document.getElementById('rep-asist-desde');
    const hastaEl = document.getElementById('rep-asist-hasta');
    const mesEl   = document.getElementById('rep-inv-mes');
    if (desdeEl) desdeEl.value = primerDia;
    if (hastaEl) hastaEl.value = hoy;
    if (mesEl)   mesEl.value   = mesActual;
  };

  const renderReportes = () => {
    renderAuditLog();
  };

  const generarReporte = (tipo, formato) => {
    const startTs = Date.now();
    toast('Generando reporte...', 'default');
    setTimeout(() => {
      const elapsed = Date.now() - startTs;
      const nombre = tipo === 'asistencia'
        ? `Asistencia_${document.getElementById('rep-asist-sede').value}_${document.getElementById('rep-asist-desde').value}_a_${document.getElementById('rep-asist-hasta').value}.${formato}`
        : `Inventario_${document.getElementById('rep-inv-sede').value}_${document.getElementById('rep-inv-mes').value}.${formato}`;

      addAudit(`Exportó reporte de ${tipo} en ${formato.toUpperCase()} — ${nombre}`, 'Reportes');
      toast(`Reporte generado: ${nombre} (${elapsed}ms < 30s).`, 'success');
    }, 800);
  };

  const renderAuditLog = () => {
    const el = document.getElementById('audit-log');
    if (!el) return;
    if (state.auditLog.length === 0) {
      el.innerHTML = '<p class="text-sm text-muted">Sin registros.</p>';
      return;
    }
    el.innerHTML = state.auditLog.slice(0, 20).map(entry =>
      `<div class="log-entry">
        <span class="log-time">${entry.ts}</span>
        <div class="log-icon" style="background:${entry.color};color:${entry.tc};">
          <i class="bi ${entry.icon}" style="font-size:12px;"></i>
        </div>
        <div style="flex:1;">
          <div style="font-size:13px;">${entry.accion}</div>
          <div class="text-xs text-muted">${entry.usuario} &middot; ${entry.modulo}</div>
        </div>
      </div>`
    ).join('');
  };

  /* ────────────────────────────────────────────────
     SUCURSALES — HU-23, HU-24
     ──────────────────────────────────────────────── */

  const renderSucursales = () => {
    const grid = document.getElementById('branches-grid');
    if (!grid) return;

    grid.innerHTML = state.sucursales.map(s => {
      const emps = state.empleados.filter(e => e.sede === s.nombre);
      const presentes = state.asistencias.filter(a => a.fecha === fmtDate(new Date()) && a.estado === 'activo').length;
      const isActive = s.nombre === state.currentBranch;
      return `<div class="col-md-4">
        <div class="branch-card ${isActive ? 'active-branch' : ''}">
          <div class="branch-icon"><i class="bi bi-building"></i></div>
          <div class="branch-name">${s.nombre}</div>
          <div class="text-sm text-muted mb-12">${s.provincia} &middot; ${s.desc}</div>
          <div class="row g-2 mb-12" style="font-size:12px;">
            <div class="col-6"><div class="metric-mini"><div class="metric-mini-val">${emps.length}</div><div class="metric-mini-label">Empleados</div></div></div>
            <div class="col-6"><div class="metric-mini"><div class="metric-mini-val">${presentes}</div><div class="metric-mini-label">Presentes</div></div></div>
          </div>
          ${isActive ? '<span class="chip chip-activo">Sede activa</span>' : `<button class="btn btn-outline btn-sm" onclick="App.setActiveBranch('${s.nombre}')">Cambiar a esta sede</button>`}
        </div>
      </div>`;
    }).join('');

    renderConsolidado();
  };

  const setActiveBranch = (nombre) => {
    state.currentBranch = nombre;
    document.getElementById('topbar-branch').value = nombre;
    addAudit(`Cambió sede activa a ${nombre}`, 'Sucursales');
    renderSucursales();
    renderDashboard();
  };

  const renderConsolidado = () => {
    const tbody = document.getElementById('consolidado-tbody');
    if (!tbody) return;
    const hoy = fmtDate(new Date());
    tbody.innerHTML = state.sucursales.map(s => {
      const emps      = state.empleados.filter(e => e.sede === s.nombre);
      const presentes = state.asistencias.filter(a => a.fecha === hoy && a.estado === 'activo').length;
      const insCrit   = state.insumos.filter(i => i.sede === s.nombre && i.stock <= i.umbral).length;
      const insOk     = state.insumos.filter(i => i.sede === s.nombre && i.stock > i.umbral).length;
      const estado    = insCrit === 0 ? 'chip-ok' : insCrit <= 2 ? 'chip-pausa' : 'chip-critico';
      const estadoLbl = insCrit === 0 ? 'Normal' : insCrit <= 2 ? 'Atención' : 'Crítico';
      return `<tr>
        <td class="fw-500">${s.nombre}</td>
        <td>${emps.length}</td>
        <td>${presentes}</td>
        <td>${insCrit > 0 ? `<span class="chip chip-critico">${insCrit}</span>` : '0'}</td>
        <td>${insOk}</td>
        <td><span class="chip ${estado}">${estadoLbl}</span></td>
      </tr>`;
    }).join('');
  };

  const openSucursalModal = () => {
    document.getElementById('suc-nombre').value   = '';
    document.getElementById('suc-desc').value     = '';
    openModal('modal-sucursal');
  };

  const saveSucursal = () => {
    const nombre   = document.getElementById('suc-nombre').value.trim();
    const provincia = document.getElementById('suc-provincia').value;
    const desc     = document.getElementById('suc-desc').value.trim();
    if (!nombre) { toast('El nombre es requerido.', 'error'); return; }
    if (state.sucursales.find(s => s.nombre === nombre)) { toast('Esa sucursal ya existe.', 'warning'); return; }
    state.sucursales.push({ id: uid(), nombre, provincia, desc: desc || 'Nueva sede', tipo: 'Sucursal' });

    const topSel = document.getElementById('topbar-branch');
    topSel.innerHTML += `<option value="${nombre}">${nombre}</option>`;
    const horSel = document.getElementById('hor-filter-sede');
    if (horSel) horSel.innerHTML += `<option value="${nombre}">${nombre}</option>`;

    addAudit(`Creó nueva sucursal: ${nombre} — ${provincia}`, 'Sucursales');
    toast(`Sucursal ${nombre} creada.`, 'success');
    closeModal('modal-sucursal');
    renderSucursales();
  };

  /* ────────────────────────────────────────────────
     ROLES Y PERMISOS — HU-03, HU-04
     ──────────────────────────────────────────────── */

  const renderRoles = () => {
    const tbody = document.getElementById('roles-tbody');
    if (!tbody) return;
    tbody.innerHTML = state.empleados.map(e =>
      `<tr>
        <td class="fw-500">${e.nombre}</td>
        <td class="text-sm text-muted">${e.email}</td>
        <td>${e.sede}</td>
        <td><span class="chip chip-${e.rol}">${e.rol.charAt(0).toUpperCase()+e.rol.slice(1)}</span></td>
        <td>
          <select class="form-select" onchange="App.changeRol(${e.id}, this.value)" ${state.user && state.user.rol !== 'administrador' ? 'disabled' : ''}>
            <option value="empleado"      ${e.rol === 'empleado'      ? 'selected' : ''}>Empleado</option>
            <option value="supervisor"    ${e.rol === 'supervisor'    ? 'selected' : ''}>Supervisor</option>
            <option value="administrador" ${e.rol === 'administrador' ? 'selected' : ''}>Administrador</option>
          </select>
        </td>
      </tr>`
    ).join('');
  };

  const changeRol = (id, nuevoRol) => {
    const emp = state.empleados.find(e => e.id === id);
    if (!emp) return;
    const rolAnterior = emp.rol;
    emp.rol = nuevoRol;
    addAudit(`Cambió rol de ${emp.nombre} de ${rolAnterior} a ${nuevoRol}`, 'Roles');
    toast(`Rol de ${emp.nombre} actualizado a ${nuevoRol}.`, 'success');
    renderRoles();
  };

  /* ────────────────────────────────────────────────
     MODAL UTILITIES
     ──────────────────────────────────────────────── */

  const openModal = (id) => {
    document.getElementById(id).classList.add('open');
  };

  const closeModal = (id) => {
    document.getElementById(id).classList.remove('open');
  };

  const closeOnBackdrop = (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      e.target.classList.remove('open');
    }
  };

  /* ────────────────────────────────────────────────
     INIT
     ──────────────────────────────────────────────── */

  const init = () => {
    initData();
    document.querySelectorAll('.modal-backdrop').forEach(m => {
      m.addEventListener('click', closeOnBackdrop);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
      }
    });
  };

  init();

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
