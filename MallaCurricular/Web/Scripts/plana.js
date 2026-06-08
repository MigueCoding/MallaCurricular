let courses = {};
const addedCourses = new Map();
let electivas = [];
let optativas = [];

const DEFAULT_CREDITOS = 0;
const DEFAULT_TPS = 0;
const DEFAULT_TIS = 0;

// =========================================================================
// FUNCIONES DE CARGA Y FETCH
// =========================================================================

async function fetchMallas() {
    const mallaSelect = document.getElementById('malla-select');
    try {
        const res = await fetch('http://localhost:49513/api/mallas');
        if (!res.ok) throw new Error('No se pudieron cargar las mallas.');
        const mallas = await res.json();

        // LIMPIEZA: Deja solo la opción por defecto
        mallaSelect.innerHTML = '<option value="">Seleccione una malla</option>';

        mallas.forEach(malla => {
            const option = document.createElement('option');
            option.value = malla.Id;
            option.textContent = malla.Nombre || `Malla ${malla.Id}`;
            mallaSelect.appendChild(option);
        });

        await fetchElectivasAndOptativas();

    } catch (err) {
        document.getElementById('error-message').textContent = err.message;
        document.getElementById('error-message').style.display = 'block';
        console.error(err);
    }
}

async function fetchElectivasAndOptativas() {
    document.getElementById('error-message').style.display = 'none';
    try {
        const [resElectivas, resOptativas] = await Promise.all([
            fetch('http://localhost:49513/api/cursos/catalogo/electivas'),
            fetch('http://localhost:49513/api/cursos/catalogo/optativas')
        ]);

        if (!resElectivas.ok) throw new Error('No se pudo cargar el catálogo de Electivas.');
        electivas = await resElectivas.json();

        if (!resOptativas.ok) throw Error('No se pudo cargar el catálogo de Optativas.');
        optativas = await resOptativas.json();

    } catch (err) {
        document.getElementById('error-message').textContent = err.message;
        document.getElementById('error-message').style.display = 'block';
        console.error(err);
    }
}

async function fetchCoursesByMalla() {
    const mallaSelect = document.getElementById('malla-select');
    const mallaId = mallaSelect.value;
    const grid = document.getElementById("semester-grid");
    const summaryContainer = document.getElementById("summary-container");

    // 1. LIMPIEZA INMEDIATA
    summaryContainer.innerHTML = "";
    grid.innerHTML = "";
    document.getElementById('error-message').style.display = 'none';

    if (!mallaId) {
        grid.innerHTML = '<p class="text-center text-red-500">Seleccione una malla.</p>';
        return;
    }

    grid.innerHTML = '<p class="text-center">Cargando cursos...</p>';

    try {
        const res = await fetch(`http://localhost:49513/api/cursos?mallaId=${mallaId}`);
        if (!res.ok) throw new Error('No se pudieron cargar los cursos.');
        const data = await res.json();

        // Actualizar título con el nombre de la malla seleccionada
        const selectedText = mallaSelect.options[mallaSelect.selectedIndex].text;
        document.getElementById('malla-title').textContent = selectedText;

        courses = {};
        addedCourses.clear();

        data.forEach(course => {
            courses[course.Codigo] = {
                code: course.Codigo,
                name: course.Asignatura,
                prerequisite: course.Prerequisito || '',
                color: course.Color,
                semester: course.Semestre,
                creditos: course.Creditos ?? DEFAULT_CREDITOS,
                TPS: course.TPS ?? DEFAULT_TPS,
                TIS: course.TIS ?? DEFAULT_TIS
            };
            addedCourses.set(course.Codigo, course.Semestre);
        });

        // 2. INSERTAR LEYENDAS (Solo una vez)
        renderSummaryAndLegends(summaryContainer);

        grid.innerHTML = '';
        renderSemesters();
    } catch (err) {
        grid.innerHTML = `<p class="text-center text-red-600">${err.message}</p>`;
    }
}

// Función auxiliar para organizar mejor el código de leyendas
function renderSummaryAndLegends(container) {
    container.innerHTML = `
        <div class="summary-box mt-4">
            <div class="summary-cell">TPS</div>
            <div class="summary-cell">TIS</div>
            <div class="summary-cell">Créditos</div>
            <div class="summary-cell">TPT</div>
            <div class="summary-cell">TIT</div>
            <div class="summary-cell">#</div>
        </div>
        <div class="legend">
            <p><strong>TPS:</strong> Trabajo Presencial Semanal</p>
            <p><strong>TIS:</strong> Trabajo Independiente Semanal</p>
            <p><strong>TPT:</strong> Trabajo Presencial Total</p>
            <p><strong>TIT:</strong> Trabajo Independiente Total</p>
            <p><strong>#:</strong> Número total de créditos</p>
        </div>
        <div class="color-legend mt-6 text-sm text-gray-700">
            <h3 class="font-semibold text-gray-800 mb-2">Leyenda de Colores</h3>
            <div><span class="inline-block w-4 h-4 bg-[#10b981] rounded-sm mr-2"></span> Ciencias Básicas</div>
            <div><span class="inline-block w-4 h-4 bg-[#3b82f6] rounded-sm mr-2"></span> Ciencias Básicas Tecnología - Ingeniería</div>
            <div><span class="inline-block w-4 h-4 bg-[#8b5cf6] rounded-sm mr-2"></span> Formación Profesional</div>
            <div><span class="inline-block w-4 h-4 bg-[#ef4444] rounded-sm mr-2"></span> Formación Complementaria</div>
            <div><span class="inline-block w-4 h-4 bg-[#b6ffff] rounded-sm mr-2"></span> Asignatura que la habilitó</div>
        </div>
    `;
}

