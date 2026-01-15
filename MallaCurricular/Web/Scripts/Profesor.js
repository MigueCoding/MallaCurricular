const API_BASE_URL = 'http://localhost:49513';

let courses = {};
let selectedSubjects = {}; // ← NUEVO
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

    } catch {
        list.innerHTML = `<div class="p-6 text-center text-red-500 text-sm">Error al cargar materias</div>`;
    }
}

/* =========================
   RENDER SIDEBAR
========================= */
function renderMaterias() {
    const list = document.getElementById('materias-list');
    list.innerHTML = '';

    Object.values(courses).forEach(course => {
        const item = document.createElement('div');

        item.className = 'sidebar-item px-5 py-3 cursor-pointer hover:bg-gray-100';

        // ✅ Si ya está seleccionada → marcar
        if (selectedSubjects[course.code]) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="font-bold text-sm text-gray-700">${course.name}</div>
            <div class="text-[10px] text-gray-400 font-mono">
                ${course.code} · ${course.credits} créditos
            </div>
        `;

        item.onclick = () => addSubject(course);
        list.appendChild(item);
    });
}
function addSubject(course) {
    if (selectedSubjects[course.code]) return;

    selectedSubjects[course.code] = course;

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('subject-preview').classList.remove('hidden');

    renderCenterPanel();
    renderMaterias(); // 🔥 vuelve a pintar la lista izquierda
}
function removeSubject(code) {
    delete selectedSubjects[code];

    if (currentSubject?.code === code) {
        currentSubject = null;
        document.getElementById('editor-container').classList.add('hidden');
    }

    renderCenterPanel();
    renderMaterias();
}

/* =========================
   AGREGAR AL PANEL CENTRAL
========================= */
function addToCenter(course) {
    if (selectedSubjects[course.code]) return;

    selectedSubjects[course.code] = course;

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('editor-container').classList.add('hidden');
    document.getElementById('subject-preview').classList.remove('hidden');

    renderCenterPanel();
}

/* =========================
   RENDER PANEL CENTRAL
========================= */
function renderCenterPanel() {
    const container = document.getElementById('subject-preview');

    const subjects = Object.values(selectedSubjects);

    if (!subjects.length) {
        document.getElementById('subject-preview').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-10 w-full max-w-5xl">
            ${subjects.map(course => `
                <div class="relative bg-white rounded-xl shadow border p-6 space-y-4">

                    <!-- BOTÓN ELIMINAR -->
                    <button onclick="removeSubject('${course.code}')"
                            class="absolute top-3 right-3 text-red-400 hover:text-red-600 text-sm">
                        ✕
                    </button>

                    <div>
                        <h2 class="text-lg font-black uppercase">${course.name}</h2>
                        <p class="text-xs text-gray-400 font-mono">${course.code}</p>
                    </div>

                    <div class="grid grid-cols-3 gap-2 text-sm">
                        <div class="bg-gray-50 rounded p-2 text-center">
                            <p class="text-xs text-gray-400">CR</p>
                            <p class="font-bold">${course.credits}</p>
                        </div>
                        <div class="bg-gray-50 rounded p-2 text-center">
                            <p class="text-xs text-gray-400">TPS</p>
                            <p class="font-bold">${course.tps}</p>
                        </div>
                        <div class="bg-gray-50 rounded p-2 text-center">
                            <p class="text-xs text-gray-400">TIS</p>
                            <p class="font-bold">${course.tis}</p>
                        </div>
                    </div>

                    <button onclick="editSubject('${course.code}')"
                        class="w-full bg-blue-900 text-white py-2 rounded-lg font-bold hover:bg-blue-800">
                        Editar
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}
function removeSubject(code) {
    delete selectedSubjects[code];

    if (currentSubject?.code === code) {
        currentSubject = null;
        document.getElementById('editor-container').classList.add('hidden');
    }

    renderCenterPanel();
    renderMaterias(); // 🔥 actualiza el sidebar
}
function backToSelected() {
    // Oculta el editor
    document.getElementById('editor-container').classList.add('hidden');

    // Muestra el panel central con las materias seleccionadas
    document.getElementById('subject-preview').classList.remove('hidden');

    // Limpia la materia actual en edición
    currentSubject = null;

    // Restaura el header
    document.getElementById('header-dinamico').innerHTML = `
        <h1 class="text-2xl font-bold">Gestión Académica</h1>
        <p class="text-blue-200 text-sm">Materias seleccionadas</p>
    `;
}
/* =========================
   EDITAR UNA MATERIA
========================= */
async function editSubject(code) {
    currentSubject = selectedSubjects[code];

    document.getElementById('subject-preview').classList.add('hidden');
    document.getElementById('editor-container').classList.remove('hidden');

    document.getElementById('header-dinamico').innerHTML = `
        <h1 class="text-xl font-bold uppercase">${currentSubject.name}</h1>
        <p class="text-xs text-blue-100 font-mono">${currentSubject.code}</p>
    `;

    loadPlanificacion(code);
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
