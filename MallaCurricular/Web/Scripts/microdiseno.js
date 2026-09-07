const API_BASE_URL = 'http://localhost:49513';
let currentMicrodiseno = { Id: 0 };
let currentEvaluaciones = [];
let fieldConfigMap = {}; // loaded from /api/microdisenos/plantilla-base/field-config

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const cursoCodigo = params.get('cursoCodigo');
    const asigNombre = params.get('asigNombre');
    const semestre = params.get('semestre');

    // Paso 1: Cargar la plantilla base desde el servidor (ruta crítica)
    try {
        const tplRes = await fetch(`${API_BASE_URL}/api/microdisenos/plantilla-base`);
        if (tplRes.ok) {
            const tplData = await tplRes.json();
            if (tplData.html) {
                const container = document.getElementById('doc-container');
                // Inyectar: rechazo-box + plantilla del servidor
                container.innerHTML = `
                    <div id="rechazo-box" class="hidden mb-4 border border-red-300 p-2 bg-red-50 text-red-700 text-[10px] rounded">
                        <span class="font-bold uppercase">Correcciones requeridas:</span>
                        <p id="rechazo-obs" class="mt-1"></p>
                    </div>
                ` + tplData.html;
            }
        } else {
            console.error('No se pudo cargar la plantilla base del servidor.');
        }
    } catch (err) {
        console.error('Error al cargar plantilla base:', err);
    }

    // Paso 1.5: Cargar configuración de tipos de campo (definida por el Jefe visualmente)
    try {
        const cfgRes = await fetch(`${API_BASE_URL}/api/microdisenos/plantilla-base/field-config`);
        if (cfgRes.ok) {
            const cfgData = await cfgRes.json();
            fieldConfigMap = cfgData.fields || {};
            applyFieldConfigToForm();
        }
    } catch(e) { console.error('Error cargando field config:', e); }

    // Paso 2: Ahora que el HTML del formulario existe, cargar datos del microdiseño
    if (document.getElementById('asig-codigo')) document.getElementById('asig-codigo').value = cursoCodigo || '';
    if (document.getElementById('asig-nombre')) document.getElementById('asig-nombre').value = asigNombre || '';
    if (document.getElementById('sel-modalidad')) document.getElementById('sel-modalidad').value = '';

    if (cursoCodigo) {
        await loadMicrodiseno(cursoCodigo, semestre);
        await fetchCourseInfo(cursoCodigo);
    } else {
        alert("Falta información del curso para editar.");
    }
});

/**
 * Apply field type configurations set by the Jefe.
 * This transforms cells in the loaded template according to the fieldConfigMap.
 * - text: ensures the cell has a text input (default, no change needed usually)
 * - number: converts input to type=number with validation
 * - textarea: converts input to textarea
 * - select: replaces input with a <select> element with predefined options
 */