// =========================================================================
// RENDERIZADO (SOLO VISTA INFORMATIVA)
// =========================================================================

function renderSemesters() {
    const grid = document.getElementById('semester-grid');
    grid.innerHTML = '';

    // Crear contenedores de semestres 1-10
    for (let i = 1; i <= 10; i++) {
        const semester = document.createElement('div');
        semester.className = 'semester';
        semester.setAttribute('data-semester', i);
        semester.innerHTML = `<h3>Semestre ${i}</h3><div id="courses-semester-${i}"></div>`;
        grid.appendChild(semester);
    }

    // Sección de propedéuticas (semestre 11)
    const propedeutic = document.createElement('div');
    propedeutic.className = 'semester mt-10';
    propedeutic.setAttribute('data-semester', 11);
    propedeutic.style.gridColumn = "1 / -1";
    propedeutic.innerHTML = `<h3 class="text-center mb-4 text-lg font-semibold">Asignaturas Propedéuticas</h3>
        <div id="courses-semester-11" class="flex flex-wrap justify-center gap-4 mt-4"></div>`;
    grid.appendChild(propedeutic);

    // Agrupar cursos por semestre
    const semesterCoursesMap = new Map();
    addedCourses.forEach((semester, code) => {
        const course = courses[code];
        if (!course) return;
        if (!semesterCoursesMap.has(semester)) semesterCoursesMap.set(semester, []);
        semesterCoursesMap.get(semester).push(course);
    });

    // Orden de colores para organización visual
    const colorOrder = ["course-green", "course-blue", "course-purple", "course-red"];

    semesterCoursesMap.forEach((courseList, semester) => {
        // Ordenar cursos por color
        courseList.sort((a, b) => {
            const aIndex = colorOrder.findIndex(c => a.color === c);
            const bIndex = colorOrder.findIndex(c => b.color === c);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });

        const container = document.getElementById(`courses-semester-${semester}`);
        if (!container) return;

        courseList.forEach(course => {
            const courseDiv = document.createElement('div');
            courseDiv.className = `course ${course.color}`;
            courseDiv.setAttribute("data-code", course.code);

            const TPS = course.TPS || 0;
            const TIS = course.TIS || 0;
            const creditos = course.creditos || 0;
            const TPT = TPS * 16;
            const TIT = TIS * 16;

            courseDiv.innerHTML = `
                <div class="course-title">${course.name}</div>
                <div class="course-code">${course.code}</div>
                <div class="credit-grid mt-2 border border-gray-300 rounded overflow-hidden">
                    <div class="grid grid-cols-3 text-sm text-center h-20">
                        <div class="border-r flex flex-col justify-between">
                            <div class="p-1 border-b supIzq">${TPS}</div>
                            <div class="p-1 infIzq">${TPT}</div>
                        </div>
                        <div class="border-r flex flex-col justify-between">
                            <div class="p-1 border-b supDer">${TIS}</div>
                            <div class="p-1 infDer">${TIT}</div>
                        </div>
                        <div class="flex items-center justify-center text-lg font-semibold creditos">${creditos}</div>
                    </div>
                </div>`;

            // Mostrar tags de prerrequisitos habilitadores
            if (course.prerequisite && course.prerequisite.trim() !== '') {
                const prereqList = course.prerequisite.split(',').map(p => p.trim());
                prereqList.forEach(prereqName => {
                    const prereqCourse = Object.values(courses).find(c =>
                        c.name.toLowerCase() === prereqName.toLowerCase() ||
                        c.code.toLowerCase() === prereqName.toLowerCase()
                    );

                    if (prereqCourse) {
                        const tag = document.createElement("div");
                        tag.className = "enabler-tag";
                        tag.textContent = prereqCourse.code;
                        courseDiv.appendChild(tag);
                    }
                });
            }

            container.appendChild(courseDiv);
        });

        // Calcular y mostrar resumen del semestre
        computeSemesterSum(semester);
    });
}

// =========================================================================
// CÁLCULO DE RESÚMENES POR SEMESTRE
// =========================================================================

function computeSemesterSum(semesterNumber) {
    const cont = document.getElementById(`courses-semester-${semesterNumber}`);
    if (!cont) return;

    const cursos = cont.querySelectorAll(".course");
    const prev = cont.querySelector(".summary-box");
    if (prev) prev.remove();

    if (cursos.length) {
        let s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0;

        cursos.forEach(c => {
            s1 += parseInt(c.querySelector(".supIzq").textContent) || 0;
            s2 += parseInt(c.querySelector(".infIzq").textContent) || 0;
            s3 += parseInt(c.querySelector(".supDer").textContent) || 0;
            s4 += parseInt(c.querySelector(".infDer").textContent) || 0;
            s5 += parseInt(c.querySelector(".creditos").textContent) || 0;
        });

        const box = document.createElement("div");
        box.className = "summary-box grid grid-cols-3 border border-black text-center mt-4";
        box.innerHTML = `
            <div class="col-span-2 grid grid-cols-2 border-r border-black">
                <div class="border-b border-black p-2 font-semibold">${s1}</div>
                <div class="border-b border-l border-black p-2 font-semibold">${s3}</div>
                <div class="border-black p-2 font-semibold">${s2}</div>
                <div class="border-l border-black p-2 font-semibold">${s4}</div>
            </div>
            <div class="flex items-center justify-center text-lg font-bold border-l border-black p-2">${s5}</div>
        `;
        cont.appendChild(box);
    }
}

// =========================================================================
// INICIALIZACIÓN
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    fetchMallas();

    const mallaSelect = document.getElementById('malla-select');
    if (mallaSelect) {
        mallaSelect.addEventListener('change', fetchCoursesByMalla);
    }

    // Lógica para el botón de Login redireccionando a YouTube
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
});
