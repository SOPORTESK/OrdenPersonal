import SignaturePad from 'signature_pad';
import html2pdf from 'html2pdf.js';

// Inicializar Supabase (usando el CDN global)
const supabaseUrl = 'https://rjubbjhilulctbqsjxuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdWJiamhpbHVsY3RicXNqeHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjQ3ODQsImV4cCI6MjA5NTkwMDc4NH0.h7QSxgylv4Hzwg8uho5qsWtzJ8IrZTNjUSixBavL9hQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
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
    modalInput.value = '';
    modalError.classList.remove('show');
    premiumModal.classList.add('active');
    setTimeout(() => modalInput.focus(), 100);
  }

  function closeModal() {
    premiumModal.classList.remove('active');
    if (currentSelectTarget && currentSelectTarget.value === 'add') {
      currentSelectTarget.value = ''; // Resetear si cancela
    }
    currentSelectTarget = null;
  }

  btnModalCancel.addEventListener('click', closeModal);

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
      }
      currentSelectTarget.value = newVal;
      premiumModal.classList.remove('active');
      currentSelectTarget = null;
    } else {
      modalError.classList.add('show');
    }
  });

  modalInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnModalSave.click();
  });

  // Lógica de Selects Personalizables (Centro Funcional, etc)
  const selectIds = ['centro_funcional', 'codigo_puesto', 'nombre_puesto'];
  
  selectIds.forEach(id => {
    const selectEl = document.getElementById(id);
    const storageKey = `custom_${id}`;
    
    // Cargar opciones guardadas
    const savedOptions = JSON.parse(localStorage.getItem(storageKey) || '[]');
    savedOptions.forEach(val => {
      const opt = new Option(val, val);
      // Insertar justo antes del último option ('-- Agregar nuevo --')
      selectEl.insertBefore(opt, selectEl.lastElementChild);
    });
    
    selectEl.addEventListener('change', () => {
      if (selectEl.value === 'add') {
        openModal(selectEl, storageKey);
      }
    });
  });

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

    btnPrev.disabled = currentStep === 0;
    
    if (currentStep === steps.length - 1) {
      btnNext.style.display = 'none';
      btnPreview.style.display = 'block';
    } else {
      btnNext.style.display = 'block';
      btnPreview.style.display = 'none';
    }

    progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  }

  btnNext.addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      updateWizard();
    }
  });

  btnPrev.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      updateWizard();
    }
  });

  // Búsqueda de Nombre por Cédula (Hacienda)
  const cedulaInput = document.getElementById('cedula');
  const nombreInput = document.getElementById('nombre');

  cedulaInput.addEventListener('blur', async () => {
    const cedula = cedulaInput.value.replace(/[^0-9]/g, '');
    if (cedula.length >= 9) {
      try {
        const response = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`);
        if (response.ok) {
          const data = await response.json();
          if (data.nombre) {
            nombreInput.value = data.nombre;
          }
        }
      } catch (error) {
        console.error('Error al consultar Hacienda:', error);
      }
    }
  });

  // Date Calculations (Días Hábiles)
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
    if (rigeDesdeInput.value && hastaInput.value) {
      const start = new Date(rigeDesdeInput.value + 'T00:00:00');
      const end = new Date(hastaInput.value + 'T00:00:00');
      
      if (end >= start) {
        diasHabilesInput.value = calculateBusinessDays(start, end);
      } else {
        diasHabilesInput.value = '';
      }
    }
  }

  rigeDesdeInput.addEventListener('change', updateDays);
  hastaInput.addEventListener('change', updateDays);

  // Opciones del documento original
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
    grid.innerHTML = '';
    const selectedAction = document.getElementById('tipo_accion').value;

    opcionesOriginales.forEach(opt => {
      if (!opt) {
        grid.innerHTML += `<div></div>`; // Espacio vacío
        return;
      }
      const isSelected = selectedAction === opt ? 'X' : '&nbsp;';
      grid.innerHTML += `
        <div class="opt-item">
          <div class="opt-box">${isSelected}</div>
          ${opt}
        </div>
      `;
    });
  }

  function formatDateToSpanish(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const monthNames = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
    return `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear().toString().slice(-2)}`;
  }

  // Preview Document
  btnPreview.addEventListener('click', () => {
    // Fill Document Data
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

    // Fecha actual
    document.getElementById('doc-fecha_actual').innerText = formatDateToSpanish(new Date().toISOString().split('T')[0]);

    populateOptionsGrid();

    // Switch view
    wizardContainer.classList.remove('active');
    previewContainer.classList.add('active');

    // Resize canvas for signatures (after they are visible)
    resizeCanvas(canvasEmpleado);
    resizeCanvas(canvasSuperior);
    resizeCanvas(canvasRRHH);
  });

  btnBackWizard.addEventListener('click', () => {
    previewContainer.classList.remove('active');
    wizardContainer.classList.add('active');
  });

  // Signatures setup
  const canvasEmpleado = document.getElementById('canvas-empleado');
  const canvasSuperior = document.getElementById('canvas-superior');
  const canvasRRHH = document.getElementById('canvas-rrhh');

  const padEmpleado = new SignaturePad(canvasEmpleado);
  const padSuperior = new SignaturePad(canvasSuperior);
  const padRRHH = new SignaturePad(canvasRRHH);

  function resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    // Since it's inside a table cell, we take its parent offset
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth * ratio;
    canvas.height = parent.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
  }

  document.querySelectorAll('.clear-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target.getAttribute('data-canvas');
      if (target === 'empleado') padEmpleado.clear();
      if (target === 'superior') padSuperior.clear();
      if (target === 'rrhh') padRRHH.clear();
    });
  });

  // Procesamiento de Firmas Subidas (Magic Ink) - Versión Nítida Perfecta (Ajuste de Niveles)
  function processSignatureImage(file, pad) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // PASO 1: Extraer tinta en alta resolución para no perder detalles
        const MAX_WIDTH = 1500;
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

        // Calcular luminancia mínima y promedio
        let totalLum = 0;
        let minLum = 255;
        let count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue; 
          const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          totalLum += lum;
          if (lum < minLum) minLum = lum;
          count++;
        }
        
        const avgLum = count > 0 ? totalLum / count : 200;
        
        // Ajuste de Niveles Inteligente
        // White Point: Todo lo que sea más claro que el promedio (papel) se elimina.
        const whitePoint = avgLum * 0.95; 
        
        // Black Point: El núcleo del trazo de tinta. Todo lo que sea igual o más oscuro es 100% sólido.
        // Lo calculamos un poco por encima del píxel más oscuro para engrosar el trazo.
        const blackPoint = minLum + (whitePoint - minLum) * 0.3;

        // Extraer la tinta con suavizado (anti-aliasing) perfecto
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue;

          const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

          if (lum >= whitePoint) {
            data[i + 3] = 0; // Fondo/Papel -> Transparente
          } else if (lum <= blackPoint) {
            // Núcleo de la tinta -> Azul oscuro intenso y 100% sólido
            data[i] = 10; data[i + 1] = 20; data[i + 2] = 90;
            data[i + 3] = 255; 
          } else {
            // Bordes del trazo -> Azul oscuro con opacidad gradual (Anti-aliasing)
            data[i] = 10; data[i + 1] = 20; data[i + 2] = 90;
            const alpha = 255 - ((lum - blackPoint) / (whitePoint - blackPoint)) * 255;
            data[i + 3] = Math.floor(alpha);
          }
        }
        
        hCtx.putImageData(imgData, 0, 0);

        // PASO 2: Escalar la firma nítida al tamaño del SignaturePad
        const padCanvas = pad.canvas;
        const targetWidth = padCanvas.width;
        const targetHeight = padCanvas.height;

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetWidth;
        finalCanvas.height = targetHeight;
        const fCtx = finalCanvas.getContext('2d');
        fCtx.clearRect(0, 0, targetWidth, targetHeight);

        const scale = Math.min(targetWidth / w, targetHeight / h) * 0.95;
        const finalW = w * scale;
        const finalH = h * scale;
        const x = (targetWidth - finalW) / 2;
        const y = (targetHeight - finalH) / 2;

        // Al escalar con alta calidad, los bordes perfectos se mantienen nítidos
        fCtx.imageSmoothingEnabled = true;
        fCtx.imageSmoothingQuality = 'high';
        fCtx.drawImage(highResCanvas, x, y, finalW, finalH);

        pad.clear();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        pad.fromDataURL(finalCanvas.toDataURL('image/png'), { ratio: ratio });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('upload-empleado').addEventListener('change', (e) => processSignatureImage(e.target.files[0], padEmpleado));
  document.getElementById('upload-superior').addEventListener('change', (e) => processSignatureImage(e.target.files[0], padSuperior));
  document.getElementById('upload-rrhh').addEventListener('change', (e) => processSignatureImage(e.target.files[0], padRRHH));

  // Ver PDF en pestaña nueva
  document.getElementById('btn-view-pdf')?.addEventListener('click', async () => {
    const btnView = document.getElementById('btn-view-pdf');
    btnView.textContent = "Cargando...";
    btnView.disabled = true;
    document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'none');

    const element = document.getElementById('document-to-pdf');
    const opt = {
      margin:       0,
      filename:     `Accion_Personal_${document.getElementById('cedula').value}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, windowWidth: 1122, width: 1122 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const wrapper = document.getElementById('document-wrapper');
    const docSheet = document.getElementById('document-to-pdf');
    const originalOverflow = wrapper.style.overflowX;
    const originalTransform = docSheet.style.transform;
    wrapper.style.overflowX = 'visible';
    docSheet.style.transform = 'none';

    try {
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.click();
    } catch (err) {
      console.error(err);
      alert("Error al previsualizar el PDF.");
    } finally {
      wrapper.style.overflowX = originalOverflow;
      docSheet.style.transform = originalTransform;
      document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'flex');
      btnView.textContent = "📄 Ver PDF";
      btnView.disabled = false;
    }
  });

  // Generate PDF and Share
  btnShare.addEventListener('click', async () => {
    // Hide controls for PDF
    document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'none');

    const element = document.getElementById('document-to-pdf');
    btnShare.textContent = "Generando...";
    btnShare.disabled = true;

    const opt = {
      margin:       0,
      filename:     `Accion_Personal_${document.getElementById('cedula').value}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, windowWidth: 1122, width: 1122 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const wrapper = document.getElementById('document-wrapper');
    const docSheet = document.getElementById('document-to-pdf');
    const originalOverflow = wrapper.style.overflowX;
    const originalTransform = docSheet.style.transform;
    wrapper.style.overflowX = 'visible';
    docSheet.style.transform = 'none';

    try {
      // Usar html2pdf para generar el Blob
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      
      // Intentar guardar datos en Supabase (silencioso para el usuario final)
      try {
        await supabase.from('formularios').insert([{
          cedula: document.getElementById('cedula').value,
          nombre: document.getElementById('nombre').value,
          tipo_accion: Array.from(document.querySelectorAll('.options-grid input[type="checkbox"]')).filter(c => c.checked).map(c => c.parentElement.textContent.trim()).join(', '),
          fecha_rige: document.getElementById('rige_desde').value,
          fecha_hasta: document.getElementById('hasta').value,
          total_dias: document.getElementById('total_habiles').value
        }]);
      } catch (dbError) {
        console.error("Error guardando en Supabase:", dbError);
        // Si falla, no bloqueamos la generación del PDF
      }
      
      const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Acción de Personal',
          text: `Adjunto Acción de Personal de ${document.getElementById('nombre').value}`
        });
      } else {
        // Fallback for desktop/browsers without web share
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = opt.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error al generar el PDF.");
    } finally {
      wrapper.style.overflowX = originalOverflow;
      docSheet.style.transform = originalTransform;
      document.querySelectorAll('.sign-controls').forEach(el => el.style.display = 'flex');
      btnShare.textContent = "Generar y Compartir";
      btnShare.disabled = false;
    }
  });

  // ==========================================
  // PANEL DE ADMINISTRADOR OCULTO
  // ==========================================
  const wizardLogo = document.querySelector('.wizard-header img');
  let clickCount = 0;
  let clickTimer;

  if(wizardLogo) {
    wizardLogo.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      if (clickCount >= 5) {
        document.getElementById('admin-login-modal').style.display = 'flex';
        clickCount = 0;
      }
      clickTimer = setTimeout(() => clickCount = 0, 1500); // 1.5s para hacer 5 clics
    });
  }

  const loginModal = document.getElementById('admin-login-modal');
  const dashboardModal = document.getElementById('admin-dashboard-modal');
  
  document.getElementById('btn-close-login')?.addEventListener('click', () => {
    loginModal.style.display = 'none';
  });

  document.getElementById('btn-close-dashboard')?.addEventListener('click', () => {
    dashboardModal.style.display = 'none';
  });

  // Login de Administrador
  document.getElementById('btn-admin-login')?.addEventListener('click', async () => {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const btn = document.getElementById('btn-admin-login');
    
    if(!email || !password) return alert("Ingrese credenciales");
    
    btn.textContent = "Verificando...";
    btn.disabled = true;

    // Superadmin hardcodeado (como backup) + Supabase Auth real
    if (email === 'cbatista@sekunet.com' && password === 'Cbva050579.') {
      // Iniciar sesión real en Supabase para obtener el token y poder ver/editar datos
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error && error.message.includes("Invalid login")) {
        // Si no existe, crearlo silenciosamente porque es el superadmin inicial
        await supabase.auth.signUp({ email, password });
      }

      loginModal.style.display = 'none';
      dashboardModal.style.display = 'flex';
      btn.textContent = "Ingresar";
      btn.disabled = false;
      document.getElementById('admin-password').value = '';
      loadDashboardData();
    } else {
      // Intento de login normal para otros usuarios creados
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Credenciales incorrectas");
      } else {
        loginModal.style.display = 'none';
        dashboardModal.style.display = 'flex';
        loadDashboardData();
      }
      btn.textContent = "Ingresar";
      btn.disabled = false;
    }
  });

  // Cargar datos en el Dashboard
  async function loadDashboardData() {
    const tbody = document.getElementById('formularios-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center;">Cargando registros...</td></tr>';
    
    const { data, error } = await supabase.from('formularios').select('*').order('created_at', { ascending: false });
    
    if (error) {
      tbody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: red;">Error: No se encontró la tabla 'formularios' o faltan permisos. Ejecuta el script SQL en Supabase.</td></tr>`;
      return;
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center;">No hay formularios registrados aún.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(form => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid #e2e8f0";
      
      const date = new Date(form.created_at).toLocaleDateString();
      tr.innerHTML = `
        <td style="padding: 12px;">${date}</td>
        <td style="padding: 12px; font-family: monospace;">${form.cedula || '-'}</td>
        <td style="padding: 12px; font-weight: 500;">${form.nombre || '-'}</td>
        <td style="padding: 12px;">${form.tipo_accion || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Crear nuevos usuarios desde el panel admin
  document.getElementById('btn-create-user')?.addEventListener('click', async () => {
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const msg = document.getElementById('user-creation-msg');
    const btn = document.getElementById('btn-create-user');

    if(!email || !password || password.length < 6) {
      alert("Ingrese correo válido y contraseña de al menos 6 caracteres.");
      return;
    }

    btn.textContent = "Creando...";
    btn.disabled = true;
    
    // Crear usuario usando Auth nativo de Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      msg.style.color = "red";
      msg.textContent = "Error: " + error.message;
    } else {
      msg.style.color = "var(--success)";
      msg.textContent = "¡Usuario creado exitosamente!";
      document.getElementById('new-user-email').value = '';
      document.getElementById('new-user-password').value = '';
    }
    msg.style.display = "block";
    btn.textContent = "Crear Usuario";
    btn.disabled = false;
    
    setTimeout(() => { msg.style.display = "none"; }, 4000);
  });
});