function applyFieldConfigToForm() {
    const container = document.getElementById('doc-container');
    if (!container) return;

    for (const [key, config] of Object.entries(fieldConfigMap)) {
        // Find the element by id first
        let targetEl = document.getElementById(key);
        let parentCell = targetEl ? targetEl.closest('td') : null;

        // If not found by id, try finding cell by positional key (cell-tX-rX-cX)
        if (!targetEl && key.startsWith('cell-')) {
            parentCell = findCellByPositionalKey(container, key);
            if (parentCell) {
                targetEl = parentCell.querySelector('input, textarea, select');
            }
        }

        if (!targetEl && !parentCell) continue;

        const fieldId = targetEl ? targetEl.id : key;
        const existingValue = targetEl ? (targetEl.value || '') : '';

        switch (config.type) {
            case 'number':
                if (targetEl && targetEl.tagName === 'INPUT') {
                    targetEl.type = 'number';
                    targetEl.setAttribute('inputmode', 'numeric');
                    // Add validation: block non-numeric key presses
                    targetEl.addEventListener('keypress', function(e) {
                        const char = String.fromCharCode(e.which || e.keyCode);
                        if (!/[\d.\-]/.test(char)) {
                            e.preventDefault();
                        }
                    });
                    targetEl.addEventListener('paste', function(e) {
                        const pasted = (e.clipboardData || window.clipboardData).getData('text');
                        if (!/^[\d.\-]+$/.test(pasted)) {
                            e.preventDefault();
                        }
                    });
                } else if (targetEl && targetEl.tagName === 'TEXTAREA') {
                    // Replace textarea with number input
                    const newInput = document.createElement('input');
                    newInput.type = 'number';
                    newInput.id = fieldId;
                    newInput.className = targetEl.className;
                    newInput.classList.add('doc-input');
                    newInput.value = existingValue;
                    newInput.setAttribute('inputmode', 'numeric');
                    newInput.addEventListener('keypress', function(e) {
                        const char = String.fromCharCode(e.which || e.keyCode);
                        if (!/[\d.\-]/.test(char)) e.preventDefault();
                    });
                    targetEl.parentNode.replaceChild(newInput, targetEl);
                }
                break;

            case 'textarea':
                if (targetEl && targetEl.tagName === 'INPUT') {
                    // Replace input with textarea
                    const newTextarea = document.createElement('textarea');
                    newTextarea.id = fieldId;
                    newTextarea.className = targetEl.className + ' min-h-[60px]';
                    newTextarea.classList.add('doc-input');
                    newTextarea.value = existingValue;
                    newTextarea.placeholder = 'Escriba aquí...';
                    targetEl.parentNode.replaceChild(newTextarea, targetEl);
                }
                // If already textarea, nothing to do
                break;

            case 'select':
                if (config.options && config.options.length > 0) {
                    const newSelect = document.createElement('select');
                    newSelect.id = fieldId;
                    newSelect.className = 'input-doc doc-input';

                    // Default empty option
                    const defaultOpt = document.createElement('option');
                    defaultOpt.value = '';
                    defaultOpt.textContent = 'Seleccione...';
                    newSelect.appendChild(defaultOpt);

                    config.options.forEach(optVal => {
                        const opt = document.createElement('option');
                        opt.value = optVal;
                        opt.textContent = optVal;
                        newSelect.appendChild(opt);
                    });

                    // Set existing value if matches
                    if (existingValue) {
                        newSelect.value = existingValue;
                    }

                    if (targetEl) {
                        targetEl.parentNode.replaceChild(newSelect, targetEl);
                    } else if (parentCell) {
                        parentCell.innerHTML = '';
                        parentCell.appendChild(newSelect);
                    }
                }
                break;

            case 'text':
            default:
                // Text is the default, no transformation needed
                break;
        }
    }
}

/**
 * Given a positional key like "cell-t2-r1-c3", find the corresponding TD.
 */
function findCellByPositionalKey(container, key) {
    const match = key.match(/^cell-t(\d+)-r(\d+)-c(\d+)$/);
    if (!match) return null;
    const tableIdx = parseInt(match[1]);
    const rowIdx = parseInt(match[2]);
    const cellIdx = parseInt(match[3]);

    const allTables = container.querySelectorAll('table');
    if (tableIdx >= allTables.length) return null;
    const table = allTables[tableIdx];
    const rows = table.querySelectorAll('tr');
    if (rowIdx >= rows.length) return null;
    const cells = rows[rowIdx].children;
    if (cellIdx >= cells.length) return null;
    return cells[cellIdx];
}


function goBack() {
    const role = parseInt(localStorage.getItem('userRole'));
    if (role === 1) window.location.href = 'Jefe.html?tab=microdisenos';
    else if (role === 3) window.location.href = 'Estudiante.html?tab=asignaturas';
    else window.location.href = 'profesor.html';
}

async function fetchCourseInfo(codigo) {
    console.log('Fetching course info for:', codigo);
    try {
        const res = await fetch(`${API_BASE_URL}/api/cursos/${encodeURIComponent(codigo)}`);
        console.log('Fetch response status:', res.status);
        if (res.ok) {
            const curso = await res.json();
            console.log('Course data received:', curso);
            const asigInput = document.getElementById('asig-nombre');
            if (asigInput) {
                asigInput.value = curso.Asignatura || '';
                asigInput.disabled = true; // Bloqueado para que el docente no lo cambie
                asigInput.title = "Nombre automático desde base de datos";
            }
            if (document.getElementById('header-asig-title')) {
                document.getElementById('header-asig-title').textContent = 'Microdiseño: ' + (curso.Asignatura || '');
            }
            const prereqInput = document.getElementById('txt-prereq');
            if (prereqInput) {
                prereqInput.value = curso.Prerequisito || 'Ninguno';
                prereqInput.disabled = true;
                prereqInput.title = "Campo automático desde base de datos";
                prereqInput.classList.add('bg-gray-50', 'text-gray-500');
            }
        }
    } catch (err) { console.error('Error fetching course info:', err); }
}

