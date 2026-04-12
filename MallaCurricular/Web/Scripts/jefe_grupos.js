const API_GRUPOS = 'http://localhost:49513/api/grupos';

let todosLosEstudiantes = [];
let todosLosGrupos = [];

async function initJefeGrupos() {
    await Promise.all([
        cargarSelect('grupo-curso', 'http://localhost:49513/api/cursos/todos', 'Codigo', 'Asignatura'),
        cargarSelect('grupo-profesor', API_GRUPOS + '/profesores', 'id_usuario', 'nombre')
    ]);
    
    try {
        const res = await fetch(API_GRUPOS + '/estudiantes');
        todosLosEstudiantes = await res.json();
        renderEstudiantesSelect([]);
    } catch(e) { console.error(e); }

    await actualizarInscribirGrupos();
    
    document.getElementById('inscribir-grupo').addEventListener('change', actualizarEstudiantesSelect);
}

async function actualizarEstudiantesSelect() {
    const grupoId = document.getElementById('inscribir-grupo').value;
    if (!grupoId) {
        renderEstudiantesSelect([]);
        return;
    }
    try {
        const res = await fetch(API_GRUPOS + '/estudiantes-inscritos/' + grupoId);
        const inscritos = await res.json();
        const inscritosIds = inscritos.map(i => i.EstudianteId);
        renderEstudiantesSelect(inscritosIds);
    } catch(e) {
        console.error(e);
    }
}

function renderEstudiantesSelect(inscritosIds) {
    const sel = document.getElementById('inscribir-estudiante');
    sel.innerHTML = '<option value="">Seleccione...</option>';
    todosLosEstudiantes.forEach(item => {
        if (!inscritosIds.includes(item.id_usuario)) {
            sel.innerHTML += `<option value="${item.id_usuario}">${item.nombre} (${item.id_usuario})</option>`;
        }
    });
}

async function cargarSelect(selectId, url, valProp, textProp) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        const sel = document.getElementById(selectId);
        sel.innerHTML = '<option value="">Seleccione...</option>';
        data.forEach(item => {
            sel.innerHTML += `<option value="${item[valProp]}">${item[textProp]} (${item[valProp]})</option>`;
        });
    } catch(e) { console.error(e); }
}

async function actualizarInscribirGrupos() {
    try {
        const res = await fetch(API_GRUPOS + '/todos');
        const data = await res.json();
        todosLosGrupos = data;
        const sel = document.getElementById('inscribir-grupo');
        sel.innerHTML = '<option value="">Seleccione...</option>';
        data.forEach(g => {
            sel.innerHTML += `<option value="${g.Id}">${g.Asignatura} - ${g.Nombre} (Prof. ${g.ProfesorNombre})</option>`;
        });
    } catch(e) { console.error(e); }
}

async function crearGrupo() {
    const Nombre = document.getElementById('grupo-nombre').value.trim();
    const CursoCodigo = document.getElementById('grupo-curso').value;
    const ProfesorId = document.getElementById('grupo-profesor').value;
    
    if(!Nombre || !CursoCodigo || !ProfesorId) return alert('Llene todos los campos');

    const grupoExiste = todosLosGrupos.some(g => g.Nombre.toLowerCase() === Nombre.toLowerCase() && g.CursoCodigo === CursoCodigo);
    if(grupoExiste) {
        return alert('Ya existe un grupo con ese nombre para esta asignatura.');
    }

    const res = await fetch(API_GRUPOS + '/crear', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({Nombre, CursoCodigo, ProfesorId})
    });
    if(res.ok) {
        alert('Grupo creado Exitosamente!');
        document.getElementById('grupo-nombre').value = '';
        actualizarInscribirGrupos();
    } else {
        const text = await res.text();
        alert('Error al crear el grupo: ' + text.replace(/["']/g, ''));
    }
}

async function inscribirEstudiante() {
    const GrupoId = document.getElementById('inscribir-grupo').value;
    const EstudianteId = document.getElementById('inscribir-estudiante').value;
    
    if(!GrupoId || !EstudianteId) return alert('Llene todos los campos');

    const res = await fetch(API_GRUPOS + '/inscribir', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({GrupoId, EstudianteId})
    });
    if(res.ok) {
        alert('Estudiante matriculado exitosamente en el grupo!');
        // Actualizar el select para que el estudiante desaparezca
        actualizarEstudiantesSelect();
    } else alert('Error al matricular estudiante');
}

function switchJefeTab(tab) {
    document.getElementById('malla-section').classList.add('hidden');
    document.getElementById('grupos-section').classList.add('hidden');
    document.getElementById('tab-malla').classList.remove('text-white');
    document.getElementById('tab-malla').classList.add('text-gray-300');
    document.getElementById('tab-grupos').classList.remove('text-white');
    document.getElementById('tab-grupos').classList.add('text-gray-300');
    
    document.getElementById(tab + '-section').classList.remove('hidden');
    document.getElementById('tab-' + tab).classList.remove('text-gray-300');
    document.getElementById('tab-' + tab).classList.add('text-white');
    
    if(tab === 'grupos') initJefeGrupos();
}
