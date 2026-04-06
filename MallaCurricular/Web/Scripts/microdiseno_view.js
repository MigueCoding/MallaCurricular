const API_BASE_URL = 'http://localhost:49513';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const cursoCodigo = params.get('cursoCodigo') || params.get('cursoCode') || params.get('code') || params.get('codigo');

    if (cursoCodigo && cursoCodigo.trim() !== "" && cursoCodigo !== "undefined") {
        loadMicrodisenoAprobado(cursoCodigo);
        fetchCourseInfo(cursoCodigo);
    } else {
        const fullUrl = window.location.href;
        console.error("URL Full:", fullUrl);
        alert("Error de navegación: No se recibió el código del curso. URL detectada: " + fullUrl);
        window.close();
    }
});

async function loadMicrodisenoAprobado(codigo) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/microdisenos/aprobados/curso/${encodeURIComponent(codigo)}`);
        if (res.ok) {
            const data = await res.json();
            fillForm(data);
        } else if (res.status === 404) {
            document.getElementById('doc-container').innerHTML = `
                <div class="p-20 text-center">
                    <div class="text-6xl mb-4">📄</div>
                    <h2 class="text-xl font-bold text-gray-800">Microdiseño No Publicado</h2>
                    <p class="text-gray-500 mt-2">Este microdiseño aún no ha sido aprobado oficialmente por la coordinación para su consulta pública.</p>
                </div>`;
        }
    } catch (err) { console.error(err); }
}

async function fetchCourseInfo(codigo) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/cursos/${encodeURIComponent(codigo)}`);
        if (res.ok) {
            const course = await res.json();
            document.getElementById('asig-nombre').value = course.Asignatura || '';
            if(document.getElementById('num-creditos')) document.getElementById('num-creditos').value = course.Creditos || '';
        }
    } catch (err) { console.error(err); }
}

function fillForm(m) {
    // Fill text inputs (readonly in HTML)
    document.getElementById('asig-codigo').value = m.CursoCodigo || '';
    document.getElementById('sel-facultad').value = m.Facultad || '';
    document.getElementById('sel-modalidad').value = m.Modalidad || '';
    document.getElementById('sel-tipoasignatura').value = m.TipoAsignatura || '';
    document.getElementById('sel-tipocredito').value = m.TipoCredito || '';

    // Header info
    document.getElementById('txt-version-head').textContent = m.Version || '05';
    document.getElementById('txt-fecha-head').textContent = m.FechaAprobacion ? m.FechaAprobacion.substring(0, 10) : '30-07-2024';

    let c = {};
    if (m.ContenidoJSON) {
        try { c = JSON.parse(m.ContenidoJSON); } catch (e) { }
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    const setPara = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };

    setVal('txt-programas', c.programas);
    setVal('txt-area', c.area);
    setVal('txt-plandeestudios', c.plandeestudios);

    setPara('txt-justificacion', c.justificacion);
    setPara('txt-competencias', c.competencias);
    setPara('txt-resultados-aprendizaje', c.resultadosAprendizaje);

    setPara('txt-saber-dec-crit', c.saberDecCrit);
    setPara('txt-saber-dec-evi', c.saberDecEvi);
    setPara('txt-saber-pro-crit', c.saberProCrit);
    setPara('txt-saber-pro-evi', c.saberProEvi);
    setPara('txt-saber-act-crit', c.saberActCrit);
    setPara('txt-saber-act-evi', c.saberActEvi);

    setPara('txt-metodologia', c.metodologia);
    setPara('txt-materiales', c.materiales);

    // Evaluaciones
    const tbody = document.getElementById('eval-body');
    tbody.innerHTML = '';
    if (c.evaluaciones) {
        c.evaluaciones.forEach(ev => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-2">${ev.eval || ''}</td>
                <td class="p-2 text-center font-bold">${ev.porcentaje || ''}%</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Footer
    document.getElementById('txt-elaborado').textContent = m.ElaboradoPor || '';
    document.getElementById('txt-aprobado').textContent = m.AprobadoPor || '';
}
