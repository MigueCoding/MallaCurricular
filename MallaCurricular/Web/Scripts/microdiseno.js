const API_BASE_URL = 'http://localhost:49513';
let currentMicrodiseno = { Id: 0 };
let currentEvaluaciones = [];

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const cursoCodigo = params.get('cursoCodigo');
    const semestre = params.get('semestre');

    if(document.getElementById('asig-codigo')) document.getElementById('asig-codigo').value = cursoCodigo || '';
    if(document.getElementById('sel-modalidad')) document.getElementById('sel-modalidad').value = '';

    if(cursoCodigo) {
        loadMicrodiseno(cursoCodigo, semestre);
        fetchCourseInfo(cursoCodigo);
    } else {
        alert("Falta información del curso para editar.");
    }
});

function goBack() {
    const role = parseInt(localStorage.getItem('userRole'));
    if(role === 1) window.location.href = 'Jefe.html?tab=microdisenos';
    else if(role === 3) window.location.href = 'estudiante.html';
    else window.location.href = 'profesor.html';
}

async function fetchCourseInfo(codigo) {
    console.log('Fetching course info for:', codigo);
    try {
        const res = await fetch(`${API_BASE_URL}/api/cursos/${encodeURIComponent(codigo)}`);
        console.log('Fetch response status:', res.status);
        if(res.ok) {
            const curso = await res.json();
            console.log('Course data received:', curso);
            if(document.getElementById('asig-nombre')) {
                document.getElementById('asig-nombre').value = curso.Asignatura || '';
            }
            if(document.getElementById('header-asig-title')) {
                document.getElementById('header-asig-title').textContent = 'Microdiseño: ' + (curso.Asignatura || '');
            }
        }
    } catch(err) { console.error('Error fetching course info:', err); }
}

async function loadMicrodiseno(codigo, semestre) {
    console.log('Loading microdiseno for:', codigo, semestre);
    try {
        const res = await fetch(`${API_BASE_URL}/api/microdisenos/${encodeURIComponent(codigo)}/${encodeURIComponent(semestre)}`);
        console.log('Load microdiseno status:', res.status);
        if(res.ok) {
            const data = await res.json();
            currentMicrodiseno = data;
            fillForm(data);
        } else if (res.status === 404) {
            currentMicrodiseno = { Id: 0, CursoCodigo: codigo, Semestre: semestre, Estado: 'Borrador' };
            fillForm(currentMicrodiseno);
        } 
    } catch(err) { console.error(err); }
}


function fillForm(m) {
    // Basic fields
    document.getElementById('sel-facultad').value = m.Facultad || '';
    document.getElementById('sel-modalidad').value = m.Modalidad || '';
    document.getElementById('sel-tipoasignatura').value = m.TipoAsignatura || '';

    let c = {};
    if(m.ContenidoJSON) {
        try { c = JSON.parse(m.ContenidoJSON); } catch(e){}
    }

    // Mapping new fields
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
    
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
    document.getElementById('txt-fecha').textContent = m.FechaAprobacion ? m.FechaAprobacion.substring(0,10) : '30-07-2024';
    document.getElementById('txt-aprobado').textContent = m.AprobadoPor || '';

    checkStateUI();
}

function renderEvaluaciones() {
    const tbody = document.getElementById('eval-body');
    if(!tbody) return;
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

function checkStateUI() {
    const st = currentMicrodiseno.Estado || 'Borrador';
    const badge = document.getElementById('badge-estado');
    const btns = document.getElementById('action-buttons');
    const inputs = document.querySelectorAll('.doc-input');
    const blocks = document.querySelectorAll('.doc-block');
    
    badge.textContent = st;
    badge.className = "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ";
    
    const rechazoEl = document.getElementById('rechazo-box');
    if(rechazoEl) rechazoEl.classList.add('hidden');

    let htmlBtns = '';
    
    badge.classList.add(st === 'Borrador' ? "bg-gray-200" : (st === 'Rechazado' ? "bg-red-200" : "bg-yellow-200"));
    badge.classList.add(st === 'Borrador' ? "text-gray-800" : (st === 'Rechazado' ? "text-red-800" : "text-yellow-800"));

    if (st === 'Rechazado') {
        if (rechazoEl) rechazoEl.classList.remove('hidden');
        const obsEl = document.getElementById('rechazo-obs');
        if (obsEl) obsEl.textContent = currentMicrodiseno.ObservacionesRechazo || 'Sin observaciones';
    }

    if (st === 'Pendiente' || st === 'Aprobado') {
        let msg = st === 'Pendiente' ? 'Enviado a revisión.' : 'Publicado oficialmente.';
        let printBtn = st === 'Aprobado' ? `<button onclick="window.print()" class="bg-blue-600 text-white px-3 py-1 text-sm font-bold rounded ml-4 shadow">Imprimir PDF</button>` : '';
        btns.innerHTML = `<span class="italic text-xs text-gray-400">${msg}</span>${printBtn}`;
        inputs.forEach(el => el.disabled = true);
        blocks.forEach(el => el.style.display = 'none');
    } else {
        htmlBtns += `<button onclick="saveDraft()" class="bg-gray-700 text-white px-3 py-1 text-sm font-bold rounded hover:bg-gray-800 transition shadow">Guardar Borrador</button>`;
        htmlBtns += `<button onclick="sendReview()" class="bg-blue-600 text-white px-3 py-1 text-sm font-bold rounded ml-2 hover:bg-blue-700 transition shadow">Enviar Revisión</button>`;
        inputs.forEach(el => el.disabled = false);
        blocks.forEach(el => el.style.display = '');
    }

    if(htmlBtns) btns.innerHTML = htmlBtns;
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
        if(res.ok) {
            alert('Guardado con éxito.');
            currentMicrodiseno.Id = ans.Id;
            checkStateUI();
        } else alert("Error: " + ans.Message);
    } catch(err) { alert(err); }
}

async function sendReview() {
    await saveDraft();
    if(currentMicrodiseno.Id === 0) return;
    if(confirm('¿Enviar a revisión?')) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/microdisenos/${currentMicrodiseno.Id}/enviar`, { method: 'POST' });
            if(res.ok) { location.reload(); }
        } catch(err) { alert(err); }
    }
}

