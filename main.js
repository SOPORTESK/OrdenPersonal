// ==========================================
// THEME MANAGEMENT (Light / Dark)
// ==========================================
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const iconLight = document.getElementById('theme-icon-light');
  const iconDark = document.getElementById('theme-icon-dark');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function updateThemeUI(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if(iconLight) iconLight.style.display = 'none';
      if(iconDark) iconDark.style.display = 'block';
      if(themeMeta) themeMeta.setAttribute('content', '#0a0a0f');
    } else {
      document.documentElement.removeAttribute('data-theme');
      if(iconLight) iconLight.style.display = 'block';
      if(iconDark) iconDark.style.display = 'none';
      if(themeMeta) themeMeta.setAttribute('content', '#f4f4f5');
    }
  }

  // Initialize UI
  updateThemeUI(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.hasAttribute('data-theme');
      const newTheme = isDark ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      updateThemeUI(newTheme);
    });
  }
});

// Inicializar Supabase (usando el CDN global) - con protección anti-crash
const supabaseUrl = 'https://rjubbjhilulctbqsjxuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdWJiamhpbHVsY3RicXNqeHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjQ3ODQsImV4cCI6MjA5NTkwMDc4NH0.h7QSxgylv4Hzwg8uho5qsWtzJ8IrZTNjUSixBavL9hQ';
let supabaseClient = null;
try {
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn('Supabase CDN no cargó. Las funciones de base de datos estarán deshabilitadas.');
  }
} catch (e) {
  console.warn('Error inicializando Supabase:', e);
}

