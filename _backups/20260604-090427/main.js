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
  // ==========================================
  // PANEL DE ADMINISTRADOR OCULTO
  // ==========================================
  const wizardLogo = document.querySelector('.wizard-header img');
  let clickCount = 0;
  let clickTimer;

  if (wizardLogo) {
    wizardLogo.style.cursor = 'pointer';
    wizardLogo.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      if (clickCount >= 5) {
        document.getElementById('admin-login-modal').classList.add('active');
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

  // Wizard Navigation
  const steps = document.querySelectorAll('.step');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnPreview = document.getElementById('btn-preview');
  const progressFill = document.getElementById('progress-fill');
  const wizardContainer = document.getElementById('wizard-container');
  const previewContainer = document.getElementById('preview-container');
  const btnBackWizard = document.getElementById('btn-back-wizard');
  const btnShare = document.getElementById('btn-share');
  
  let currentStep = 0;

  function updateWizard() {
    steps.forEach((step, index) => {
      step.classList.toggle('active', index === currentStep);
    });
    if (btnPrev) btnPrev.disabled = currentStep === 0;
    if (currentStep === steps.length - 1) {
      if (btnNext) btnNext.style.display = 'none';
      if (btnPreview) btnPreview.style.display = 'block';
    } else {
      if (btnNext) btnNext.style.display = 'block';
      if (btnPreview) btnPreview.style.display = 'none';
    }
    if (progressFill) progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  }

  if (btnNext) btnNext.addEventListener('click', () => {
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

  // Búsqueda Hacienda
  const cedulaInput = document.getElementById('cedula');
  const nombreInput = document.getElementById('nombre');
  if (cedulaInput) {
    cedulaInput.addEventListener('blur', async () => {
      const cedula = cedulaInput.value.replace(/[^0-9]/g, '');
      if (cedula.length >= 9) {
        try {
          const response = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`);
          if (response.ok) {
            const data = await response.json();
            if (data.nombre && nombreInput) nombreInput.value = data.nombre;
          }
        } catch (error) {
          console.error('Error Hacienda:', error);
        }
      }
    });
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

  function populateOptionsGrid() {
    const grid = document.getElementById('doc-options-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const selectedAction = document.getElementById('tipo_accion').value;
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

  // Canvases y pads deben declararse ANTES de usarlos en Vista Previa
  const canvasEmpleado = document.getElementById('canvas-empleado');
  const canvasSuperior = document.getElementById('canvas-superior');
  const canvasRRHH = document.getElementById('canvas-rrhh');
  const padEmpleado = canvasEmpleado ? new SignaturePad(canvasEmpleado) : null;
  const padSuperior = canvasSuperior ? new SignaturePad(canvasSuperior) : null;
  const padRRHH = canvasRRHH ? new SignaturePad(canvasRRHH) : null;

  if (btnPreview) {
    btnPreview.addEventListener('click', () => {
      document.getElementById('doc-empresa').innerText = document.getElementById('empresa').value;
      document.getElementById('doc-cedula').innerText = document.getElementById('cedula').value;
      document.getElementById('doc-nombre').innerText = document.getElementById('nombre').value;
      document.getElementById('doc-centro_funcional').innerText = document.getElementById('centro_funcional').value;
      document.getElementById('doc-codigo_puesto').innerText = document.getElementById('codigo_puesto').value;
      document.getElementById('doc-nombre_puesto').innerText = document.getElementById('nombre_puesto').value;
      document.getElementById('doc-rige_desde').innerText = formatDateToSpanish(document.getElementById('rige_desde').value);
      document.getElementById('doc-hasta').innerText = formatDateToSpanish(document.getElementById('hasta').value);
      document.getElementById('doc-dias_habiles').innerText = document.getElementById('dias_habiles').value;
      document.getElementById('doc-salario_mensual').innerText = document.getElementById('salario_mensual').value;
      document.getElementById('doc-observaciones').innerText = document.getElementById('observaciones').value;
      document.getElementById('doc-firma-nombre-empleado').innerText = document.getElementById('nombre').value;
      document.getElementById('doc-fecha_actual').innerText = formatDateToSpanish(new Date().toISOString().split('T')[0]);

      populateOptionsGrid();
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

  // Descargar PDF directo en Admin
  const btnAdminDownload = document.getElementById('btn-admin-download');
  if (btnAdminDownload) {
    btnAdminDownload.addEventListener('click', async () => {
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
        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        console.error(err); alert('Error al descargar el PDF.');
      } finally {
        if (wrapper) wrapper.style.overflowX = originalOverflow; 
        if (docSheet) docSheet.style.transform = originalTransform;
        document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'flex');
      }
    });
  }

  // (declarados arriba)

  function resizeCanvas(canvas) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth * ratio;
    canvas.height = parent.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
  }

  function drawImageFitted(canvas, img) {
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
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
        const padCanvas = pad.canvas;
        const targetWidth = padCanvas.width, targetHeight = padCanvas.height;
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetWidth; finalCanvas.height = targetHeight;
        const fCtx = finalCanvas.getContext('2d');
        fCtx.clearRect(0, 0, targetWidth, targetHeight);
        const scale = Math.min(targetWidth / w, targetHeight / h) * 0.90;
        const finalW = w * scale, finalH = h * scale;
        const xOff = (targetWidth - finalW) / 2, yOff = (targetHeight - finalH) / 2;
        fCtx.imageSmoothingEnabled = true; fCtx.imageSmoothingQuality = 'high';
        fCtx.drawImage(highResCanvas, xOff, yOff, finalW, finalH);
        pad.clear();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        pad.fromDataURL(finalCanvas.toDataURL('image/png'), { ratio: ratio });
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
      btnViewPdf.textContent = "Cargando..."; btnViewPdf.disabled = true;
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
        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.click();
      } catch (err) {
        console.error(err); alert("Error al previsualizar el PDF.");
      } finally {
        if (wrapper) wrapper.style.overflowX = originalOverflow; 
        if (docSheet) docSheet.style.transform = originalTransform;
        document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'flex');
        btnViewPdf.textContent = "📄 Ver PDF"; btnViewPdf.disabled = false;
      }
    });
  }

  if (btnShare) {
    btnShare.addEventListener('click', async () => {
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
        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        if (supabaseClient) {
          const datosFormulario = {
            empresa: document.getElementById('empresa').value,
            cedula: document.getElementById('cedula').value,
            nombre: document.getElementById('nombre').value,
            centro_funcional: document.getElementById('centro_funcional').value,
            codigo_puesto: document.getElementById('codigo_puesto').value,
            nombre_puesto: document.getElementById('nombre_puesto').value,
            tipo_accion: document.getElementById('tipo_accion').value,
            fecha_rige: document.getElementById('rige_desde').value,
            fecha_hasta: document.getElementById('hasta').value,
            total_dias: document.getElementById('dias_habiles').value,
            salario_mensual: document.getElementById('salario_mensual').value,
            observaciones: document.getElementById('observaciones').value,
            fecha_actual: document.getElementById('doc-fecha_actual').innerText
          };
          const firmaEmpleado = document.getElementById('canvas-empleado').toDataURL();
          await supabaseClient.from('formularios').insert([{
            cedula: datosFormulario.cedula, nombre: datosFormulario.nombre, tipo_accion: datosFormulario.tipo_accion,
            fecha_rige: datosFormulario.fecha_rige, fecha_hasta: datosFormulario.fecha_hasta,
            total_dias: datosFormulario.total_dias, datos_completos: datosFormulario,
            firma_empleado: firmaEmpleado, estado: 'Pendiente de firma'
          }]);
        }
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
        if (supabaseClient) {
          try {
            await supabaseClient.auth.signInWithPassword({ email, password });
          } catch(e) {}
        }
        window.currentUserData = { id: 'superadmin_id', email: email, rol: 'superadmin' };
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
    const roleGroup = document.getElementById('role-selection-group');

    if (tabUsers) tabUsers.style.display = 'inline-block';
    if (roleGroup) roleGroup.style.display = isSuper ? 'block' : 'none';

    if (loginModal) loginModal.classList.remove('active');
    if (dashboardModal) dashboardModal.classList.add('active');
    
    const passInput = document.getElementById('admin-password');
    if (passInput) passInput.value = '';
    
    const tabForms = document.getElementById('tab-btn-formularios');
    if (tabForms) tabForms.click();
  }

  document.getElementById('btn-close-login')?.addEventListener('click', () => loginModal?.classList.remove('active'));
  document.getElementById('btn-close-dashboard')?.addEventListener('click', () => dashboardModal?.classList.remove('active'));

  // Forzar cambio de contraseña en primer ingreso
  const btnForce = document.getElementById('btn-force-password');
  if (btnForce) btnForce.addEventListener('click', async () => {
    const p1 = document.getElementById('force-new-password').value;
    const p2 = document.getElementById('force-confirm-password').value;
    if (!p1 || p1.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (p1 !== p2) { alert('Las contraseñas no coinciden.'); return; }
    btnForce.textContent = 'Actualizando...'; btnForce.disabled = true;
    try {
      // Cambiar la contraseña del usuario actual
      const { error: updErr } = await supabaseClient.auth.updateUser({ password: p1 });
      if (updErr) throw updErr;
      // Marcar que ya no requiere cambio
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

  document.getElementById('tab-btn-formularios')?.addEventListener('click', (e) => {
    e.target.classList.replace('btn-secondary', 'btn-primary');
    document.getElementById('tab-btn-usuarios')?.classList.replace('btn-primary', 'btn-secondary');
    document.getElementById('panel-formularios').style.display = 'block';
    document.getElementById('panel-usuarios').style.display = 'none';
    loadDashboardData();
  });

  document.getElementById('tab-btn-usuarios')?.addEventListener('click', (e) => {
    e.target.classList.replace('btn-secondary', 'btn-primary');
    document.getElementById('tab-btn-formularios')?.classList.replace('btn-primary', 'btn-secondary');
    document.getElementById('panel-usuarios').style.display = 'block';
    document.getElementById('panel-formularios').style.display = 'none';
    loadUsuariosData();
  });

  let currentAdminData = null;
  function openAdminPreview(formData) {
    if (dashboardModal) dashboardModal.classList.remove('active');
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

    // Cargar firma del empleado desde el registro (prioriza columna top-level)
    const firmaEmp = formData.firma_empleado || d.firma_empleado;
    if (firmaEmp && canvasEmpleado) {
      resizeCanvas(canvasEmpleado);
      const img = new Image(); img.onload = () => drawImageFitted(canvasEmpleado, img); img.src = firmaEmp;
    } else if (canvasEmpleado) {
      resizeCanvas(canvasEmpleado);
    }

    // Superior
    const firmaSup = formData.firma_jefatura || d.firma_superior;
    if (firmaSup && canvasSuperior) {
      resizeCanvas(canvasSuperior);
      const imgS = new Image(); imgS.onload = () => drawImageFitted(canvasSuperior, imgS); imgS.src = firmaSup;
    } else if (canvasSuperior) {
      resizeCanvas(canvasSuperior);
    }

    // RRHH
    const firmaRh = formData.firma_recursos_humanos || d.firma_rrhh;
    if (firmaRh && canvasRRHH) {
      resizeCanvas(canvasRRHH);
      const imgR = new Image(); imgR.onload = () => drawImageFitted(canvasRRHH, imgR); imgR.src = firmaRh;
    } else if (canvasRRHH) {
      resizeCanvas(canvasRRHH);
    }
    // En modo Admin: bloquear la firma del empleado (solo lectura, sin copiar)
    if (canvasEmpleado) {
      canvasEmpleado.style.pointerEvents = 'none';
      canvasEmpleado.oncontextmenu = (e) => { e.preventDefault(); return false; };
    }
    const controls = document.querySelectorAll('.sign-controls');
    if (controls && controls[0]) controls[0].style.display = 'none'; // Ocultar subir/borrar del empleado
    if (controls && controls[1]) controls[1].style.display = 'flex';
    if (controls && controls[2]) controls[2].style.display = 'flex';
    [canvasSuperior, canvasRRHH].forEach(c => {
      if (c) {
          const ctx = c.getContext('2d'); ctx.clearRect(0,0, c.width, c.height); c.style.pointerEvents = 'auto';
      }
    });
  }

  document.getElementById('btn-admin-cancel')?.addEventListener('click', () => {
    if (previewContainer) previewContainer.style.display = 'none';
    if (wizardContainer) wizardContainer.style.display = 'block';
    if (dashboardModal) dashboardModal.classList.add('active');
    // Restaurar controles y permisos de firma para uso normal fuera del Admin
    const controls = document.querySelectorAll('.sign-controls');
    if (controls && controls[0]) controls[0].style.display = 'flex';
    if (canvasEmpleado) { canvasEmpleado.style.pointerEvents = 'auto'; canvasEmpleado.oncontextmenu = null; }
  });

  document.getElementById('btn-admin-save')?.addEventListener('click', async () => {
    if (!supabaseClient || !currentAdminData) return;
    const btn = document.getElementById('btn-admin-save');
    btn.textContent = 'Guardando...'; btn.disabled = true;
    const firmaJef = canvasSuperior.toDataURL();
    const firmaRh = canvasRRHH.toDataURL();
    let nJef = document.querySelectorAll('.sign-name')[1].innerText;
    let nRh = document.querySelectorAll('.sign-name')[2].innerText;
    if (!nJef || nJef === 'Jefatura Inmediata' || nJef === 'Nombre') {
      const res = prompt("Ingrese nombre de la Jefatura Inmediata:");
      if (res) nJef = res;
    }
    try {
      let dc = currentAdminData.datos_completos || {};
      dc.centro_funcional = document.getElementById('doc-centro_funcional').innerText;
      dc.codigo_puesto = document.getElementById('doc-codigo_puesto').innerText;
      dc.nombre_puesto = document.getElementById('doc-nombre_puesto').innerText;
      dc.salario_quincenal = document.getElementById('doc-salario_quincenal').innerText;
      dc.salario_mensual = document.getElementById('doc-salario_mensual').innerText;
      dc.escrito_por = document.getElementById('doc-escrito_por').innerText;
      dc.aprobado_por = document.getElementById('doc-aprobado_por').innerText;
      dc.observaciones = document.getElementById('doc-observaciones').innerText;
      await supabaseClient.from('formularios').update({
        firma_jefatura: firmaJef, nombre_jefatura: nJef,
        firma_recursos_humanos: firmaRh, nombre_recursos_humanos: nRh,
        estado: 'Completado', datos_completos: dc
      }).eq('id', currentAdminData.id);
      alert("Guardado correctamente.");
      document.getElementById('btn-admin-cancel').click();
      loadDashboardData();
    } catch (e) {
      alert("Error: " + e.message);
    }
    btn.textContent = 'Guardar Firmas Admin'; btn.disabled = false;
  });

  window.allFormularios = [];
  async function loadDashboardData() {
    const tbody = document.getElementById('formularios-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center;">Cargando...</td></tr>';
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('formularios').select('*').order('created_at', { ascending: false });
    if (error) { if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">Error.</td></tr>`; return; }
    window.allFormularios = data || [];
    renderFormularios();
  }

  function renderFormularios() {
    const tbody = document.getElementById('formularios-tbody');
    if (!tbody) return;
    const search = document.getElementById('filter-search').value.toLowerCase();
    const status = document.getElementById('filter-status').value;
    let filtered = window.allFormularios;
    if (status) filtered = filtered.filter(f => (f.estado || 'Pendiente de firma') === status);
    if (search) filtered = filtered.filter(f => (f.nombre && f.nombre.toLowerCase().includes(search)) || (f.cedula && f.cedula.toLowerCase().includes(search)));
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center;">Sin coincidencias.</td></tr>'; return; }
    tbody.innerHTML = '';
    filtered.forEach(form => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid #e2e8f0";
      const estado = form.estado || 'Pendiente de firma';
      tr.innerHTML = `
        <td style="padding: 12px;">${new Date(form.created_at).toLocaleDateString()}</td>
        <td style="padding: 12px;">${form.cedula || '-'}</td>
        <td style="padding: 12px;">${form.nombre || '-'}</td>
        <td style="padding: 12px; color: ${estado === 'Completado' ? 'var(--success)' : 'orange'};">${estado}</td>
        <td style="padding: 12px;"><button class="btn btn-primary" style="padding: 6px 12px;">Ver / Firmar</button></td>
      `;
      tr.querySelector('button').addEventListener('click', () => openAdminPreview(form));
      tbody.appendChild(tr);
    });
  }

  document.getElementById('filter-search')?.addEventListener('input', renderFormularios);
  document.getElementById('filter-status')?.addEventListener('change', renderFormularios);

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
                id: data.user.id,
                email: email,
                rol: role,
                requiere_cambio_pass: true
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
        setTimeout(() => document.getElementById('add-user-modal')?.classList.remove('active'), 1500);
        loadUsuariosData();
    } catch(err) {
        if (msg) { msg.style.color = 'red'; msg.textContent = 'Error: ' + err.message; }
    }
    setTimeout(() => { if (msg) msg.style.display = 'none'; }, 5000);
  });

  // GESTIÓN USUARIOS
  const addUserModal = document.getElementById('add-user-modal');
  const userSearchInput = document.getElementById('user-search');
  if (addUserModal) addUserModal.addEventListener('click', (e) => { if (e.target === addUserModal) addUserModal.classList.remove('active'); });
  document.getElementById('btn-show-add-user')?.addEventListener('click', () => addUserModal?.classList.add('active'));
  document.getElementById('btn-cancel-add-user')?.addEventListener('click', () => addUserModal?.classList.remove('active'));
  if (userSearchInput) userSearchInput.addEventListener('input', () => renderUsuariosTable());

  let allUsuarios = [];
  async function loadUsuariosData() {
    const tbody = document.getElementById('usuarios-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center;">Cargando...</td></tr>';
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from('perfiles').select('*');
      if (error) throw error;
      allUsuarios = data || [];
      renderUsuariosTable();
    } catch (error) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding: 40px; text-align: center; color: var(--danger);">Error: ${error.message}</td></tr>`;
    }
  }

  function renderUsuariosTable() {
    const tbody = document.getElementById('usuarios-tbody');
    if (!tbody) return;
    const search = userSearchInput ? userSearchInput.value.toLowerCase() : '';
    const isSuper = window.currentUserData.rol === 'superadmin';
    
    let filtered = [...allUsuarios];
    
    // FILTRO JERÁRQUICO
    if (!isSuper) {
        // Admins solo ven usuarios (no admins ni superadmin)
        filtered = filtered.filter(u => u.rol === 'usuario');
    }
    // Superadmin ve a todos

    if (search) filtered = filtered.filter(u => u.email && u.email.toLowerCase().includes(search));
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Sin resultados.</td></tr>'; return; }
    tbody.innerHTML = '';
    filtered.forEach(user => {
      const initials = (user.email||'??').substring(0,2).toUpperCase();
      const tr = document.createElement('tr');
      const roleClass = user.rol === 'superadmin' ? 'role-superadmin' : '';
      const isActive = user.activo !== false; // default true
      const statusClass = isActive ? 'status-active' : 'status-inactive';
      const statusLabel = isActive ? 'Activo' : 'Inactivo';
      const canManage = isSuper || user.rol === 'usuario';
      const canDelete = (isSuper && user.rol !== 'superadmin') || (!isSuper && user.rol === 'usuario');
      tr.innerHTML = `
        <td><div class="user-info"><div class="user-avatar">${initials}</div><div><div style="font-weight:600;">${user.nombre ? user.nombre : user.email}</div><div style="font-size:0.75rem; color:var(--text-muted);">${user.email}${user.nombre ? ` · ${(user.id||'').substring(0,8)}...` : ''}</div></div></div></td>
        <td><span class="role-tag ${roleClass}">${user.rol}</span></td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td style="color:var(--text-muted);">${user.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleDateString() : 'Nunca'}</td>
        <td><div class="action-buttons">
          ${canManage ? `<button class="btn-icon" onclick="openEditUser('${user.id}')" title="Editar"><svg xmlns=\"http://www.w3.org/2000/svg\" style=\"width:16px;height:16px;\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M11 5h2m-1 0v14m7-7H5\" /></svg></button>` : ''}
          ${canManage ? `<button class=\"btn-icon\" onclick=\"openResetPassword('${user.id}')\" title=\"Reset Clave\"><svg xmlns=\"http://www.w3.org/2000/svg\" style=\"width:16px;height:16px;\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z\" /></svg></button>` : ''}
          ${canDelete ? `<button class=\"btn-icon delete\" onclick=\"deleteUser('${user.id}')\" title=\"Eliminar\"><svg xmlns=\"http://www.w3.org/2000/svg\" style=\"width:16px;height:16px;\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16\" /></svg></button>` : ''}
        </div></td>
      `;
      tbody.appendChild(tr);
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
  loadDashboardData();
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



