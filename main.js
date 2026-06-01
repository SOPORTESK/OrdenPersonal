import SignaturePad from 'signature_pad';
import html2pdf from 'html2pdf.js';

document.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('doc-salario_mensual').innerText = document.getElementById('salario_mensual').value || '0,00';
    document.getElementById('doc-observaciones').innerText = document.getElementById('observaciones').value;
    
    document.getElementById('doc-firma-nombre-empleado').innerText = document.getElementById('nombre').value || 'Nombre';

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

  // Generate PDF and Share
  btnShare.addEventListener('click', async () => {
    // Hide clear buttons for PDF
    document.querySelectorAll('.clear-btn').forEach(btn => btn.style.display = 'none');

    const element = document.getElementById('document-to-pdf');
    const opt = {
      margin:       0,
      filename:     `Accion_Personal_${document.getElementById('cedula').value}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      // Usar html2pdf para generar el Blob
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      
      // Mostrar botones de nuevo
      document.querySelectorAll('.clear-btn').forEach(btn => btn.style.display = 'block');

      const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Acción de Personal',
          text: 'Adjunto el documento de Acción de Personal firmado.'
        });
      } else {
        // Fallback: Descarga directa
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = opt.filename;
        a.click();
        URL.revokeObjectURL(url);
        alert("El documento se ha descargado (tu dispositivo no soporta compartir directamente).");
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error al generar el PDF.");
      document.querySelectorAll('.clear-btn').forEach(btn => btn.style.display = 'block');
    }
  });
});
