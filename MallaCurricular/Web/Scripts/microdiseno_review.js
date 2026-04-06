const API_BASE_URL = 'http://localhost:49513';
let currentMicrodiseno = { Id: 0 };

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const cursoCodigo = params.get('cursoCodigo') || params.get('cursoCode') || params.get('code') || params.get('codigo');
    const semestre = params.get('semestre') || '2026-I';

    if(cursoCodigo && cursoCodigo.trim() !== "" && cursoCodigo !== "undefined") {
        loadMicrodiseno(cursoCodigo, semestre);
        fetchCourseInfo(cursoCodigo);
    } else {
        alert("Falta información del curso para revisión.");
        window.location.href = 'Jefe.html';
    }
});

function goBack() {
    window.location.href = 'Jefe.html?tab=microdisenos';
}

async function loadMicrodiseno(codigo, semestre) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/microdisenos/${encodeURIComponent(codigo)}/${encodeURIComponent(semestre)}`);
        if(res.ok) {
            const data = await res.json();
            currentMicrodiseno = data;
            fillForm(data);
        } else {
            console.warn("No se encontró microdiseño, llenando solo nombre de asignatura.");
        } 
    } catch(err) { console.error(err); }
}

async function fetchCourseInfo(codigo) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/cursos/${encodeURIComponent(codigo)}`);
        if(res.ok) {
            const course = await res.json();
            document.getElementById('asig-nombre').value = course.Asignatura || '';
        }
    } catch(err) { console.error(err); }
}

function fillForm(m) {
    // document.getElementById('asig-nombre').value = m.Asignatura || ''; // No longer from DTO
    document.getElementById('asig-codigo').value = m.CursoCodigo || '';
    document.getElementById('sel-facultad').value = m.Facultad || '';
    document.getElementById('sel-modalidad').value = m.Modalidad || '';
    document.getElementById('sel-tipoasignatura').value = m.TipoAsignatura || '';
    document.getElementById('sel-tipocredito').value = m.TipoCredito || '';
    document.getElementById('num-creditos').value = m.Creditos || '';

    let c = {};
    if(m.ContenidoJSON) {
        try { c = JSON.parse(m.ContenidoJSON); } catch(e){}
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
    const setPara = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || ''; };

    setVal('txt-programas', c.programas);
    setVal('txt-area', c.area);
    setVal('txt-plandeestudios', c.plandeestudios);
    setVal('txt-correq', c.correq);
    setVal('txt-prereq', c.prereq);
    
    setVal('num-hteoricas', c.hteoricas);
    setVal('num-hteoprac', c.hteoprac);
    setVal('num-hprac', c.hprac);
    setVal('num-hindep', c.hindep);
    setVal('num-hpres', c.hpres);
    setVal('num-hfisicos', c.hfisicos);
    setVal('num-hsinc', c.hsinc);

    setPara('txt-justificacion', c.justificacion);
    setPara('txt-competencias', c.competencias);
    setPara('txt-resultados-aprendizaje', c.resultadosAprendizaje);
    
    setPara('txt-saber-dec-crit', c.saberDecCrit);
    setPara('txt-saber-dec-evi', c.saberDecEvi);
    setPara('txt-saber-pro-crit', c.saberProCrit);
    setPara('txt-saber-pro-evi', c.saberProEvi);
    setPara('txt-saber-act-crit', c.saberActCrit);
    setPara('txt-saber-act-evi', c.saberActEvi);

    setPara('txt-diagnostico', c.diagnostico);
    setPara('txt-metodologia', c.metodologia);
    setPara('txt-trabajoindep', c.trabajoindep);
    setPara('txt-bibliografia', c.bibliografia);

    // Evaluaciones
    const tbody = document.getElementById('eval-body');
    tbody.innerHTML = '';
    if(c.evaluaciones) {
        c.evaluaciones.forEach(ev => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-1">${ev.eval || ''}</td>
                <td class="p-1 text-center">${ev.porcentaje || ''}%</td>
                <td class="p-1">${ev.estrategia || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Footer
    document.getElementById('txt-elaborado').textContent = m.ElaboradoPor || '';
    document.getElementById('txt-revisado').textContent = m.RevisadoPor || '';
    document.getElementById('txt-aprobado').textContent = m.AprobadoPor || '';
    document.getElementById('txt-modalidad-info').textContent = m.Modalidad || '';
    document.getElementById('txt-fecha-info').textContent = m.FechaAprobacion ? m.FechaAprobacion.substring(0,10) : 'Pendiente';

    renderActionButtons(m.Estado);
}

function renderActionButtons(st) {
    const btns = document.getElementById('action-buttons');
    btns.innerHTML = '';
    
    if(st === 'Pendiente') {
        btns.innerHTML = `
            <button onclick="showModalRechazo()" class="bg-red-600 hover:bg-red-700 text-white px-5 py-1.5 text-sm font-bold rounded shadow-lg transition-all">Rechazar</button>
            <button onclick="approveReview()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1.5 text-sm font-bold rounded shadow-lg transition-all ml-1">Aprobar Formato</button>
        `;
    } else if(st === 'Aprobado') {
        btns.innerHTML = `
            <span class="mr-4 text-emerald-400 font-bold uppercase text-[10px]">Aprobación Oficial</span>
            <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 text-sm font-bold rounded shadow transition-all">
                Imprimir PDF
            </button>
        `;
    } else {
        btns.innerHTML = `<span class="italic text-xs text-white/50">Estado: ${st}</span>`;
    }
}

async function approveReview() {
    if(confirm('¿Está seguro de aprobar este microdiseño? Se publicará oficialmente.')) {
        const payload = { Accion: 'Aprobar', RevisorNombre: localStorage.getItem('userName') || 'Coordinador' };
        try {
            const res = await fetch(`${API_BASE_URL}/api/microdisenos/${currentMicrodiseno.Id}/aprobar`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if(res.ok) {
                alert("Microdiseño Aprobado Exitosamente.");
                goBack();
            }
        } catch(err) { alert(err); }
    }
}

function showModalRechazo() { document.getElementById('modal-rechazo').style.display = 'flex'; }
function closeModalRechazo() { document.getElementById('modal-rechazo').style.display = 'none'; }

async function submitRechazo() {
    const obs = document.getElementById('txt-motivo-rechazo').value;
    if(!obs.trim()) return alert('Debe proporcionar un motivo para el rechazo.');
    
    const payload = { Accion: 'Rechazar', RevisorNombre: localStorage.getItem('userName') || 'Coordinador', Observaciones: obs };
    try {
        const res = await fetch(`${API_BASE_URL}/api/microdisenos/${currentMicrodiseno.Id}/rechazar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if(res.ok) {
            alert("Microdiseño devuelto al docente para correcciones.");
            goBack();
        }
    } catch(err) { alert(err); }
}