function initApp() {
  // Restaurar sesión de administrador persistente en este dispositivo
  try {
    const savedSession = localStorage.getItem('sekunet_admin_session');
    if (savedSession) {
      window.currentUserData = JSON.parse(savedSession);
    }
  } catch(e) {
    console.warn('Error al restaurar sesión previa:', e);
  }

  // ==========================================
  // ACCESO AL PANEL DE ADMINISTRACIÓN
  // ==========================================
  const wizardLogo = document.querySelector('.wizard-header img');
  const btnOpenAdminQuick = document.getElementById('btn-open-admin-quick');
  let clickCount = 0;
  let clickTimer;

  function openAdminLoginOrDashboard() {
    if (window.currentUserData && window.currentUserData.email) {
      finishLogin();
      loadDashboardData();
    } else {
      document.getElementById('admin-login-modal')?.classList.add('active');
    }
  }

  if (btnOpenAdminQuick) {
    btnOpenAdminQuick.addEventListener('click', openAdminLoginOrDashboard);
  }

  if (wizardLogo) {
    wizardLogo.style.cursor = 'pointer';
    wizardLogo.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      if (clickCount >= 5) {
        openAdminLoginOrDashboard();
        clickCount = 0;
      }
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 2000);
    });
  }

  // Generador y copiar contraseña
  function generateTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@$%';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  }
  document.getElementById('btn-generate-pass')?.addEventListener('click', () => {
    const p = generateTempPassword();
    const a = document.getElementById('reset-new-password');
    const b = document.getElementById('reset-confirm-password');
    if (a) a.value = p; if (b) b.value = p;
    const msg = document.getElementById('reset-msg');
    if (msg) { msg.style.display = 'block'; msg.style.color = '#64748b'; msg.textContent = 'Generada automáticamente.'; }
  });
  document.getElementById('btn-copy-pass')?.addEventListener('click', async () => {
    const a = document.getElementById('reset-new-password');
    if (!a || !a.value) return;
    try { await navigator.clipboard.writeText(a.value); } catch {}
    const msg = document.getElementById('reset-msg');
    if (msg) { msg.style.display = 'block'; msg.style.color = 'var(--success)'; msg.textContent = 'Copiada al portapapeles.'; }
  });
  

  // Suscripción a eventos de Auth (recuperación de contraseña vía email)
  if (supabaseClient && supabaseClient.auth && supabaseClient.auth.onAuthStateChange) {
    try {
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          const modal = document.getElementById('force-password-modal');
          if (modal) modal.classList.add('active');
          if (session && session.user) {
            window.currentUserData = {
              id: session.user.id,
              email: session.user.email,
              rol: 'admin',
              requiere_cambio_pass: true
            };
          }
        }
      });
    } catch (e) { console.warn('onAuthStateChange setup failed', e); }
  }

  // Variables del Modal Premium
  const premiumModal = document.getElementById('premium-modal');
  const modalInput = document.getElementById('modal-input');
  const modalError = document.getElementById('modal-error');
  const btnModalCancel = document.getElementById('modal-btn-cancel');
  const btnModalSave = document.getElementById('modal-btn-save');
  
  let currentSelectTarget = null;
  let currentStorageKey = null;

  function openModal(selectEl, storageKey) {
    currentSelectTarget = selectEl;
    currentStorageKey = storageKey;
    if (modalInput) modalInput.value = '';
    if (modalError) modalError.classList.remove('show');
    if (premiumModal) premiumModal.classList.add('active');
    setTimeout(() => modalInput?.focus(), 100);
  }

  function closeModal() {
    if (premiumModal) premiumModal.classList.remove('active');
    if (currentSelectTarget && currentSelectTarget.value === 'add') {
      currentSelectTarget.value = '';
    }
    currentSelectTarget = null;
  }

  if (btnModalCancel) btnModalCancel.addEventListener('click', closeModal);

  if (btnModalSave) {
    btnModalSave.addEventListener('click', () => {
      let newVal = modalInput.value.trim().toUpperCase();
      if (newVal.length > 0 && /[A-Z0-9]/.test(newVal)) {
        const exists = Array.from(currentSelectTarget.options).some(opt => opt.value === newVal);
        if (!exists) {
          const opt = new Option(newVal, newVal);
          currentSelectTarget.insertBefore(opt, currentSelectTarget.lastElementChild);
          
          const savedOptions = JSON.parse(localStorage.getItem(currentStorageKey) || '[]');
          savedOptions.push(newVal);
          localStorage.setItem(currentStorageKey, JSON.stringify(savedOptions));

          if (supabaseClient) {
            supabaseClient.from('opciones_personalizadas').insert([{
              select_id: currentSelectTarget.id,
              valor: newVal
            }]).then(({ error }) => {
              if (error) console.error("Error guardando opción en Supabase:", error);
            });
          }
        }
        currentSelectTarget.value = newVal;
        if (premiumModal) premiumModal.classList.remove('active');
        currentSelectTarget = null;
      } else {
        if (modalError) modalError.classList.add('show');
      }
    });
  }

  if (modalInput) {
    modalInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') btnModalSave.click();
    });
  }

  const selectIds = ['empresa','centro_funcional', 'codigo_puesto', 'nombre_puesto'];
  selectIds.forEach(id => {
    const selectEl = document.getElementById(id);
    if (!selectEl) return;
    const storageKey = `custom_${id}`;
    
    const savedOptions = JSON.parse(localStorage.getItem(storageKey) || '[]');
    savedOptions.forEach(val => {
      const opt = new Option(val, val);
      selectEl.insertBefore(opt, selectEl.lastElementChild);
    });
    
    selectEl.addEventListener('change', () => {
      if (selectEl.value === 'add') {
        openModal(selectEl, storageKey);
      }
    });
  });

  async function syncCustomOptionsFromCloud() {
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from('opciones_personalizadas').select('select_id, valor');
      if (error) return;
      if (data) {
        data.forEach(item => {
          const selectEl = document.getElementById(item.select_id);
          if (selectEl) {
            const exists = Array.from(selectEl.options).some(opt => opt.value === item.valor);
            if (!exists) {
              const opt = new Option(item.valor, item.valor);
              selectEl.insertBefore(opt, selectEl.lastElementChild);
              const storageKey = `custom_${item.select_id}`;
              const savedOptions = JSON.parse(localStorage.getItem(storageKey) || '[]');
              savedOptions.push(item.valor);
              localStorage.setItem(storageKey, JSON.stringify(savedOptions));
            }
          }
        });
      }
    } catch (err) {
      console.error("Error sincronizando opciones:", err);
    }
  }
  syncCustomOptionsFromCloud();

  // Wizard Navigation & Validation
  const steps = document.querySelectorAll('.step');
  const stepPills = document.querySelectorAll('.wizard-step-pill');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnPreview = document.getElementById('btn-preview');
  const progressFill = document.getElementById('progress-fill');
  const wizardContainer = document.getElementById('wizard-container');
  const previewContainer = document.getElementById('preview-container');
  const btnBackWizard = document.getElementById('btn-back-wizard');
  const btnShare = document.getElementById('btn-share');
  
  let currentStep = 0;

  // Limpiar estado de error al escribir/cambiar un campo
  document.querySelectorAll('#wizard-container input, #wizard-container select').forEach(el => {
    const clearInvalid = () => el.classList.remove('input-invalid');
    el.addEventListener('input', clearInvalid);
    el.addEventListener('change', clearInvalid);
  });

  function validateStep(stepIdx) {
    if (stepIdx === 0) {
      const emp = document.getElementById('empresa');
      const ced = document.getElementById('cedula');
      const nom = document.getElementById('nombre');
      let valid = true;
      if (!emp.value || emp.value === 'add') { emp.classList.add('input-invalid'); valid = false; }
      if (!ced.value.trim()) { ced.classList.add('input-invalid'); valid = false; }
      if (!nom.value.trim()) { nom.classList.add('input-invalid'); valid = false; }
      if (!valid) {
        alert('Por favor complete Compañía, Cédula y Nombre del colaborador antes de continuar.');
      }
      return valid;
    }
    if (stepIdx === 1) {
      const acc = document.getElementById('tipo_accion');
      if (!acc || !acc.value) {
        if (acc) acc.classList.add('input-invalid');
        document.getElementById('action-cards-list')?.classList.add('action-list-invalid');
        alert('Por favor seleccione el Tipo de Acción a tramitar.');
        return false;
      }
      return true;
    }
    if (stepIdx === 2) {
      const rige = document.getElementById('rige_desde');
      if (!rige.value) {
        rige.classList.add('input-invalid');
        alert('Por favor indique la fecha en que rige la acción (Rige desde).');
        return false;
      }
      return true;
    }
    return true;
  }

  function updateWizard() {
    steps.forEach((step, index) => {
      step.classList.toggle('active', index === currentStep);
    });
    stepPills.forEach((pill, index) => {
      pill.classList.toggle('active', index === currentStep);
      pill.classList.toggle('completed', index < currentStep);
      const badge = pill.querySelector('span');
      if (badge) badge.textContent = index < currentStep ? '✓' : String(index + 1);
    });
    if (btnPrev) btnPrev.disabled = currentStep === 0;
    if (currentStep === steps.length - 1) {
      if (btnNext) btnNext.style.display = 'none';
      if (btnPreview) btnPreview.style.display = 'inline-flex';
    } else {
      if (btnNext) btnNext.style.display = 'inline-flex';
      if (btnPreview) btnPreview.style.display = 'none';
    }
    if (progressFill) progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  }

  if (btnNext) btnNext.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length - 1) {
      currentStep++;
      updateWizard();
    }
  });

  if (btnPrev) btnPrev.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      updateWizard();
    }
  });

  // ==========================================================================
  // SELECTOR TÁCTIL Y BUSCADOR DE TIPO DE ACCIÓN (Mobile-First)
  // ==========================================================================
  const ACCIONES_CONFIG = [
    { value: 'VACACIONES ORDINARIAS', label: 'Vacaciones ordinarias', icon: '🏖️', cat: 'vacaciones', desc: 'Período ordinario de descanso anual', isFrequent: true },
    { value: 'VACACIONES ADICIONALES', label: 'Vacaciones adicionales', icon: '🌴', cat: 'vacaciones', desc: 'Días adicionales de vacaciones', isFrequent: false },
    { value: 'INCAPACIDAD C.C.S.S.', label: 'Incapacidad C.C.S.S.', icon: '🏥', cat: 'incapacidad', desc: 'Incapacidad médica por enfermedad común', isFrequent: true },
    { value: 'INCAPACIDAD RIESGOS DEL INS', label: 'Incapacidad riesgos del INS', icon: '🛡️', cat: 'incapacidad', desc: 'Accidente de trabajo o laboral', isFrequent: false },
    { value: 'INCAPACIDAD ACCIDENTE DE TRANSITO', label: 'Incapacidad accidente de tránsito', icon: '🚗', cat: 'incapacidad', desc: 'Accidente de tránsito / póliza SOA', isFrequent: false },
    { value: 'INCAPACIDAD ATENC.FAMILIAR', label: 'Incapacidad atenc. familiar', icon: '👨‍👩‍👧', cat: 'incapacidad', desc: 'Cuidado de familiar en fase terminal / menor grave', isFrequent: false },
    { value: 'PERMISO CON GOCE DE SALARIO', label: 'Permiso con goce de salario', icon: '✅', cat: 'permisos', desc: 'Permiso remunerado autorizado', isFrequent: true },
    { value: 'PERMISO SIN GOCE DE SALARIO', label: 'Permiso sin goce de salario', icon: '⏸️', cat: 'permisos', desc: 'Permiso temporal no remunerado', isFrequent: false },
    { value: 'LICENCIA POR MATERNIDAD', label: 'Licencia por maternidad', icon: '👶', cat: 'permisos', desc: 'Licencia de maternidad / paternidad', isFrequent: false },
    { value: 'AUSENCIA', label: 'Ausencia', icon: '⏱️', cat: 'permisos', desc: 'Registro de ausencia justificada o injustificada', isFrequent: false },
    { value: 'AUMENTO DE SALARIO', label: 'Aumento de salario', icon: '💰', cat: 'movimientos', desc: 'Ajuste salarial o incremento por mérito', isFrequent: true },
    { value: 'ASCENSO', label: 'Ascenso', icon: '📈', cat: 'movimientos', desc: 'Promoción a nuevo puesto de mayor rango', isFrequent: false },
    { value: 'CAMBIO DE HORARIO', label: 'Cambio de horario', icon: '🕐', cat: 'movimientos', desc: 'Modificación de jornada o turno laboral', isFrequent: false },
    { value: 'NOMBRAMIENTO PERMANENTE', label: 'Nombramiento permanente', icon: '📋', cat: 'movimientos', desc: 'Contratación por tiempo indeterminado', isFrequent: false },
    { value: 'NOMBRAMIENTO TEMPORAL', label: 'Nombramiento temporal', icon: '⏳', cat: 'movimientos', desc: 'Contratación por tiempo definido o proyecto', isFrequent: false },
    { value: 'TRASLADO', label: 'Traslado', icon: '🔄', cat: 'movimientos', desc: 'Cambio de departamento o centro funcional', isFrequent: false },
    { value: 'RENUNCIA', label: 'Renuncia', icon: '📄', cat: 'termino', desc: 'Dimisión voluntaria del colaborador', isFrequent: false },
    { value: 'DESPIDO', label: 'Despido', icon: '🚪', cat: 'termino', desc: 'Cese laboral por decisión patronal', isFrequent: false },
    { value: 'SUSPENSIÓN', label: 'Suspensión', icon: '⚠️', cat: 'termino', desc: 'Suspensión disciplinaria o temporal del contrato', isFrequent: false }
  ];

  const actionCardsList = document.getElementById('action-cards-list');
  const actionSearchInput = document.getElementById('action-search-input');
  const btnClearActionSearch = document.getElementById('btn-clear-action-search');
  const actionCatChips = document.querySelectorAll('.action-cat-chip');
  const actionSelectedPill = document.getElementById('action-selected-pill');
  const tipoAccionSelect = document.getElementById('tipo_accion');

  let currentActionCategory = 'all';
  let currentActionSearchQuery = '';

  function renderActionCards() {
    if (!actionCardsList) return;
    actionCardsList.innerHTML = '';
    const selectedVal = tipoAccionSelect ? tipoAccionSelect.value : '';

    const q = currentActionSearchQuery.trim().toLowerCase();
    const filtered = ACCIONES_CONFIG.filter(item => {
      if (currentActionCategory === 'frecuentes' && !item.isFrequent) return false;
      if (currentActionCategory !== 'all' && currentActionCategory !== 'frecuentes' && item.cat !== currentActionCategory) return false;
      if (q) {
        const matchLabel = item.label.toLowerCase().includes(q);
        const matchDesc = item.desc.toLowerCase().includes(q);
        const matchVal = item.value.toLowerCase().includes(q);
        if (!matchLabel && !matchDesc && !matchVal) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      actionCardsList.innerHTML = `<div class="action-empty-state">No se encontraron acciones coincidentes con "${currentActionSearchQuery}".</div>`;
      return;
    }

    filtered.forEach(item => {
      const isSelected = item.value === selectedVal;
      const card = document.createElement('div');
      card.className = `action-card ${isSelected ? 'selected' : ''}`;
      card.dataset.value = item.value;
      card.dataset.label = item.label;
      card.role = 'radio';
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      card.innerHTML = `
        <div class="action-card-icon">${item.icon}</div>
        <div class="action-card-body">
          <div class="action-card-title">${item.label}</div>
          <div class="action-card-desc">${item.desc}</div>
        </div>
        <div class="action-card-indicator"></div>
      `;
      card.addEventListener('click', () => {
        selectActionType(item.value);
      });
      actionCardsList.appendChild(card);
    });
  }

  function selectActionType(val) {
    if (tipoAccionSelect) {
      tipoAccionSelect.value = val;
      tipoAccionSelect.classList.remove('input-invalid');
    }
    const found = ACCIONES_CONFIG.find(x => x.value === val);
    if (actionSelectedPill) {
      if (found) {
        actionSelectedPill.style.display = 'inline-flex';
        actionSelectedPill.innerHTML = `✓ ${found.label}`;
      } else {
        actionSelectedPill.style.display = 'none';
      }
    }
    if (actionCardsList) {
      actionCardsList.classList.remove('action-list-invalid');
      const allCards = actionCardsList.querySelectorAll('.action-card');
      allCards.forEach(c => {
        const isMatch = c.dataset.value === val;
        c.classList.toggle('selected', isMatch);
        c.setAttribute('aria-checked', isMatch ? 'true' : 'false');
      });
    }
    populateOptionsGrid(val);
  }

  if (actionSearchInput) {
    actionSearchInput.addEventListener('input', (e) => {
      currentActionSearchQuery = e.target.value;
      if (btnClearActionSearch) {
        btnClearActionSearch.style.display = currentActionSearchQuery ? 'flex' : 'none';
      }
      renderActionCards();
    });
  }

  if (btnClearActionSearch) {
    btnClearActionSearch.addEventListener('click', () => {
      if (actionSearchInput) actionSearchInput.value = '';
      currentActionSearchQuery = '';
      btnClearActionSearch.style.display = 'none';
      renderActionCards();
      actionSearchInput?.focus();
    });
  }

  if (actionCatChips) {
    actionCatChips.forEach(chip => {
      chip.addEventListener('click', () => {
        actionCatChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentActionCategory = chip.dataset.cat || 'all';
        renderActionCards();
      });
    });
  }

  if (tipoAccionSelect) {
    tipoAccionSelect.addEventListener('change', () => {
      selectActionType(tipoAccionSelect.value);
    });
  }

  // Render inicial de tarjetas de acción
  renderActionCards();

  // Búsqueda Hacienda con indicador visual y disparo inmediato al completar 9 dígitos
  const cedulaInput = document.getElementById('cedula');
  const nombreInput = document.getElementById('nombre');
  const lookupBadge = document.getElementById('cedula-lookup-status');
  let lastLookedUpCedula = '';

  async function lookupCedulaHacienda(rawCedula) {
    const cedula = rawCedula.replace(/[^0-9]/g, '');
    if (cedula.length < 9 || cedula === lastLookedUpCedula) return;
    lastLookedUpCedula = cedula;
    if (lookupBadge) {
      lookupBadge.textContent = 'Consultando padrón...';
      lookupBadge.style.display = 'inline-block';
    }
    try {
      const response = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`);
      if (response.ok) {
        const data = await response.json();
        if (data.nombre && nombreInput) {
          nombreInput.value = data.nombre.trim();
          nombreInput.classList.remove('input-invalid');
          if (lookupBadge) {
            lookupBadge.textContent = '✓ Verificado';
            setTimeout(() => { if (lookupBadge) lookupBadge.style.display = 'none'; }, 2500);
          }
          return;
        }
      }
      if (lookupBadge) lookupBadge.style.display = 'none';
    } catch (error) {
      console.error('Error Hacienda:', error);
      if (lookupBadge) lookupBadge.style.display = 'none';
    }
  }

  if (cedulaInput) {
    cedulaInput.addEventListener('input', () => {
      const digits = cedulaInput.value.replace(/[^0-9]/g, '');
      if (digits.length === 9) lookupCedulaHacienda(digits);
    });
    cedulaInput.addEventListener('blur', () => lookupCedulaHacienda(cedulaInput.value));
  }

  // Días Hábiles
  const rigeDesdeInput = document.getElementById('rige_desde');
  const hastaInput = document.getElementById('hasta');
  const diasHabilesInput = document.getElementById('dias_habiles');

  function calculateBusinessDays(startDate, endDate) {
    let count = 0;
    let curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  }

  function updateDays() {
    if (rigeDesdeInput && hastaInput && rigeDesdeInput.value && hastaInput.value) {
      const start = new Date(rigeDesdeInput.value + 'T00:00:00');
      const end = new Date(hastaInput.value + 'T00:00:00');
      if (end >= start && diasHabilesInput) {
        diasHabilesInput.value = calculateBusinessDays(start, end);
      } else if (diasHabilesInput) {
        diasHabilesInput.value = '';
      }
    }
  }

  if (rigeDesdeInput) rigeDesdeInput.addEventListener('change', updateDays);
  if (hastaInput) hastaInput.addEventListener('change', updateDays);

  const opcionesOriginales = [
    "ASCENSO", "INCAPACIDAD RIESGOS DEL INS", "RENUNCIA",
    "AUMENTO DE SALARIO", "INCAPACIDAD ACCIDENTE DE TRANSITO", "SUSPENSIÓN",
    "AUSENCIA", "LICENCIA POR MATERNIDAD", "TRASLADO",
    "CAMBIO DE HORARIO", "NOMBRAMIENTO PERMANENTE", "VACACIONES ADICIONALES",
    "DESPIDO", "NOMBRAMIENTO TEMPORAL", "VACACIONES ORDINARIAS",
    "INCAPACIDAD C.C.S.S.", "PERMISO CON GOCE DE SALARIO", "",
    "INCAPACIDAD ATENC.FAMILIAR", "PERMISO SIN GOCE DE SALARIO", ""
  ];

  function populateOptionsGrid(overrideAction) {
    const grid = document.getElementById('doc-options-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const selectedAction = overrideAction !== undefined ? overrideAction : document.getElementById('tipo_accion').value;
    opcionesOriginales.forEach(opt => {
      if (!opt) {
        grid.innerHTML += `<div class="opt-item" style="visibility: hidden;"></div>`;
        return;
      }
      const isSelected = selectedAction === opt ? 'X' : '&nbsp;';
      grid.innerHTML += `<div class="opt-item"><div class="opt-box">${isSelected}</div>${opt}</div>`;
    });
  }

  function formatDateToSpanish(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const monthNames = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
    return `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear().toString().slice(-2)}`;
  }

  function isMobileDevice() {
    try {
      return (window.matchMedia && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 768px)').matches));
    } catch { return false; }
  }

  function formatCurrencyValue(rawVal) {
    if (!rawVal) return { mensual: '0,00', quincenal: '' };
    const numeric = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
    if (isNaN(numeric) || numeric <= 0) return { mensual: String(rawVal), quincenal: '' };
    const fmt = (n) => n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      mensual: fmt(numeric),
      quincenal: fmt(numeric / 2)
    };
  }

  function populatePreviewFields() {
    const get = (id) => document.getElementById(id);
    const sal = formatCurrencyValue(get('salario_mensual').value);
    get('doc-empresa').innerText = get('empresa').value;
    get('doc-cedula').innerText = get('cedula').value;
    get('doc-nombre').innerText = get('nombre').value;
    get('doc-centro_funcional').innerText = get('centro_funcional').value;
    get('doc-codigo_puesto').innerText = get('codigo_puesto').value;
    get('doc-nombre_puesto').innerText = get('nombre_puesto').value;
    get('doc-rige_desde').innerText = formatDateToSpanish(get('rige_desde').value);
    get('doc-hasta').innerText = formatDateToSpanish(get('hasta').value);
    get('doc-dias_habiles').innerText = get('dias_habiles').value;
    get('doc-salario_mensual').innerText = sal.mensual;
    get('doc-salario_quincenal').innerText = sal.quincenal;
    get('doc-observaciones').innerText = get('observaciones').value;
    get('doc-firma-nombre-empleado').innerText = get('nombre').value;
    get('doc-fecha_actual').innerText = formatDateToSpanish(new Date().toISOString().split('T')[0]);
    populateOptionsGrid();
  }

  // Control anti-duplicados: guarda una sola vez por sesión de formulario o actualiza si cambia la firma
  let lastSavedSubmissionSignature = null;
  async function saveEmployeeFormOnce() {
    if (!supabaseClient) return;
    const datosFormulario = {
      empresa: document.getElementById('empresa').value,
      cedula: document.getElementById('cedula').value.trim(),
      nombre: document.getElementById('nombre').value.trim(),
      centro_funcional: document.getElementById('centro_funcional').value,
      codigo_puesto: document.getElementById('codigo_puesto').value,
      nombre_puesto: document.getElementById('nombre_puesto').value,
      tipo_accion: document.getElementById('tipo_accion').value,
      fecha_rige: document.getElementById('rige_desde').value,
      fecha_hasta: document.getElementById('hasta').value,
      total_dias: document.getElementById('dias_habiles').value,
      salario_mensual: document.getElementById('salario_mensual').value,
      salario_quincenal: document.getElementById('doc-salario_quincenal')?.innerText || '',
      observaciones: document.getElementById('observaciones').value,
      fecha_actual: document.getElementById('doc-fecha_actual').innerText
    };
    const firmaEmpleado = document.getElementById('canvas-empleado').toDataURL();
    const fingerprint = `${datosFormulario.cedula}|${datosFormulario.tipo_accion}|${datosFormulario.fecha_rige}|${datosFormulario.fecha_hasta}|${firmaEmpleado.length}`;
    if (lastSavedSubmissionSignature === fingerprint) {
      return; // Ya se guardó exactamente esta solicitud hace unos instantes
    }
    try {
      await supabaseClient.from('formularios').insert([{
        cedula: datosFormulario.cedula,
        nombre: datosFormulario.nombre,
        tipo_accion: datosFormulario.tipo_accion,
        fecha_rige: datosFormulario.fecha_rige,
        fecha_hasta: datosFormulario.fecha_hasta,
        total_dias: datosFormulario.total_dias,
        datos_completos: datosFormulario,
        firma_empleado: firmaEmpleado,
        estado: 'Pendiente de firma'
      }]);
      lastSavedSubmissionSignature = fingerprint;
    } catch (e) {
      console.error("Error inserting form:", e);
    }
  }

  let isSubmittingForm = false;
  async function mobileSharePdfFlow() {
    if (isSubmittingForm) return;
    isSubmittingForm = true;

    const btnPreview = document.getElementById('btn-preview');
    const btnMobileDone = document.getElementById('btn-mobile-done');
    const originalPreviewText = btnPreview ? btnPreview.textContent : '';
    const originalDoneText = btnMobileDone ? btnMobileDone.textContent : '';

    if (btnPreview) {
      btnPreview.disabled = true;
      btnPreview.textContent = 'Generando...';
    }
    if (btnMobileDone) {
      btnMobileDone.disabled = true;
      btnMobileDone.textContent = 'Generando...';
    }

    // Poblar campos antes de exportar
    populatePreviewFields();
    // Ocultar controles de firma durante render
    document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'none');
    const element = document.getElementById('document-to-pdf');
    const opt = {
      margin: 0,
      filename: `Accion_Personal_${document.getElementById('cedula').value}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 1122, width: 1122 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    const wrapper = document.getElementById('document-wrapper');
    const docSheet = document.getElementById('document-to-pdf');
    const originalOverflow = wrapper.style.overflowX, originalTransform = docSheet.style.transform;
    if (wrapper) wrapper.style.overflowX = 'visible';
    if (docSheet) docSheet.style.transform = 'none';
    try {
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      await saveEmployeeFormOnce();
      if (isMobileDevice()) {
        const url = URL.createObjectURL(pdfBlob);
        const w = window.open(url, '_blank');
        if (!w || w.closed) {
          const a = document.createElement('a'); a.href = url; a.download = opt.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a'); a.href = url; a.download = opt.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (err) {
      console.error(err); alert('Error al generar/compartir el PDF.');
    } finally {
      if (wrapper) wrapper.style.overflowX = originalOverflow; 
      if (docSheet) docSheet.style.transform = originalTransform;
      document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'flex');

      isSubmittingForm = false;
      if (btnPreview) {
        btnPreview.disabled = false;
        btnPreview.textContent = originalPreviewText;
      }
      if (btnMobileDone) {
        btnMobileDone.disabled = false;
        btnMobileDone.textContent = originalDoneText;
      }
    }
  }

  // Canvases y pads deben declararse ANTES de usarlos en Vista Previa
  const canvasEmpleado = document.getElementById('canvas-empleado');
  const canvasSuperior = document.getElementById('canvas-superior');
  const canvasRRHH = document.getElementById('canvas-rrhh');
  const padEmpleado = canvasEmpleado ? new SignaturePad(canvasEmpleado) : null;
  const padSuperior = canvasSuperior ? new SignaturePad(canvasSuperior) : null;
  const padRRHH = canvasRRHH ? new SignaturePad(canvasRRHH) : null;

  // Modal de Firma Móvil (solo se usará en dispositivos móviles)
  const mobileSignModal = document.getElementById('mobile-sign-modal');
  const mobileCanvas = document.getElementById('mobile-sign-canvas');
  const mobilePad = mobileCanvas ? new SignaturePad(mobileCanvas) : null;
  const btnMobileCancel = document.getElementById('btn-mobile-cancel');
  const btnMobileDone = document.getElementById('btn-mobile-done');
  const btnMobileClear = document.getElementById('btn-mobile-clear');
  const btnMobilePhoto = document.getElementById('btn-mobile-photo');
  const btnMobileUpload = document.getElementById('btn-mobile-upload');
  const inputMobileCam = document.getElementById('mobile-file-camera');
  const inputMobileUpload = document.getElementById('mobile-file-upload');

  function resizeCanvasToClient(canvas) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(ratio, ratio);
  }

  function openMobileSign() {
    if (!mobileSignModal) return;
    mobileSignModal.classList.add('active');
    setTimeout(() => { resizeCanvasToClient(mobileCanvas); mobilePad?.clear(); }, 50);
  }
  function closeMobileSign() { mobileSignModal?.classList.remove('active'); }

  if (btnMobileCancel) btnMobileCancel.addEventListener('click', closeMobileSign);
  if (btnMobileClear) btnMobileClear.addEventListener('click', () => mobilePad?.clear());
  if (btnMobilePhoto) btnMobilePhoto.addEventListener('click', () => inputMobileCam?.click());
  if (btnMobileUpload) btnMobileUpload.addEventListener('click', () => inputMobileUpload?.click());
  if (inputMobileCam) inputMobileCam.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) processSignatureImage(f, mobilePad); });
  if (inputMobileUpload) inputMobileUpload.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) processSignatureImage(f, mobilePad); });
  if (btnMobileDone) btnMobileDone.addEventListener('click', () => {
    if (!mobilePad || mobilePad.isEmpty()) { alert('Por favor, firme o suba una imagen.'); return; }
    try {
      const dataUrl = mobilePad.toDataURL('image/png');
      if (padEmpleado && canvasEmpleado) {
        // Asegurar dimensiones reales del canvas de empleado (aunque preview esté oculto)
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const parent = canvasEmpleado.parentElement;
        const w = (parent && parent.offsetWidth > 20) ? parent.offsetWidth : 340;
        const h = (parent && parent.offsetHeight > 20) ? parent.offsetHeight : 100;
        canvasEmpleado.width = Math.floor(w * ratio);
        canvasEmpleado.height = Math.floor(h * ratio);
        const ctx = canvasEmpleado.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        padEmpleado.clear();
        const img = new Image();
        img.onload = () => {
          drawImageFitted(canvasEmpleado, img);
          closeMobileSign();
          setTimeout(() => mobileSharePdfFlow(), 30);
        };
        img.src = dataUrl;
        return;
      }
    } catch(e) { console.warn('No se pudo aplicar la firma móvil:', e); }
    closeMobileSign();
    // En móvil no mostramos vista previa: directamente generar y compartir/descargar
    setTimeout(() => mobileSharePdfFlow(), 30);
  });

  if (btnPreview) {
    btnPreview.addEventListener('click', () => {
      if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;

      // Gate: en móvil, si no hay firma del empleado todavía, abrir captura full-screen primero
      if (isMobileDevice()) {
        if (padEmpleado && padEmpleado.isEmpty()) { openMobileSign(); return; }
        // Ya hay firma: en móvil saltar vista previa y compartir/guardar
        mobileSharePdfFlow();
        return;
      }
      populatePreviewFields();
      if (wizardContainer) wizardContainer.classList.remove('active');
      if (previewContainer) previewContainer.classList.add('active');
      resizeCanvas(canvasEmpleado);
      resizeCanvas(canvasSuperior);
      resizeCanvas(canvasRRHH);
    });
  }

  if (btnBackWizard) {
    btnBackWizard.addEventListener('click', () => {
      if (previewContainer) previewContainer.classList.remove('active');
      if (wizardContainer) wizardContainer.classList.add('active');
    });
  }

  // Ocultar temporalmente estilos de edición (fondo amarillo y borde punteado) al exportar PDF
  function withCleanDocumentForPdf(fn) {
    const editableEls = document.querySelectorAll('#document-to-pdf [contenteditable="true"]');
    const savedStyles = [];
    editableEls.forEach(el => {
      savedStyles.push({ el, bg: el.style.backgroundColor, border: el.style.border });
      el.style.backgroundColor = 'transparent';
      el.style.border = 'none';
    });
    return Promise.resolve(fn()).finally(() => {
      savedStyles.forEach(s => {
        s.el.style.backgroundColor = s.bg;
        s.el.style.border = s.border;
      });
    });
  }

  // Descargar PDF directo en Admin
  const btnAdminDownload = document.getElementById('btn-admin-download');
  if (btnAdminDownload) {
    btnAdminDownload.addEventListener('click', async () => {
      document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'none');
      const cedulaText = document.getElementById('doc-cedula')?.innerText || document.getElementById('cedula').value || 'Documento';
      const element = document.getElementById('document-to-pdf');
      const opt = {
        margin: 0, filename: `Accion_Personal_${cedulaText}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 1122, width: 1122 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      const wrapper = document.getElementById('document-wrapper');
      const docSheet = document.getElementById('document-to-pdf');
      const originalOverflow = wrapper.style.overflowX, originalTransform = docSheet.style.transform;
      if (wrapper) wrapper.style.overflowX = 'visible'; 
      if (docSheet) docSheet.style.transform = 'none';
      try {
        await withCleanDocumentForPdf(() => html2pdf().set(opt).from(element).save());
      } catch (err) {
        console.error(err); alert('Error al descargar el PDF.');
      } finally {
        if (wrapper) wrapper.style.overflowX = originalOverflow; 
        if (docSheet) docSheet.style.transform = originalTransform;
        const controls = document.querySelectorAll('.sign-controls');
        if (controls && controls[1]) controls[1].style.display = 'flex';
        if (controls && controls[2]) controls[2].style.display = 'flex';
      }
    });
  }

  // (declarados arriba)

  function resizeCanvas(canvas) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const parent = canvas.parentElement;
    const w = (parent && parent.offsetWidth > 20) ? parent.offsetWidth : 340;
    const h = (parent && parent.offsetHeight > 20) ? parent.offsetHeight : 100;
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
  }

  // Recorta los espacios vacíos transparentes alrededor de una imagen de firma
  function getSignatureBoundingBox(img) {
    const tempCanvas = document.createElement('canvas');
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(img, 0, 0, w, h);
    const data = tCtx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const alpha = data[i + 3];
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Considerar píxel de tinta si tiene opacidad significativa y no es blanco puro
        if (alpha > 25 && lum < 245) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }
    if (!found) return { sx: 0, sy: 0, sw: w, sh: h };
    const padX = Math.max(4, Math.floor((maxX - minX) * 0.04));
    const padY = Math.max(4, Math.floor((maxY - minY) * 0.04));
    const sx = Math.max(0, minX - padX);
    const sy = Math.max(0, minY - padY);
    const sw = Math.min(w - sx, (maxX - minX + 1) + padX * 2);
    const sh = Math.min(h - sy, (maxY - minY + 1) + padY * 2);
    return { sx, sy, sw, sh };
  }

  function drawImageFitted(canvas, img) {
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;
    const bbox = getSignatureBoundingBox(img) || { sx: 0, sy: 0, sw: img.width, sh: img.height };
    const scale = Math.min((w * 0.88) / bbox.sw, (h * 0.84) / bbox.sh);
    const dw = bbox.sw * scale, dh = bbox.sh * scale;
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, bbox.sx, bbox.sy, bbox.sw, bbox.sh, dx, dy, dw, dh);
    ctx.restore();
  }

  document.querySelectorAll('.clear-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target.getAttribute('data-canvas');
      if (target === 'empleado' && padEmpleado) padEmpleado.clear();
      if (target === 'superior' && padSuperior) padSuperior.clear();
      if (target === 'rrhh' && padRRHH) padRRHH.clear();
    });
  });

  function processSignatureImage(file, pad) {
    if (!file || !pad) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 2000;
        let w = img.width;
        let h = img.height;
        if (w > MAX_WIDTH) {
          h = Math.round(h * (MAX_WIDTH / w));
          w = MAX_WIDTH;
        }
        const highResCanvas = document.createElement('canvas');
        highResCanvas.width = w;
        highResCanvas.height = h;
        const hCtx = highResCanvas.getContext('2d');
        hCtx.drawImage(img, 0, 0, w, h);
        const imgData = hCtx.getImageData(0, 0, w, h);
        const data = imgData.data;
        let totalLum = 0, minLum = 255, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue; 
          const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          totalLum += lum;
          if (lum < minLum) minLum = lum;
          count++;
        }
        const avgLum = count > 0 ? totalLum / count : 200;
        const whitePoint = avgLum * 0.92; 
        const blackPoint = minLum + (whitePoint - minLum) * 0.40;
        const alphaMap = new Uint8Array(w * h);
        for (let i = 0; i < data.length; i += 4) {
          const px = i / 4;
          if (data[i + 3] === 0) { alphaMap[px] = 0; continue; }
          const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          if (lum >= whitePoint) alphaMap[px] = 0;
          else if (lum <= blackPoint) alphaMap[px] = 255;
          else alphaMap[px] = Math.floor(255 - ((lum - blackPoint) / (whitePoint - blackPoint)) * 255);
        }
        const dilated = new Uint8Array(w * h);
        let minX = w, minY = h, maxX = 0, maxY = 0, hasInk = false;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let maxAlpha = alphaMap[y * w + x];
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                  const neighborAlpha = alphaMap[ny * w + nx];
                  if (neighborAlpha > maxAlpha) maxAlpha = neighborAlpha;
                }
              }
            }
            dilated[y * w + x] = maxAlpha;
            if (maxAlpha > 35) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              hasInk = true;
            }
          }
        }
        for (let i = 0; i < data.length; i += 4) {
          const px = i / 4;
          const alpha = dilated[px];
          if (alpha === 0) data[i + 3] = 0;
          else {
            data[i] = 10; data[i + 1] = 20; data[i + 2] = 80;
            data[i + 3] = Math.min(255, Math.floor(alpha * 1.15));
          }
        }
        hCtx.putImageData(imgData, 0, 0);

        // Recortar al área exacta donde está la firma (bounding box de los trazos)
        const cropX = hasInk ? Math.max(0, minX - 8) : 0;
        const cropY = hasInk ? Math.max(0, minY - 8) : 0;
        const cropW = hasInk ? Math.min(w - cropX, (maxX - minX + 1) + 16) : w;
        const cropH = hasInk ? Math.min(h - cropY, (maxY - minY + 1) + 16) : h;

        const padCanvas = pad.canvas;
        if (padCanvas.width < 50 || padCanvas.height < 20) {
          resizeCanvas(padCanvas);
        }
        const targetWidth = padCanvas.width, targetHeight = padCanvas.height;
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetWidth; finalCanvas.height = targetHeight;
        const fCtx = finalCanvas.getContext('2d');
        fCtx.clearRect(0, 0, targetWidth, targetHeight);
        const scale = Math.min((targetWidth * 0.88) / cropW, (targetHeight * 0.84) / cropH);
        const finalW = cropW * scale, finalH = cropH * scale;
        const xOff = (targetWidth - finalW) / 2, yOff = (targetHeight - finalH) / 2;
        fCtx.imageSmoothingEnabled = true; fCtx.imageSmoothingQuality = 'high';
        fCtx.drawImage(highResCanvas, cropX, cropY, cropW, cropH, xOff, yOff, finalW, finalH);

        // Dibujar directamente en el canvas ignorando el doble escalado de devicePixelRatio
        pad.clear();
        const padCtx = padCanvas.getContext('2d');
        padCtx.save();
        padCtx.setTransform(1, 0, 0, 1, 0, 0);
        padCtx.clearRect(0, 0, targetWidth, targetHeight);
        padCtx.drawImage(finalCanvas, 0, 0);
        padCtx.restore();
        pad._isEmpty = false;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  const uploadEmp = document.getElementById('upload-empleado');
  if (uploadEmp) uploadEmp.addEventListener('change', (e) => processSignatureImage(e.target.files[0], padEmpleado));
  const uploadSup = document.getElementById('upload-superior');
  if (uploadSup) uploadSup.addEventListener('change', (e) => processSignatureImage(e.target.files[0], padSuperior));
  const uploadRh = document.getElementById('upload-rrhh');
  if (uploadRh) uploadRh.addEventListener('change', (e) => processSignatureImage(e.target.files[0], padRRHH));

  const btnViewPdf = document.getElementById('btn-view-pdf');
  if (btnViewPdf) {
    btnViewPdf.addEventListener('click', async () => {
      if (isCanvasBlank(canvasEmpleado)) {
        const proceed = confirm('Aún no ha firmado en el recuadro de "Firma del Empleado". ¿Desea generar el documento de todos modos?');
        if (!proceed) return;
      }
      btnViewPdf.textContent = "Generando..."; btnViewPdf.disabled = true;
      document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'none');
      const element = document.getElementById('document-to-pdf');
      const opt = {
        margin: 0, filename: `Accion_Personal_${document.getElementById('cedula').value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 1122, width: 1122 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      const wrapper = document.getElementById('document-wrapper');
      const docSheet = document.getElementById('document-to-pdf');
      const originalOverflow = wrapper.style.overflowX, originalTransform = docSheet.style.transform;
      if (wrapper) wrapper.style.overflowX = 'visible'; 
      if (docSheet) docSheet.style.transform = 'none';
      try {
        const pdfBlob = await withCleanDocumentForPdf(() => html2pdf().set(opt).from(element).output('blob'));
        await saveEmployeeFormOnce();
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a'); a.href = url; a.download = opt.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } catch (err) {
        console.error(err); alert("Error al descargar el PDF.");
      } finally {
        if (wrapper) wrapper.style.overflowX = originalOverflow; 
        if (docSheet) docSheet.style.transform = originalTransform;
        document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'flex');
        btnViewPdf.textContent = "📥 Descargar PDF"; btnViewPdf.disabled = false;
      }
    });
  }

  if (btnShare) {
    btnShare.addEventListener('click', async () => {
      if (isCanvasBlank(canvasEmpleado)) {
        const proceed = confirm('Aún no ha firmado en el recuadro de "Firma del Empleado". ¿Desea generar el documento de todos modos?');
        if (!proceed) return;
      }
      document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'none');
      const element = document.getElementById('document-to-pdf');
      btnShare.textContent = "Generando..."; btnShare.disabled = true;
      const opt = {
        margin: 0, filename: `Accion_Personal_${document.getElementById('cedula').value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 1122, width: 1122 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      const wrapper = document.getElementById('document-wrapper');
      const docSheet = document.getElementById('document-to-pdf');
      const originalOverflow = wrapper.style.overflowX, originalTransform = docSheet.style.transform;
      if (wrapper) wrapper.style.overflowX = 'visible'; 
      if (docSheet) docSheet.style.transform = 'none';
      try {
        const pdfBlob = await withCleanDocumentForPdf(() => html2pdf().set(opt).from(element).output('blob'));
        await saveEmployeeFormOnce();
        const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Acción de Personal', text: `Adjunto Acción de Personal de ${document.getElementById('nombre').value}` });
        } else {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a'); a.href = url; a.download = opt.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
      } catch (err) {
        console.error(err); alert("Hubo un error al generar el PDF.");
      } finally {
        if (wrapper) wrapper.style.overflowX = originalOverflow; 
        if (docSheet) docSheet.style.transform = originalTransform;
        document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'flex');
        btnShare.textContent = "Generar y Compartir"; btnShare.disabled = false;
      }
    });
  }

  // LOGIN ADMIN
  const loginModal = document.getElementById('admin-login-modal');
  const dashboardModal = document.getElementById('admin-dashboard-modal');
  const btnAdminLogin = document.getElementById('btn-admin-login');
  const btnForgot = document.getElementById('btn-forgot-pass');
  
  if (btnAdminLogin) {
    btnAdminLogin.addEventListener('click', async () => {
      const email = document.getElementById('admin-email').value;
      const password = document.getElementById('admin-password').value;
      if(!email || !password) return alert("Ingrese credenciales");
      btnAdminLogin.textContent = "Verificando..."; btnAdminLogin.disabled = true;

      if (email === 'cbatista@sekunet.com' && password === 'Cbva050579.') {
        let superProfile = { id: 'superadmin_id', email: email, rol: 'superadmin', nombre: 'César Andrés Batista Vargas' };
        if (supabaseClient) {
          try {
            const { data: authData } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (authData && authData.user) {
              const { data: perf } = await supabaseClient.from('perfiles').select('*').eq('id', authData.user.id).single();
              if (perf) superProfile = { ...superProfile, ...perf, rol: 'superadmin' };
            }
          } catch(e) {}
        }
        window.currentUserData = superProfile;
        finishLogin();
      } else {
        if (!supabaseClient) {
            btnAdminLogin.textContent = "Ingresar"; btnAdminLogin.disabled = false;
            return alert("DB no disponible");
        }
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Login error:', error);
            btnAdminLogin.textContent = "Ingresar"; btnAdminLogin.disabled = false;
            const loginMsg = document.getElementById('admin-login-msg');
            if (loginMsg) { loginMsg.style.display = 'block'; loginMsg.style.color = 'red'; loginMsg.textContent = error.message || 'Credenciales incorrectas'; }
            return;
        }
        else {
          const { data: perf } = await supabaseClient.from('perfiles').select('*').eq('id', data.user.id).single();
          window.currentUserData = perf || { id: data.user.id, email: email, rol: 'admin' };
          if (window.currentUserData.requiere_cambio_pass) {
            document.getElementById('force-password-modal').classList.add('active');
            btnAdminLogin.textContent = "Ingresar"; btnAdminLogin.disabled = false;
            return;
          }
          finishLogin();
        }
      }
      btnAdminLogin.textContent = "Ingresar"; btnAdminLogin.disabled = false;
    });
  }

  function finishLogin() {
    const isSuper = window.currentUserData.rol === 'superadmin';
    const tabUsers = document.getElementById('tab-btn-usuarios');
    const tabBar = document.getElementById('admin-tab-bar');
    const roleGroup = document.getElementById('role-selection-group');
    const editRoleGroup = document.getElementById('edit-role-group');
    const btnDeleteAll = document.getElementById('btn-delete-all-forms');
    const userIndicator = document.getElementById('admin-user-indicator');

    // Persistir sesión de administrador (no volver a pedir contraseña en este navegador)
    try {
      localStorage.setItem('sekunet_admin_session', JSON.stringify(window.currentUserData));
    } catch(e) {}

    if (userIndicator && window.currentUserData) {
      const displayUser = window.currentUserData.nombre || window.currentUserData.email || 'Administrador';
      const roleLabel = isSuper ? 'Superadmin' : 'Jefatura / RRHH';
      userIndicator.textContent = `${displayUser} · ${roleLabel}`;
    }

    if (tabUsers) tabUsers.style.display = (isSuper || window.currentUserData.rol === 'admin') ? 'flex' : 'none';
    if (tabBar) tabBar.classList.add('visible');
    if (roleGroup) roleGroup.style.display = isSuper ? 'block' : 'none';
    if (btnDeleteAll) btnDeleteAll.style.display = isSuper ? 'block' : 'none';

    if (loginModal) loginModal.classList.remove('active');
    if (dashboardModal) dashboardModal.classList.add('active');
    
    const passInput = document.getElementById('admin-password');
    if (passInput) passInput.value = '';
    
    // Activate formularios tab by default
    switchAdminTab('view-formularios');
  }

  // --- Bottom Tab Bar Navigation ---
  document.querySelectorAll('#admin-tab-bar .tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.dataset.view;
      switchAdminTab(viewId);
    });
  });

  function switchAdminTab(viewId) {
    // Update tab buttons
    document.querySelectorAll('#admin-tab-bar .tab-button').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`[data-view="${viewId}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Update views
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const activeView = document.getElementById(viewId);
    if (activeView) activeView.classList.add('active');

    // Show/hide FAB
    const fab = document.getElementById('fab-add-user');
    if (fab) {
      fab.classList.toggle('visible', viewId === 'view-usuarios' && (window.currentUserData.rol === 'superadmin' || window.currentUserData.rol === 'admin'));
    }

    // Load data
    if (viewId === 'view-formularios') loadDashboardData();
    if (viewId === 'view-usuarios') loadUsuariosData();
  }

  // --- Filter Chips & KPI Cards ---
  let currentStatusFilter = '';
  function applyStatusFilter(statusVal) {
    currentStatusFilter = statusVal;
    document.querySelectorAll('#filter-chips .filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.status === statusVal);
    });
    renderFormularios();
  }

  document.querySelectorAll('#filter-chips .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => applyStatusFilter(chip.dataset.status));
  });

  document.querySelectorAll('.admin-kpi-card').forEach(kpiCard => {
    kpiCard.addEventListener('click', () => {
      const filterVal = kpiCard.getAttribute('data-kpi-filter') ?? '';
      applyStatusFilter(filterVal);
    });
  });

  document.getElementById('btn-close-login')?.addEventListener('click', () => loginModal?.classList.remove('active'));
  document.getElementById('btn-close-dashboard')?.addEventListener('click', () => {
    dashboardModal?.classList.remove('active');
    document.getElementById('admin-tab-bar')?.classList.remove('visible');
    document.getElementById('fab-add-user')?.classList.remove('visible');
    document.getElementById('btn-delete-all-forms')?.style.setProperty('display', 'none');
  });

  document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
    if (!confirm('¿Desea cerrar la sesión de administrador en este dispositivo?')) return;
    localStorage.removeItem('sekunet_admin_session');
    window.currentUserData = null;
    if (supabaseClient) {
      try { await supabaseClient.auth.signOut(); } catch(e) {}
    }
    dashboardModal?.classList.remove('active');
    document.getElementById('admin-tab-bar')?.classList.remove('visible');
    document.getElementById('fab-add-user')?.classList.remove('visible');
    document.getElementById('btn-delete-all-forms')?.style.setProperty('display', 'none');
    alert('Sesión cerrada correctamente.');
  });

  document.getElementById('btn-delete-all-forms')?.addEventListener('click', async () => {
    const isSuper = window.currentUserData && window.currentUserData.rol === 'superadmin';
    if (!isSuper) return;
    
    const confirm1 = confirm('¡ADVERTENCIA CRÍTICA!\n¿Está completamente seguro de que desea eliminar TODOS los formularios registrados? Esta acción eliminará permanentemente todos los registros y sus firmas, y no se puede deshacer.');
    if (!confirm1) return;
    
    const confirm2 = confirm('Por favor confirme una vez más: ¿Eliminar absolutamente todos los formularios del sistema?');
    if (!confirm2) return;
    
    try {
      const { error } = await supabaseClient.from('formularios').delete().neq('id', 0);
      if (error) throw error;
      alert('Todos los formularios han sido eliminados correctamente.');
      loadDashboardData();
    } catch (err) {
      alert('Error al eliminar formularios: ' + err.message);
    }
  });

  // Forzar cambio de contraseña en primer ingreso
  const btnForce = document.getElementById('btn-force-password');
  if (btnForce) btnForce.addEventListener('click', async () => {
    const p1 = document.getElementById('force-new-password').value;
    const p2 = document.getElementById('force-confirm-password').value;
    if (!p1 || p1.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (p1 !== p2) { alert('Las contraseñas no coinciden.'); return; }
    btnForce.textContent = 'Actualizando...'; btnForce.disabled = true;
    try {
      const { error: updErr } = await supabaseClient.auth.updateUser({ password: p1 });
      if (updErr) throw updErr;
      if (window.currentUserData && window.currentUserData.id) {
        await supabaseClient.from('perfiles').update({ requiere_cambio_pass: false }).eq('id', window.currentUserData.id);
        window.currentUserData.requiere_cambio_pass = false;
      }
      document.getElementById('force-password-modal')?.classList.remove('active');
      finishLogin();
    } catch (e) {
      alert('Error al actualizar la contraseña: ' + e.message);
    }
    btnForce.textContent = 'Actualizar Contraseña'; btnForce.disabled = false;
  });

  function isCanvasBlank(canvas) {
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width === 0 || canvas.height === 0) return true;
    const pixelBuffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  }

  let currentAdminData = null;
  function openAdminPreview(formData) {
    if (dashboardModal) dashboardModal.classList.remove('active');
    document.getElementById('admin-tab-bar')?.classList.remove('visible');
    document.getElementById('fab-add-user')?.classList.remove('visible');
    if (wizardContainer) wizardContainer.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'block';
    document.getElementById('preview-actions').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'flex';
    currentAdminData = formData;
    const d = formData.datos_completos || formData;
    document.getElementById('doc-empresa').innerText = d.empresa || '';
    document.getElementById('doc-cedula').innerText = d.cedula || '';
    document.getElementById('doc-nombre').innerText = d.nombre || '';
    const makeEditable = (id, val) => {
      const el = document.getElementById(id);
      if(el) { el.innerText = val || ''; el.contentEditable = "true"; el.style.backgroundColor = "rgba(255, 255, 0, 0.1)"; el.style.border = "1px dashed #ccc"; }
    };
    makeEditable('doc-centro_funcional', d.centro_funcional);
    makeEditable('doc-codigo_puesto', d.codigo_puesto);
    makeEditable('doc-nombre_puesto', d.nombre_puesto);
    makeEditable('doc-observaciones', d.observaciones);
    makeEditable('doc-salario_quincenal', d.salario_quincenal);
    makeEditable('doc-salario_mensual', d.salario_mensual);
    makeEditable('doc-escrito_por', d.escrito_por || 'Generalista RH');
    makeEditable('doc-aprobado_por', d.aprobado_por || 'Gerencia Financiera');
    document.getElementById('doc-rige_desde').innerText = d.fecha_rige || d.rige_desde || '';
    document.getElementById('doc-hasta').innerText = d.fecha_hasta || d.hasta || '';
    document.getElementById('doc-dias_habiles').innerText = d.total_dias || d.dias_habiles || '';
    document.getElementById('doc-fecha_actual').innerText = d.fecha_actual || new Date(formData.created_at).toLocaleDateString();
    
    // Update the grid with the specific action from the DB
    populateOptionsGrid(d.tipo_accion);

    // Poblar nombres bajo las firmas y permitir edición en Jefatura / RRHH
    const signNames = document.querySelectorAll('.sign-name');
    const adminDefaultName = (window.currentUserData && (window.currentUserData.nombre || window.currentUserData.email)) || 'Jefatura Inmediata';
    if (signNames[0]) signNames[0].innerText = d.nombre || formData.nombre || 'Nombre';
    if (signNames[1]) {
      signNames[1].innerText = formData.nombre_jefatura || d.nombre_jefatura || adminDefaultName;
      signNames[1].contentEditable = "true";
      signNames[1].style.backgroundColor = "rgba(255, 255, 0, 0.1)";
      signNames[1].style.border = "1px dashed #ccc";
      signNames[1].title = "Haga clic para editar el nombre de quien aprueba (Jefatura)";
    }
    if (signNames[2]) {
      signNames[2].innerText = formData.nombre_recursos_humanos || d.nombre_recursos_humanos || 'Desarrollo Humano';
      signNames[2].contentEditable = "true";
      signNames[2].style.backgroundColor = "rgba(255, 255, 0, 0.1)";
      signNames[2].style.border = "1px dashed #ccc";
      signNames[2].title = "Haga clic para editar el nombre de Desarrollo Humano";
    }

    // Limpiar y redimensionar primero, luego dibujar firmas guardadas si existen
    [canvasEmpleado, canvasSuperior, canvasRRHH].forEach(c => {
      if (c) {
        resizeCanvas(c);
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
      }
    });
    if (padSuperior) padSuperior.clear();
    if (padRRHH) padRRHH.clear();

    const firmaEmp = formData.firma_empleado || d.firma_empleado;
    if (firmaEmp && canvasEmpleado) {
      const img = new Image();
      img.onload = () => drawImageFitted(canvasEmpleado, img);
      img.src = firmaEmp;
    }
    const firmaSup = formData.firma_jefatura || d.firma_superior || d.firma_jefatura;
    if (firmaSup && canvasSuperior) {
      const imgS = new Image();
      imgS.onload = () => drawImageFitted(canvasSuperior, imgS);
      imgS.src = firmaSup;
    }
    const firmaRh = formData.firma_recursos_humanos || d.firma_rrhh || d.firma_recursos_humanos;
    if (firmaRh && canvasRRHH) {
      const imgR = new Image();
      imgR.onload = () => drawImageFitted(canvasRRHH, imgR);
      imgR.src = firmaRh;
    }

    if (canvasEmpleado) { canvasEmpleado.style.pointerEvents = 'none'; canvasEmpleado.oncontextmenu = (e) => { e.preventDefault(); return false; }; }
    const controls = document.querySelectorAll('.sign-controls');
    if (controls && controls[0]) controls[0].style.display = 'none';
    if (controls && controls[1]) controls[1].style.display = 'flex';
    if (controls && controls[2]) controls[2].style.display = 'flex';
    [canvasSuperior, canvasRRHH].forEach(c => {
      if (c) c.style.pointerEvents = 'auto';
    });
  }

  document.getElementById('btn-admin-cancel')?.addEventListener('click', () => {
    if (previewContainer) previewContainer.style.display = 'none';
    if (wizardContainer) wizardContainer.style.display = 'block';
    if (dashboardModal) dashboardModal.classList.add('active');
    document.getElementById('admin-tab-bar')?.classList.add('visible');
    const controls = document.querySelectorAll('.sign-controls');
    if (controls && controls[0]) controls[0].style.display = 'flex';
    if (canvasEmpleado) { canvasEmpleado.style.pointerEvents = 'auto'; canvasEmpleado.oncontextmenu = null; }
  });

  document.getElementById('btn-admin-save')?.addEventListener('click', async () => {
    if (!supabaseClient || !currentAdminData) return;
    const btn = document.getElementById('btn-admin-save');
    btn.textContent = 'Guardando...'; btn.disabled = true;

    const supHasSig = !isCanvasBlank(canvasSuperior);
    const rhHasSig = !isCanvasBlank(canvasRRHH);
    const firmaJef = supHasSig ? canvasSuperior.toDataURL() : null;
    const firmaRh = rhHasSig ? canvasRRHH.toDataURL() : null;

    const signNames = document.querySelectorAll('.sign-name');
    let nJef = signNames[1] ? signNames[1].innerText.trim() : '';
    let nRh = signNames[2] ? signNames[2].innerText.trim() : '';

    const defaultAdminName = (window.currentUserData && (window.currentUserData.nombre || window.currentUserData.email)) || '';

    if (supHasSig && (!nJef || nJef === 'Jefatura Inmediata' || nJef === 'Nombre')) {
      const res = prompt("Ingrese nombre de la Jefatura Inmediata que aprueba:", defaultAdminName);
      if (res && res.trim()) {
        nJef = res.trim();
        if (signNames[1]) signNames[1].innerText = nJef;
      } else if (defaultAdminName) {
        nJef = defaultAdminName;
        if (signNames[1]) signNames[1].innerText = nJef;
      }
    }

    try {
      let dc = { ...(currentAdminData.datos_completos || {}) };
      dc.centro_funcional = document.getElementById('doc-centro_funcional').innerText;
      dc.codigo_puesto = document.getElementById('doc-codigo_puesto').innerText;
      dc.nombre_puesto = document.getElementById('doc-nombre_puesto').innerText;
      dc.salario_quincenal = document.getElementById('doc-salario_quincenal').innerText;
      dc.salario_mensual = document.getElementById('doc-salario_mensual').innerText;
      dc.escrito_por = document.getElementById('doc-escrito_por').innerText;
      dc.aprobado_por = document.getElementById('doc-aprobado_por').innerText;
      dc.observaciones = document.getElementById('doc-observaciones').innerText;
      if (supHasSig && nJef) dc.nombre_jefatura = nJef;
      if (rhHasSig && nRh) dc.nombre_recursos_humanos = nRh;

      const nuevoEstado = (supHasSig || rhHasSig) ? 'Completado' : 'Pendiente de firma';
      const updatePayload = {
        firma_jefatura: firmaJef,
        nombre_jefatura: supHasSig ? (nJef || defaultAdminName || 'Jefatura') : null,
        firma_recursos_humanos: firmaRh,
        nombre_recursos_humanos: rhHasSig ? (nRh || 'Desarrollo Humano') : null,
        estado: nuevoEstado,
        datos_completos: dc
      };

      const { data: updatedRows, error: updErr } = await supabaseClient
        .from('formularios')
        .update(updatePayload)
        .eq('id', currentAdminData.id)
        .select();

      if (updErr) {
        throw updErr;
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Supabase no permitió actualizar el registro (0 filas modificadas). La tabla "formularios" tiene bloqueado el permiso UPDATE por políticas RLS. Ejecute el script "supabase_fix_permissions.sql" en el SQL Editor de Supabase para habilitar UPDATE.');
      }

      alert("Guardado correctamente.");
      document.getElementById('btn-admin-cancel').click();
      loadDashboardData();
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
    btn.textContent = 'Guardar Firmas Admin'; btn.disabled = false;
  });

  // ========================================
  // PREMIUM CARD-BASED RENDERING
  // ========================================
  window.allFormularios = [];

  function showSkeletonCards(container, count) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      container.innerHTML += '<div class="skeleton skeleton-card"></div>';
    }
  }

  async function loadDashboardData() {
    const container = document.getElementById('formularios-cards');
    showSkeletonCards(container, 4);
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('formularios').select('*').order('created_at', { ascending: false });
    if (error) {
      if (container) container.innerHTML = '<div class="empty-state"><p>Error al cargar datos</p></div>';
      return;
    }
    window.allFormularios = data || [];
    renderFormularios();
  }

  function isFormApproved(form) {
    const estado = form.estado || 'Pendiente de firma';
    const hasJefSig = Boolean(form.firma_jefatura || (form.datos_completos && (form.datos_completos.firma_superior || form.datos_completos.firma_jefatura)));
    const hasRhSig = Boolean(form.firma_recursos_humanos || (form.datos_completos && (form.datos_completos.firma_rrhh || form.datos_completos.firma_recursos_humanos)));
    return estado === 'Completado' || estado.startsWith('Aprobada') || hasJefSig || hasRhSig;
  }

  function getInitials(name) {
    if (!name) return 'SK';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length > 2 ? 2 : 1][0]).toUpperCase();
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '';
    // Si viene como YYYY-MM-DD
    const parts = String(dateStr).split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return dateStr;
  }

  function renderFormularios() {
    const container = document.getElementById('formularios-cards');
    if (!container) return;
    const search = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
    const status = currentStatusFilter;

    // Actualizar contadores KPI y Chips sobre el total
    const totalAll = window.allFormularios.length;
    const totalApproved = window.allFormularios.filter(f => isFormApproved(f)).length;
    const totalPending = totalAll - totalApproved;

    const kpiTotalEl = document.getElementById('kpi-total-count');
    const kpiPendEl = document.getElementById('kpi-pending-count');
    const kpiApprEl = document.getElementById('kpi-approved-count');
    if (kpiTotalEl) kpiTotalEl.textContent = totalAll;
    if (kpiPendEl) kpiPendEl.textContent = totalPending;
    if (kpiApprEl) kpiApprEl.textContent = totalApproved;

    const chipAllEl = document.getElementById('chip-count-all');
    const chipPendEl = document.getElementById('chip-count-pending');
    const chipDoneEl = document.getElementById('chip-count-done');
    if (chipAllEl) chipAllEl.textContent = totalAll;
    if (chipPendEl) chipPendEl.textContent = totalPending;
    if (chipDoneEl) chipDoneEl.textContent = totalApproved;

    let filtered = window.allFormularios;
    if (status === 'Completado') {
      filtered = filtered.filter(f => isFormApproved(f));
    } else if (status === 'Pendiente de firma') {
      filtered = filtered.filter(f => !isFormApproved(f));
    } else if (status) {
      filtered = filtered.filter(f => (f.estado || 'Pendiente de firma') === status);
    }

    if (search) {
      filtered = filtered.filter(f => {
        const dc = f.datos_completos || {};
        const haystack = [
          f.nombre,
          f.cedula,
          f.tipo_accion || dc.tipo_accion,
          dc.nombre_puesto,
          dc.centro_funcional,
          dc.empresa,
          f.nombre_jefatura || dc.nombre_jefatura
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(search);
      });
    }
    
    // Update filtered count
    const countEl = document.getElementById('form-count');
    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <p>No se encontraron solicitudes con este filtro</p>
      </div>`;
      return;
    }

    container.innerHTML = '';
    const isSuper = window.currentUserData && window.currentUserData.rol === 'superadmin';
    filtered.forEach(form => {
      const dc = form.datos_completos || {};
      const isDone = isFormApproved(form);
      const hasEmpSig = Boolean(form.firma_empleado || dc.firma_empleado);
      const hasJefSig = Boolean(form.firma_jefatura || dc.firma_superior || dc.firma_jefatura || isDone);
      const hasRhSig = Boolean(form.firma_recursos_humanos || dc.firma_rrhh || dc.firma_recursos_humanos);

      const approverName = form.nombre_jefatura
        || dc.nombre_jefatura
        || form.nombre_recursos_humanos
        || '';
      const shortApprover = approverName && approverName !== 'Nombre' && approverName !== 'Jefatura Inmediata'
        ? approverName.split(/\s+/).slice(0, 2).join(' ')
        : '';

      const statusClass = isDone ? 'status-tag--done' : 'status-tag--pending';
      const statusLabel = isDone
        ? (shortApprover ? `Aprobada · ${shortApprover}` : 'Aprobada')
        : 'Pendiente';

      const createdDate = new Date(form.created_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
      const tipoAccion = dc.tipo_accion || form.tipo_accion || 'ACCIÓN DE PERSONAL';
      const puesto = dc.nombre_puesto || dc.codigo_puesto || '';
      const depto = dc.centro_funcional || dc.empresa || '';
      const deptSummary = [puesto, depto].filter(Boolean).join(' · ');

      const rige = formatShortDate(form.fecha_rige || dc.fecha_rige);
      const hasta = formatShortDate(form.fecha_hasta || dc.fecha_hasta);
      const totalDias = form.total_dias || dc.total_dias || '';
      const periodText = (rige && hasta)
        ? `Rige: ${rige} → Hasta: ${hasta}`
        : (rige ? `Rige desde: ${rige}` : `Solicitado el ${createdDate}`);

      const initials = getInitials(form.nombre);

      const card = document.createElement('div');
      card.className = `admin-card ${isDone ? 'admin-card--approved' : ''}`;
      card.innerHTML = `
        <div>
          <div class="card-header">
            <div class="card-employee">
              <div class="card-avatar">${initials}</div>
              <div class="card-employee-info">
                <div class="card-name" title="${form.nombre || ''}">${form.nombre || 'Sin nombre'}</div>
                <div class="card-submeta">
                  <span class="card-cedula">ID: ${form.cedula || '—'}</span>
                  ${deptSummary ? `<span class="card-dot">•</span><span class="card-dept" title="${deptSummary}">${deptSummary}</span>` : ''}
                </div>
              </div>
            </div>
            <span class="status-tag ${statusClass}" title="${isDone && approverName ? 'Aprobada por: ' + approverName : statusLabel}">${statusLabel}</span>
          </div>

          <div class="card-details-box">
            <div class="card-action-row">
              <span class="card-action-type">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                ${tipoAccion}
              </span>
              ${totalDias ? `<span class="card-days-pill">${totalDias} ${Number(totalDias) === 1 ? 'día hábil' : 'días hábiles'}</span>` : ''}
            </div>
            <div class="card-period-row">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>${periodText}</span>
            </div>
          </div>

          <div class="card-pipeline">
            <span class="sig-step ${hasEmpSig ? 'sig-step--done' : 'sig-step--wait'}">
              ${hasEmpSig ? '✓' : '•'} Empleado
            </span>
            <span class="sig-step ${hasJefSig ? 'sig-step--done' : 'sig-step--wait'}">
              ${hasJefSig ? `✓ Jefatura${shortApprover ? ': ' + shortApprover : ''}` : '⏳ Jefatura'}
            </span>
            <span class="sig-step ${hasRhSig ? 'sig-step--done' : ''}">
              ${hasRhSig ? '✓ RRHH' : '• RRHH'}
            </span>
          </div>
        </div>

        <div class="card-footer">
          <span class="card-date" title="Fecha de registro">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Reg: ${createdDate}
          </span>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${isSuper ? `
              <button class="card-delete-btn" data-id="${form.id}" title="Eliminar expediente" style="background: none; border: 1px solid var(--danger-soft); color: var(--danger); padding: 7px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            ` : ''}
            <button class="card-action-btn" data-id="${form.id}">
              ${isDone ? 'Ver Documento' : 'Revisar y Firmar'}
            </button>
          </div>
        </div>
      `;
      card.addEventListener('click', () => openAdminPreview(form));
      card.querySelector('.card-action-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openAdminPreview(form);
      });
      if (isSuper) {
        card.querySelector('.card-delete-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`¿Está seguro de que desea eliminar el formulario de ${form.nombre || 'Sin nombre'}? Esta acción no se puede deshacer.`)) {
            try {
              const { error } = await supabaseClient.from('formularios').delete().eq('id', form.id);
              if (error) throw error;
              alert('Formulario eliminado correctamente.');
              loadDashboardData();
            } catch (err) {
              alert('Error al eliminar formulario: ' + err.message);
            }
          }
        });
      }
      container.appendChild(card);
    });
  }

  // Debounced search
  let searchTimer;
  document.getElementById('filter-search')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderFormularios, 300);
  });

  // ========================================
  // USER MANAGEMENT (CARDS)
  // ========================================
  let allUsuarios = [];
  const addUserModal = document.getElementById('add-user-modal');
  const userSearchInput = document.getElementById('user-search');

  // FAB + Add User Modal
  document.getElementById('fab-add-user')?.addEventListener('click', () => addUserModal?.classList.add('active'));
  if (addUserModal) addUserModal.addEventListener('click', (e) => { if (e.target === addUserModal) addUserModal.classList.remove('active'); });
  document.getElementById('btn-cancel-add-user')?.addEventListener('click', () => addUserModal?.classList.remove('active'));
  if (userSearchInput) userSearchInput.addEventListener('input', () => renderUsuariosCards());

  document.getElementById('btn-create-user')?.addEventListener('click', async () => {
    if (!supabaseClient) return;
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const roleSelect = document.getElementById('new-user-role');
    const role = (window.currentUserData.rol === 'superadmin' && roleSelect) ? roleSelect.value : 'usuario';
    const msg = document.getElementById('user-creation-msg');
    if(!email || password.length < 6) { 
        if (msg) { msg.style.color = 'red'; msg.textContent = 'Inválido.'; msg.style.display = 'block'; }
        return; 
    }
    if (msg) { msg.style.color = '#64748b'; msg.textContent = 'Creando...'; msg.style.display = 'block'; }
    try {
        const currentSession = await supabaseClient.auth.getSession();
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
            const { error: insertErr } = await supabaseClient.from('perfiles').insert([{
                id: data.user.id, email: email, rol: role, requiere_cambio_pass: true
            }]);
            if (insertErr) throw insertErr;
        }
        await supabaseClient.auth.signOut();
        if (currentSession && currentSession.data && currentSession.data.session) {
            await supabaseClient.auth.setSession({ access_token: currentSession.data.session.access_token, refresh_token: currentSession.data.session.refresh_token });
        }
        if (msg) { msg.style.color = 'var(--success)'; msg.textContent = '¡Creado!'; }
        document.getElementById('new-user-email').value = ''; 
        document.getElementById('new-user-password').value = '';
        setTimeout(() => addUserModal?.classList.remove('active'), 1500);
        loadUsuariosData();
    } catch(err) {
        if (msg) { msg.style.color = 'red'; msg.textContent = 'Error: ' + err.message; }
    }
    setTimeout(() => { if (msg) msg.style.display = 'none'; }, 5000);
  });

  async function loadUsuariosData() {
    const container = document.getElementById('usuarios-cards');
    showSkeletonCards(container, 3);
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from('perfiles').select('*');
      if (error) throw error;
      allUsuarios = data || [];
      renderUsuariosCards();
    } catch (error) {
      if (container) container.innerHTML = `<div class="empty-state"><p>Error: ${error.message}</p></div>`;
    }
  }

  function renderUsuariosCards() {
    const container = document.getElementById('usuarios-cards');
    if (!container) return;
    const search = userSearchInput ? userSearchInput.value.toLowerCase() : '';
    const isSuper = window.currentUserData.rol === 'superadmin';
    let filtered = [...allUsuarios];
    if (!isSuper) filtered = filtered.filter(u => u.rol === 'usuario');
    if (search) filtered = filtered.filter(u => u.email && u.email.toLowerCase().includes(search));

    const countEl = document.getElementById('user-count');
    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
        <p>No hay usuarios registrados</p>
      </div>`;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(user => {
      const initials = (user.email || '??').substring(0, 2).toUpperCase();
      const roleClass = user.rol === 'superadmin' ? 'role-superadmin' : '';
      const isActive = user.activo !== false;
      const statusClass = isActive ? 'status-active' : 'status-inactive';
      const statusLabel = isActive ? 'Activo' : 'Inactivo';
      const canManage = isSuper || user.rol === 'usuario';
      const canDelete = (isSuper && user.rol !== 'superadmin') || (!isSuper && user.rol === 'usuario');

      const card = document.createElement('div');
      card.className = 'user-card';
      card.innerHTML = `
        <div class="user-card-header">
          <div class="user-avatar">${initials}</div>
          <div class="user-card-info">
            <div class="user-card-email">${user.nombre || user.email}</div>
            <div class="user-card-meta">
              <span class="role-tag ${roleClass}">${user.rol}</span>
              <span class="status-badge ${statusClass}">${statusLabel}</span>
            </div>
          </div>
        </div>
        ${canManage ? `<div class="user-card-actions">
          <button class="btn-icon" onclick="openEditUser('${user.id}')" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Editar
          </button>
          <button class="btn-icon" onclick="openResetPassword('${user.id}')" title="Reset">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            Clave
          </button>
          ${canDelete ? `<button class="btn-icon delete" onclick="deleteUser('${user.id}')" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Borrar
          </button>` : ''}
        </div>` : ''}
      `;
      container.appendChild(card);
    });
  }


  // Edit user modal logic
  const editUserModal = document.getElementById('edit-user-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit-user');
  const btnSaveEdit = document.getElementById('btn-save-edit-user');
  if (editUserModal) editUserModal.addEventListener('click', (e) => { if (e.target === editUserModal) editUserModal.classList.remove('active'); });
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => editUserModal?.classList.remove('active'));

  window.openEditUser = function(userId) {
    const u = allUsuarios.find(x => x.id === userId);
    if (!u) return;
    const isSuper = window.currentUserData.rol === 'superadmin';
    document.getElementById('edit-user-id').value = u.id;
    document.getElementById('edit-user-name').value = u.nombre || '';
    document.getElementById('edit-user-email').value = u.email || '';
    const roleGrp = document.getElementById('edit-role-group');
    if (roleGrp) roleGrp.style.display = isSuper ? 'block' : 'none';
    const roleSel = document.getElementById('edit-user-role');
    if (roleSel) roleSel.value = u.rol || 'usuario';
    const statusSel = document.getElementById('edit-user-status');
    if (statusSel) statusSel.value = (u.activo !== false).toString();
    const msg = document.getElementById('edit-user-msg');
    if (msg) { msg.style.display = 'none'; msg.textContent = ''; }
    editUserModal.classList.add('active');
  };

  if (btnSaveEdit) btnSaveEdit.addEventListener('click', async () => {
    if (!supabaseClient) return alert('DB no disponible');
    const id = document.getElementById('edit-user-id').value;
    const nombre = document.getElementById('edit-user-name').value;
    const isSuper = window.currentUserData.rol === 'superadmin';
    const roleSel = document.getElementById('edit-user-role');
    const nuevoRol = isSuper && roleSel ? roleSel.value : undefined;
    const activoVal = document.getElementById('edit-user-status').value === 'true';
    const update = { nombre, activo: activoVal };
    if (nuevoRol) update.rol = nuevoRol;
    const msg = document.getElementById('edit-user-msg');
    try {
      // Seguridad UI: si no es superadmin, impedir que intente editar admins/superadmin
      if (!isSuper) {
        const target = allUsuarios.find(u => u.id === id);
        if (target && target.rol !== 'usuario') throw new Error('No tienes permisos para editar este usuario');
      }
      const { error } = await supabaseClient.from('perfiles').update(update).eq('id', id);
      if (error) throw error;
      if (msg) { msg.style.display = 'block'; msg.style.color = 'var(--success)'; msg.textContent = 'Guardado.'; }
      setTimeout(() => { editUserModal.classList.remove('active'); loadUsuariosData(); }, 800);
    } catch (e) {
      if (msg) { msg.style.display = 'block'; msg.style.color = 'red'; msg.textContent = 'Error: ' + e.message; }
    }
  });

  // Reset password modal logic
  const resetModal = document.getElementById('admin-reset-modal');
  const btnCancelReset = document.getElementById('btn-cancel-reset');
  const btnSaveReset = document.getElementById('btn-save-reset');
  if (resetModal) resetModal.addEventListener('click', (e) => { if (e.target === resetModal) resetModal.classList.remove('active'); });
  if (btnCancelReset) btnCancelReset.addEventListener('click', () => resetModal?.classList.remove('active'));

  window.openResetPassword = function(userId) {
    document.getElementById('reset-user-id').value = userId;
    const u = allUsuarios.find(x => x.id === userId);
    document.getElementById('reset-new-password').value = '';
    document.getElementById('reset-confirm-password').value = '';
    const msg = document.getElementById('reset-msg');
    if (msg) { msg.textContent = u && u.email ? `Usuario: ${u.email}` : ''; msg.style.display = u && u.email ? 'block' : 'none'; msg.style.color = '#64748b'; }
    resetModal.classList.add('active');
  };

  if (btnSaveReset) btnSaveReset.addEventListener('click', async () => {
    if (!supabaseClient) return alert('DB no disponible');
    const id = document.getElementById('reset-user-id').value;
    const p1 = document.getElementById('reset-new-password').value;
    const p2 = document.getElementById('reset-confirm-password').value;
    const msg = document.getElementById('reset-msg');
    if (!p1 || p1.length < 6 || p1 !== p2) {
      if (msg) { msg.style.display = 'block'; msg.style.color = 'red'; msg.textContent = 'Contraseña inválida o no coincide.'; }
      return;
    }
    try {
      const { error } = await supabaseClient.rpc('admin_update_password', { user_id: id, new_password: p1 });
      if (error) throw error;
      // Forzar cambio de contraseña en el próximo inicio de sesión del usuario
      await supabaseClient.from('perfiles').update({ requiere_cambio_pass: true }).eq('id', id);
      if (msg) { msg.style.display = 'block'; msg.style.color = 'var(--success)'; msg.textContent = 'Actualizada. El usuario deberá cambiarla al iniciar sesión.'; }
      setTimeout(() => resetModal.classList.remove('active'), 800);
    } catch(e) {
      console.warn('RPC admin_update_password falló, intento enviar email de restablecimiento:', e);
      // Fallback: enviar email de restablecimiento si SMTP está configurado
      try {
        const u = allUsuarios.find(x => x.id === id);
        if (!u || !u.email) throw new Error('Email no disponible');
        const { error: mailErr } = await supabaseClient.auth.resetPasswordForEmail(u.email, { redirectTo: window.location.origin });
        if (mailErr) throw mailErr;
        if (msg) { msg.style.display = 'block'; msg.style.color = 'var(--success)'; msg.textContent = 'No se pudo actualizar directamente. Se envió correo de restablecimiento.'; }
      } catch (e2) {
        if (msg) { msg.style.display = 'block'; msg.style.color = 'red'; msg.textContent = 'Error: ' + e2.message; }
      }
    }
  });

  window.deleteUser = async function(userId) {
      if (!confirm('¿Eliminar cuenta permanentemente?')) return;
      if (!supabaseClient) return alert("DB no disponible");
      const { error } = await supabaseClient.rpc('admin_delete_user', { user_id: userId });
      if (error) alert('Error: ' + error.message);
      else { alert('Eliminado.'); loadUsuariosData(); }
  };

  if (wizardContainer) wizardContainer.classList.add('active'); 
  // Cargar datos del dashboard sólo bajo demanda (login o apertura de pestaña)
  // Registrar SW solo en producción (evitar caché en localhost)
  if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.protocol === 'https:') {
    navigator.serviceWorker.register('./service-worker.js').catch(err => console.error('SW error', err));
  } else if ('serviceWorker' in navigator) {
    // En desarrollo: desregistrar SWs previos para evitar servir HTML/CSS obsoletos
    navigator.serviceWorker.getRegistrations().then(list => list.forEach(r => r.unregister()));
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();



