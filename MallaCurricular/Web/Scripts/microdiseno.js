const API_BASE_URL = 'http://localhost:49513';
let currentMicrodiseno = { Id: 0 };
let currentEvaluaciones = [];

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const cursoCodigo = params.get('cursoCodigo');
    const semestre = params.get('semestre');

    if (document.getElementById('asig-codigo')) document.getElementById('asig-codigo').value = cursoCodigo || '';
    if (document.getElementById('sel-modalidad')) document.getElementById('sel-modalidad').value = '';

    if (cursoCodigo) {
        loadMicrodiseno(cursoCodigo, semestre);
        fetchCourseInfo(cursoCodigo);
    } else {
        alert("Falta información del curso para editar.");
    }
});

function goBack() {
    const role = parseInt(localStorage.getItem('userRole'));
    if (role === 1) window.location.href = 'Jefe.html?tab=microdisenos';
    else if (role === 3) window.location.href = 'estudiante.html';
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
            if (document.getElementById('asig-nombre')) {
                document.getElementById('asig-nombre').value = curso.Asignatura || '';
            }
            if (document.getElementById('header-asig-title')) {
                document.getElementById('header-asig-title').textContent = 'Microdiseño: ' + (curso.Asignatura || '');
            }
        }
    } catch (err) { console.error('Error fetching course info:', err); }
}

async function loadMicrodiseno(codigo, semestre) {
    console.log('Loading microdiseno for:', codigo, semestre);
    try {
        const res = await fetch(`${API_BASE_URL}/api/microdisenos/${encodeURIComponent(codigo)}/${encodeURIComponent(semestre)}`);
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
    } catch (err) { console.error(err); }
}


function fillForm(m) {
    // Basic fields
    document.getElementById('sel-facultad').value = m.Facultad || '';
    document.getElementById('sel-modalidad').value = m.Modalidad || '';
    document.getElementById('sel-tipoasignatura').value = m.TipoAsignatura || '';

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

    currentEvaluaciones = c.evaluaciones || [];
    renderEvaluaciones();

    // Footer
    document.getElementById('txt-elaborado').textContent = m.ElaboradoPor || localStorage.getItem('userName') || '';
    document.getElementById('txt-revisado').textContent = m.RevisadoPor || '';
    document.getElementById('txt-version').textContent = m.Version || '05';
    document.getElementById('txt-fecha').textContent = m.FechaAprobacion ? m.FechaAprobacion.substring(0, 10) : '30-07-2024';
    document.getElementById('txt-aprobado').textContent = m.AprobadoPor || '';

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
    currentMicrodiseno.Facultad = document.getElementById('sel-facultad').value;
    currentMicrodiseno.Modalidad = document.getElementById('sel-modalidad').value;
    currentMicrodiseno.TipoAsignatura = document.getElementById('sel-tipoasignatura').value;
    currentMicrodiseno.ElaboradoPor = document.getElementById('txt-elaborado').textContent;

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

    currentMicrodiseno.ContenidoJSON = JSON.stringify(c);
}

// Global user attributes
const currentUserId = parseInt(localStorage.getItem('userId')) || 0;
const userRole = parseInt(localStorage.getItem('userRole')) || 0;

function checkStateUI() {
    const st = currentMicrodiseno.Estado || 'Borrador';
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

    if (!isCreador && st !== 'Aprobado' && !isAval && !isJefe) {
        document.getElementById('doc-container').innerHTML = `<div class="text-center py-20 text-red-600 font-bold text-xl">Acceso Denegado: <br><span class="text-sm font-normal text-gray-500">Este microcurrículo se encuentra en fase de desarrollo o revisión. Usted no cuenta con el rol de Creador o Aval para esta asignatura.</span></div>`;
        btns.innerHTML = `<button onclick="goBack()" class="bg-gray-100 text-gray-700 px-3 py-1 text-sm font-bold rounded border border-gray-300 hover:bg-gray-200">Volver</button>`;
        return;
    }

    if (canEdit) {
        htmlBtns += `<button onclick="saveDraft()" class="bg-gray-700 text-white px-3 py-1 text-sm font-bold rounded hover:bg-gray-800 transition shadow">Guardar Borrador</button>`;
        htmlBtns += `<button onclick="sendReview()" class="bg-blue-600 text-white px-3 py-1 text-sm font-bold rounded ml-2 hover:bg-blue-700 transition shadow">Enviar a Aval</button>`;
        inputs.forEach(el => el.disabled = false);
        blocks.forEach(el => el.style.display = '');
    } else if (isAval && st === 'PendienteAval') {
        htmlBtns += `<button onclick="actionAval('rechazar')" class="bg-red-600 text-white px-3 py-1 text-sm font-bold rounded hover:bg-red-700 transition shadow">Rechazar (Aval)</button>`;
        htmlBtns += `<button onclick="actionAval('aprobar')" class="bg-green-600 text-white px-3 py-1 text-sm font-bold rounded ml-2 hover:bg-green-700 transition shadow">Dar Visto Bueno</button>`;
        readonlyMsg = 'En revisión por Aval.';
        inputs.forEach(el => el.disabled = true);
        blocks.forEach(el => el.style.display = 'none');
    } else {
        if (st === 'Aprobado') {
            readonlyMsg = 'Publicado oficialmente.';
            htmlBtns += `<button onclick="window.print()" class="bg-blue-600 text-white px-3 py-1 text-sm font-bold rounded ml-4 shadow">Imprimir PDF</button>`;
        } else {
            readonlyMsg = 'En proceso. Solo lectura.';
        }
        inputs.forEach(el => el.disabled = true);
        blocks.forEach(el => el.style.display = 'none');
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
            if (res.ok) { location.reload(); }
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
