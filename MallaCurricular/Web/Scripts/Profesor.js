const API_BASE_URL = 'http://localhost:49513';
let courses = {};
let currentSubject = null;

/* =========================
   CARGA INICIAL
========================= */
document.addEventListener('DOMContentLoaded', () => {
    fetchCourses();
});

/* =========================
   OBTENER MATERIAS
========================= */
async function fetchCourses() {
    const list = document.getElementById('materias-list');
    list.innerHTML = `<div class="p-6 text-center text-gray-400 text-sm">Cargando materias...</div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/cursos/todos`);
        const data = await res.json();

        courses = {};
        data.forEach(c => {
            courses[c.Codigo] = {
                code: c.Codigo,
                name: c.Asignatura,
                credits: c.Creditos,
                tps: c.TPS,
                tis: c.TIS
            };
        });

        renderMaterias();

    } catch (e) {
        list.innerHTML = `<div class="p-6 text-center text-red-500 text-sm">Error al cargar materias</div>`;
    }
}

/* =========================
   RENDER LISTA
========================= */
function renderMaterias() {
    const list = document.getElementById('materias-list');
    list.innerHTML = '';

    Object.values(courses).forEach(course => {
        const item = document.createElement('div');
        item.className = 'sidebar-item px-5 py-3 cursor-pointer hover:bg-gray-100';

        item.innerHTML = `
            <div class="font-bold text-sm text-gray-700">${course.name}</div>
            <div class="text-[10px] text-gray-400 font-mono">
                ${course.code} · ${course.credits} créditos
            </div>
        `;

        item.onclick = () => selectSubject(course, item);
        list.appendChild(item);
    });
}

/* =========================
   SELECCIONAR MATERIA
========================= */
function selectSubject(course, element) {
    currentSubject = course;

    // Resaltar en sidebar
    document.querySelectorAll('.course-item').forEach(i =>
        i.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50')
    );
    element.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');

    // Estados
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('editor-container').classList.add('hidden');
    document.getElementById('subject-preview').classList.remove('hidden');

    // Header
    document.getElementById('header-dinamico').innerHTML = `
        <h1 class="text-xl font-bold uppercase">${course.name}</h1>
        <p class="text-xs text-blue-100 font-mono">${course.code}</p>
    `;

    // Preview data
    document.getElementById('preview-name').textContent = course.name;
    document.getElementById('preview-code').textContent = course.code;
    document.getElementById('preview-credits').textContent = course.credits;
    document.getElementById('preview-tps').textContent = course.tps;
    document.getElementById('preview-tis').textContent = course.tis;
}
async function openEditor() {
    if (!currentSubject) return;

    document.getElementById('subject-preview').classList.add('hidden');
    document.getElementById('editor-container').classList.remove('hidden');

    try {
        const res = await fetch(`${API_BASE_URL}/api/planificacion/${currentSubject.code}`);
        const data = res.ok ? await res.json() : { Microcurriculo: '', Rubricas: [] };
        fillEditor(data);
    } catch {
        fillEditor({ Microcurriculo: '', Rubricas: [] });
    }
}

/* =========================
   CARGAR PLANIFICACIÓN
========================= */
async function loadPlanificacion(code) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/planificacion/${code}`);
        const data = res.ok ? await res.json() : {};

        document.getElementById('micro-content').value = data.Microcurriculo || '';
        document.getElementById('rubric-rows').innerHTML = '';

        if (data.Rubricas?.length) {
            data.Rubricas.forEach(r => addRubricRow(r.NombreActividad, r.Porcentaje));
        } else {
            addRubricRow();
        }

        updateTotal();

    } catch {
        document.getElementById('micro-content').value = '';
        addRubricRow();
    }
}

/* =========================
   RÚBRICAS
========================= */
function addRubricRow(nombre = '', porcentaje = '') {
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center';

    row.innerHTML = `
        <input class="flex-1 p-2 border rounded text-sm" placeholder="Actividad" value="${nombre}">
        <input type="number" class="w-20 p-2 border rounded text-sm text-center" value="${porcentaje}" oninput="updateTotal()">
        <span class="text-xs">%</span>
        <button onclick="this.parentElement.remove();updateTotal()" class="text-red-400">✕</button>
    `;

    document.getElementById('rubric-rows').appendChild(row);
}

function updateTotal() {
    let total = 0;
    document.querySelectorAll('#rubric-rows input[type="number"]').forEach(i => {
        total += parseFloat(i.value) || 0;
    });

    document.getElementById('total-badge').textContent = `Total: ${total}%`;
}

/* =========================
   GUARDAR
========================= */
async function saveChanges() {
    if (!currentSubject) return;

    const rows = document.querySelectorAll('#rubric-rows > div');
    const rubricas = [];

    rows.forEach(r => {
        const inputs = r.querySelectorAll('input');
        if (inputs[0].value.trim()) {
            rubricas.push({
                NombreActividad: inputs[0].value,
                Porcentaje: parseFloat(inputs[1].value) || 0
            });
        }
    });

    const payload = {
        CodigoMateria: currentSubject.code,
        Microcurriculo: document.getElementById('micro-content').value,
        Rubricas: rubricas
    };

    await fetch(`${API_BASE_URL}/api/planificacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    alert('✅ Guardado correctamente');
}

/* =========================
   BUSCADOR
========================= */
function filterMaterias() {
    const q = document.getElementById('search-materia').value.toLowerCase();
    document.querySelectorAll('#materias-list > div').forEach(i => {
        i.style.display = i.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}