async function loadMicrodiseno(codigo, semestre) {
    console.log('Loading microdiseno for:', codigo, semestre);
    try {
        let fetchUrl = `${API_BASE_URL}/api/microdisenos/${encodeURIComponent(codigo)}/${encodeURIComponent(semestre)}`;
        
        // Si es Estudiante (Rol 3), obtener directamente el microdiseño aprobado sin importar el semestre
        if (userRole === 3) {
            fetchUrl = `${API_BASE_URL}/api/microdisenos/aprobados/curso/${encodeURIComponent(codigo)}`;
        }

        const res = await fetch(fetchUrl);
        console.log('Load microdiseno status:', res.status);
        if (res.ok) {
            const data = await res.json();
            currentMicrodiseno = data;
            fillForm(data);
        } else if (res.status === 404) {
            let creadorId = 0, avalId = 0;
            try {
                const rRes = await fetch(`${API_BASE_URL}/api/microdisenos/roles/${encodeURIComponent(codigo)}`);
                if (rRes.ok) {
                    const roles = await rRes.json();
                    creadorId = roles.CreadorId;
                    avalId = roles.AvalId;
                }
            } catch (e) { }
            currentMicrodiseno = { Id: 0, CursoCodigo: codigo, Semestre: semestre, Estado: 'Borrador', CreadorId: creadorId, AvalId: avalId };
            fillForm(currentMicrodiseno);
        }
    } catch (err) { 
        console.error(err);
        alert("Error al cargar el microdiseño: " + err.message);
    }
}


function fillForm(m) {
    // Basic fields
    const fldFac = document.getElementById('sel-facultad');
    if (fldFac) fldFac.value = m.Facultad || '';
    
    const fldMod = document.getElementById('sel-modalidad');
    if (fldMod) fldMod.value = m.Modalidad || '';
    
    const fldTipoA = document.getElementById('sel-tipoasignatura');
    if (fldTipoA) fldTipoA.value = m.TipoAsignatura || '';

    if (m.Asignatura) {
        if (document.getElementById('asig-nombre')) {
            document.getElementById('asig-nombre').value = m.Asignatura;
        }
        if (document.getElementById('header-asig-title')) {
            document.getElementById('header-asig-title').textContent = 'Microdiseño: ' + m.Asignatura;
        }
    }

    let c = {};
    if (m.ContenidoJSON) {
        try { c = JSON.parse(m.ContenidoJSON); } catch (e) { }
    }

    // Mapping new fields
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    setVal('txt-programas', c.programas);
    setVal('txt-area', c.area);
    setVal('txt-plandeestudios', c.plandeestudios);
    setVal('txt-correq', c.correq);
    setVal('txt-prereq', c.prereq);
    setVal('num-creditos', c.creditos);
    setVal('sel-tipocredito', c.tipocredito || 'Obligatorio');
    setVal('num-hteoricas', c.hteoricas);
    setVal('num-hteoprac', c.hteoprac);
    setVal('num-hprac', c.hprac);
    setVal('num-hindep', c.hindep);
    setVal('num-hpres', c.hpres);
    setVal('num-hfisicos', c.hfisicos);
    setVal('num-hsinc', c.hsinc);

    setVal('txt-justificacion', c.justificacion);
    setVal('txt-competencias', c.competencias);
    setVal('txt-resultados-aprendizaje', c.resultadosAprendizaje);

    setVal('txt-saber-dec-crit', c.saberDecCrit);
    setVal('txt-saber-dec-evi', c.saberDecEvi);
    setVal('txt-saber-pro-crit', c.saberProCrit);
    setVal('txt-saber-pro-evi', c.saberProEvi);
    setVal('txt-saber-act-crit', c.saberActCrit);
    setVal('txt-saber-act-evi', c.saberActEvi);

    setVal('txt-diagnostico', c.diagnostico);
    setVal('txt-metodologia', c.metodologia);
    setVal('txt-materiales', c.materiales);
    setVal('txt-trabajoindep', c.trabajoindep);

    setVal('txt-bibliografia', c.bibliografia);

    for (let key in c) {
        if (key !== 'evaluaciones') {
            const el = document.getElementById(key);
            if (el && el.classList.contains('doc-input')) {
                el.value = c[key] || '';
            }
        }
    }

    currentEvaluaciones = c.evaluaciones || [];
    renderEvaluaciones();

    // Footer
    const txtElaborado = document.getElementById('txt-elaborado');
    if (txtElaborado) txtElaborado.textContent = m.ElaboradoPor || localStorage.getItem('userName') || '';
    
    const txtRevisado = document.getElementById('txt-revisado');
    if (txtRevisado) txtRevisado.textContent = m.RevisadoPor || '';
    
    const txtVersion = document.getElementById('txt-version');
    if (txtVersion) txtVersion.textContent = m.Version || '1.0';
    
    const txtFecha = document.getElementById('txt-fecha');
    if (txtFecha) txtFecha.textContent = m.FechaAprobacion ? m.FechaAprobacion.substring(0, 10) : '';
    
    const txtAprobado = document.getElementById('txt-aprobado');
    if (txtAprobado) txtAprobado.textContent = m.AprobadoPor || '';

    checkStateUI();
}

function renderEvaluaciones() {
    const tbody = document.getElementById('eval-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    currentEvaluaciones.forEach((ev, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-0"><textarea class="w-full border-none outline-none p-1 text-[11px] doc-input" onchange="updateEval(${idx}, 'eval', this.value)">${ev.eval || ''}</textarea></td>
            <td class="p-0 text-center"><input type="number" class="w-full border-none outline-none text-center p-1 text-[11px] doc-input" value="${ev.porcentaje || ''}" onchange="updateEval(${idx}, 'porcentaje', this.value)"></td>
            <td class="p-0"><textarea class="w-full border-none outline-none p-1 text-[11px] doc-input" onchange="updateEval(${idx}, 'estrategia', this.value)">${ev.estrategia || ''}</textarea></td>
            <td class="p-0 text-center doc-block no-print"><button onclick="removeEval(${idx})" class="text-red-600 font-bold px-2">X</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateEval(idx, f, v) { currentEvaluaciones[idx][f] = v; }
function addEvalLine() { currentEvaluaciones.push({ eval: '', porcentaje: '', estrategia: '' }); renderEvaluaciones(); }
function removeEval(idx) { currentEvaluaciones.splice(idx, 1); renderEvaluaciones(); }

function gatherData() {
    const fldFac = document.getElementById('sel-facultad');
    if (fldFac) currentMicrodiseno.Facultad = fldFac.value;
    
    const fldMod = document.getElementById('sel-modalidad');
    if (fldMod) currentMicrodiseno.Modalidad = fldMod.value;
    
    const fldTipoA = document.getElementById('sel-tipoasignatura');
    if (fldTipoA) currentMicrodiseno.TipoAsignatura = fldTipoA.value;
    
    const fldElab = document.getElementById('txt-elaborado');
    if (fldElab) currentMicrodiseno.ElaboradoPor = fldElab.textContent;

    let c = {};
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

    c.programas = getVal('txt-programas');
    c.area = getVal('txt-area');
    c.plandeestudios = getVal('txt-plandeestudios');
    c.correq = getVal('txt-correq');
    c.prereq = getVal('txt-prereq');
    c.creditos = getVal('num-creditos');
    c.tipocredito = getVal('sel-tipocredito');
    c.hteoricas = getVal('num-hteoricas');
    c.hteoprac = getVal('num-hteoprac');
    c.hprac = getVal('num-hprac');
    c.hindep = getVal('num-hindep');
    c.hpres = getVal('num-hpres');
    c.hfisicos = getVal('num-hfisicos');
    c.hsinc = getVal('num-hsinc');

    c.justificacion = getVal('txt-justificacion');
    c.competencias = getVal('txt-competencias');
    c.resultadosAprendizaje = getVal('txt-resultados-aprendizaje');

    c.saberDecCrit = getVal('txt-saber-dec-crit');
    c.saberDecEvi = getVal('txt-saber-dec-evi');
    c.saberProCrit = getVal('txt-saber-pro-crit');
    c.saberProEvi = getVal('txt-saber-pro-evi');
    c.saberActCrit = getVal('txt-saber-act-crit');
    c.saberActEvi = getVal('txt-saber-act-evi');

    c.diagnostico = getVal('txt-diagnostico');
    c.metodologia = getVal('txt-metodologia');
    c.materiales = getVal('txt-materiales');
    c.trabajoindep = getVal('txt-trabajoindep');

    c.bibliografia = getVal('txt-bibliografia');
    c.evaluaciones = currentEvaluaciones;

    // Recopilar cualquier input que tenga "doc-input", adaptandose a plantillas de Jefe dinámicas
    const container = document.getElementById('doc-container');
    if (container) {
        container.querySelectorAll('.doc-input').forEach(el => {
            if (el.id) {
                c[el.id] = el.value || '';
            }
        });
    }

    currentMicrodiseno.ContenidoJSON = JSON.stringify(c);
}

// Global user attributes
const currentUserId = parseInt(localStorage.getItem('userId')) || 0;
const userRole = parseInt(localStorage.getItem('userRole')) || 0;

function checkStateUI() {
    if (!currentMicrodiseno) return;
    console.log("Checking UI state:", currentMicrodiseno.Estado, "Roles:", { Creador: currentMicrodiseno.CreadorId, Aval: currentMicrodiseno.AvalId }, "CurrentUser:", { Id: currentUserId, Role: userRole });
    
    const st = (currentMicrodiseno.Estado || 'Borrador').trim();
    const badge = document.getElementById('badge-estado');
    const btns = document.getElementById('action-buttons');
    const inputs = document.querySelectorAll('.doc-input');
    const blocks = document.querySelectorAll('.doc-block');

    badge.textContent = st;
    badge.className = "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ";

    const rechazoEl = document.getElementById('rechazo-box');
    if (rechazoEl) rechazoEl.classList.add('hidden');

    let htmlBtns = '';

    if (st.includes('Pendiente')) badge.classList.add("bg-yellow-200", "text-yellow-800");
    else if (st === 'Rechazado') badge.classList.add("bg-red-200", "text-red-800");
    else if (st === 'Aprobado') badge.classList.add("bg-green-200", "text-green-800");
    else badge.classList.add("bg-gray-200", "text-gray-800");

    if (st === 'Rechazado') {
        if (rechazoEl) rechazoEl.classList.remove('hidden');
        const obsEl = document.getElementById('rechazo-obs');
        if (obsEl) obsEl.textContent = currentMicrodiseno.ObservacionesRechazo || 'Sin observaciones';
    }

    const isCreador = currentMicrodiseno.CreadorId === currentUserId;
    const isAval = currentMicrodiseno.AvalId === currentUserId;
    const isJefe = userRole === 1;

    let canEdit = isCreador && (st === 'Borrador' || st === 'Rechazado');
    let readonlyMsg = '';

    // Aval solo puede ver cuando el estado es PendienteAval o posterior
    const avalCanAccess = isAval && (st === 'PendienteAval' || st === 'PendienteJefe' || st === 'Aprobado');
    
    if (!isCreador && st !== 'Aprobado' && !avalCanAccess && !isJefe) {
        if (userRole === 3) {
            document.getElementById('doc-container').innerHTML = `
                <div class="p-20 text-center">
                    <div class="text-6xl mb-4">📄</div>
                    <h2 class="text-xl font-bold text-gray-800">Microdiseño No Publicado</h2>
                    <p class="text-gray-500 mt-2">Este microdiseño aún no ha sido aprobado oficialmente por la coordinación para su consulta pública.</p>
                </div>`;
            return;
        }

        let msg = 'Este microcurrículo se encuentra en fase de desarrollo o revisión. Usted no cuenta con el rol de Creador o Aval para esta asignatura.';
        // Mensaje específico para el Aval que intenta acceder antes de tiempo
        if (isAval && (st === 'Borrador' || st === 'Rechazado')) {
            msg = 'El microcurrículo aún no ha sido enviado a revisión por el Creador. Podrá acceder cuando el docente lo envíe formalmente.';
        }
        document.getElementById('doc-container').innerHTML = `<div class="text-center py-20 text-red-600 font-bold text-xl">Acceso Denegado: <br><span class="text-sm font-normal text-gray-500">${msg}</span></div>`;
        return;
    }

    if (canEdit) {
        htmlBtns += `<button onclick="saveDraft()" class="bg-gray-700 text-white px-3 py-1 text-sm font-bold rounded hover:bg-gray-800 transition shadow">Guardar Borrador</button>`;
        htmlBtns += `<button onclick="sendReview()" class="bg-blue-600 text-white px-3 py-1 text-sm font-bold rounded ml-2 hover:bg-blue-700 transition shadow">Enviar a Aval</button>`;
        inputs.forEach(el => el.disabled = false);
        
        // Forzar bloqueo de campos automáticos para que no se alteren manualmente
        const lockedFields = ['asig-nombre', 'asig-codigo', 'txt-prereq'];
        lockedFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = true;
                el.title = "Campo automático - No editable";
                el.classList.add('bg-gray-50', 'text-gray-500');
            }
        });

        blocks.forEach(el => el.style.display = '');
    } else if (isAval && st === 'PendienteAval') {
        htmlBtns += `<button onclick="actionAval('rechazar')" class="bg-red-600 text-white px-3 py-1 text-sm font-bold rounded hover:bg-red-700 transition shadow">Rechazar (Aval)</button>`;
        htmlBtns += `<button onclick="actionAval('aprobar')" class="bg-green-600 text-white px-3 py-1 text-sm font-bold rounded ml-2 hover:bg-green-700 transition shadow">Dar Visto Bueno</button>`;
        readonlyMsg = 'En revisión por Aval.';
        inputs.forEach(el => el.disabled = true);
        blocks.forEach(el => el.style.display = 'none');
    } else if (isJefe && (st === 'PendienteJefe' || st === 'PendienteAval')) {
        if (st === 'PendienteJefe') {
            htmlBtns += `<button onclick="actionJefe('rechazar')" class="bg-red-600 text-white px-3 py-1 text-sm font-bold rounded hover:bg-red-700 transition shadow">Rechazar (Jefe)</button>`;
            htmlBtns += `<button onclick="actionJefe('aprobar')" class="bg-green-600 text-white px-3 py-1 text-sm font-bold rounded ml-2 hover:bg-green-700 transition shadow">Aprobar Definitivo</button>`;
        }
        readonlyMsg = 'En revisión por Jefe de Programa.';
        inputs.forEach(el => el.disabled = true);
        blocks.forEach(el => el.style.display = 'none');
    } else {
        if (st === 'Aprobado') {
            if (currentMicrodiseno.VisibleParaTodos) {
                readonlyMsg = 'Publicado oficialmente.';
            } else {
                readonlyMsg = 'Aprobado (No Público).';
                if (isJefe) {
                    htmlBtns += `<button onclick="publicarMicrodiseno()" class="bg-indigo-600 text-white px-3 py-1 text-sm font-bold rounded ml-4 shadow hover:bg-indigo-700 transition">Hacer Visible para Todos</button>`;
                }
            }
            htmlBtns += `<button onclick="window.print()" class="bg-blue-600 text-white px-3 py-1 text-sm font-bold rounded ml-4 shadow hover:bg-blue-700 transition">Imprimir PDF</button>`;
        } else {
            readonlyMsg = 'En proceso. Solo lectura.';
        }
        inputs.forEach(el => el.disabled = true);
        blocks.forEach(el => el.style.display = 'none');
        
        // Ocultar orientaciones para los estudiantes
        if (userRole === 3) {
            document.querySelectorAll('.orientacion-box').forEach(el => el.style.display = 'none');
        }
    }

    if (htmlBtns) {
        btns.innerHTML = htmlBtns;
    } else if (readonlyMsg) {
        btns.innerHTML = `<span class="italic text-xs text-gray-400">${readonlyMsg}</span>`;
    }
}

async function saveDraft() {
    gatherData();
    try {
        const res = await fetch(`${API_BASE_URL}/api/microdisenos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentMicrodiseno)
        });
        const ans = await res.json();
        if (res.ok) {
            alert('Guardado con éxito.');
            currentMicrodiseno.Id = ans.Id;
            checkStateUI();
        } else alert("Error: " + ans.Message);
    } catch (err) { alert(err); }
}

async function sendReview() {
    await saveDraft();
    if (currentMicrodiseno.Id === 0) return;
    if (confirm('¿Enviar a revisión al Aval?')) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/microdisenos/${currentMicrodiseno.Id}/enviar`, { method: 'POST' });
            if (res.ok) { 
                location.reload(); 
            } else {
                const errData = await res.json();
                alert("Error al enviar: " + (errData.Message || "Error desconocido"));
            }
        } catch (err) { alert(err); }
    }
}

function openRechazoModal() {
    const m = document.getElementById('modal-rechazo');
    if (m) {
        document.getElementById('txt-motivo-rechazo').value = '';
        m.classList.remove('hidden');
        m.classList.add('flex');
    }
}

function closeModalRechazo() {
    const m = document.getElementById('modal-rechazo');
    if (m) {
        m.classList.add('hidden');
        m.classList.remove('flex');
    }
}

async function submitRechazo() {
    const obs = document.getElementById('txt-motivo-rechazo').value.trim();
    if (!obs) return alert('Debe indicar un motivo de rechazo.');

    try {
        const dto = { RevisorNombre: localStorage.getItem('userName') || 'Aval', Observaciones: obs };
        const res = await fetch(`${API_BASE_URL}/api/microdisenos/${currentMicrodiseno.Id}/rechazar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (res.ok) location.reload();
        else alert('Error al rechazar el microdiseño.');
    } catch (e) { console.error(e); }
}

async function actionAval(action) {
    if (action === 'aprobar') {
        if (confirm('¿Dar visto bueno y enviar al Jefe de Programa?')) {
            try {
                const dto = { RevisorNombre: localStorage.getItem('userName') || 'Aval' };
                const res = await fetch(`${API_BASE_URL}/api/microdisenos/${currentMicrodiseno.Id}/aprobar-aval`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dto)
                });
                if (res.ok) { location.reload(); }
                else alert('Error al aprobar.');
            } catch (e) { console.error(e); }
        }
    } else if (action === 'rechazar') {
        openRechazoModal();
    }
}

async function actionJefe(action) {
    if (action === 'aprobar') {
        openModalAprobacion();
    } else if (action === 'rechazar') {
        openRechazoModal();
    }
}

function openModalAprobacion() {
    const m = document.getElementById('modal-aprobacion');
    if (m) {
        document.getElementById('input-comite-numero').value = '';
        document.getElementById('input-comite-fecha').value = '';
        updateAprobadoPreview();
        m.classList.remove('hidden');
        m.classList.add('flex');
    }
}

function closeModalAprobacion() {
    const m = document.getElementById('modal-aprobacion');
    if (m) {
        m.classList.add('hidden');
        m.classList.remove('flex');
    }
}

function updateAprobadoPreview() {
    const num = document.getElementById('input-comite-numero').value;
    const dateVal = document.getElementById('input-comite-fecha').value;
    
    let formattedDate = "___";
    if (dateVal) {
        const parts = dateVal.split('-');
        if (parts.length === 3) {
            const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            const mesStr = meses[parseInt(parts[1], 10) - 1];
            const dia = parseInt(parts[2], 10);
            formattedDate = `${dia} de ${mesStr} de ${parts[0]}`;
        }
    }
    
    const previewEl = document.getElementById('preview-aprobado-por');
    if (previewEl) {
        previewEl.textContent = `Comité Curricular No. ${num || "___"} de ${formattedDate}`;
    }
}

async function submitAprobacion() {
    const num = document.getElementById('input-comite-numero').value;
    const dateVal = document.getElementById('input-comite-fecha').value;
    
    if (!num) return alert('Debe ingresar el número del Comité Curricular.');
    if (!dateVal) return alert('Debe seleccionar la fecha del Comité.');
    
    let formattedDate = "";
    const parts = dateVal.split('-');
    if (parts.length === 3) {
        const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const mesStr = meses[parseInt(parts[1], 10) - 1];
        const dia = parseInt(parts[2], 10);
        formattedDate = `${dia} de ${mesStr} de ${parts[0]}`;
    }

    try {
        const dto = { 
            RevisorNombre: localStorage.getItem('userName') || 'Jefe',
            ComiteNumero: parseInt(num),
            ComiteFecha: formattedDate
        };
        const res = await fetch(`${API_BASE_URL}/api/microdisenos/${currentMicrodiseno.Id}/aprobar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (res.ok) { location.reload(); }
        else alert('Error al aprobar por el jefe.');
    } catch (e) { console.error(e); }
}

async function publicarMicrodiseno() {
    if (confirm('¿Desea hacer visible este microdiseño para todos los estudiantes y docentes?')) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/microdisenos/${currentMicrodiseno.Id}/publicar`, {
                method: 'POST'
            });
            if (res.ok) { 
                alert('¡El microdiseño ahora es visible para todos!');
                location.reload(); 
            }
            else alert('Error al publicar el microdiseño.');
        } catch (e) { console.error(e); }
    }
}
