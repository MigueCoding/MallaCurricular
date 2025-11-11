let courses = {};
const addedCourses = new Map();

async function fetchMallas() {
    const mallaSelect = document.getElementById('malla-select');
    try {
        const res = await fetch('http://localhost:49513/api/mallas');
        if (!res.ok) throw new Error('No se pudieron cargar las mallas.');
        const mallas = await res.json();
        mallas.forEach(malla => {
            const option = document.createElement('option');
            option.value = malla.Id;
            option.textContent = malla.Nombre || `Malla ${malla.Id}`;
            mallaSelect.appendChild(option);
        });
    } catch (err) {
        document.getElementById('error-message').textContent = err.message;
        document.getElementById('error-message').style.display = 'block';
        console.error(err);
    }
}

async function fetchCoursesByMalla() {
    const mallaId = document.getElementById('malla-select').value;
    const grid = document.getElementById("semester-grid");
    grid.innerHTML = '<p class="text-center">Cargando cursos...</p>';
    document.getElementById('error-message').style.display = 'none';
    const summaryContainer = document.getElementById("summary-container");
    summaryContainer.innerHTML = "";

    if (!mallaId) {
        grid.innerHTML = '<p class="text-center text-red-500">Seleccione una malla.</p>';
        document.getElementById('malla-title').textContent = "Malla Curricular - ITM";
        document.getElementById('malla-version').textContent = "";
        return;
    }

    // NUEVO BLOQUE: Mostrar nombre y versión de la malla
    try {
        const resMalla = await fetch(`http://localhost:49513/api/mallas/${mallaId}`);
        if (resMalla.ok) {
            const mallaData = await resMalla.json();
            document.getElementById('malla-title').textContent = mallaData.Nombre || "Malla Curricular - ITM";
            document.getElementById('malla-version').textContent = `Versión: ${mallaData.Version || "No especificada"}`;
        }
    } catch (err) {
        console.warn("No se pudo obtener la versión de la malla.", err);
        document.getElementById('malla-version').textContent = "";
    }

    try {
        const res = await fetch(`http://localhost:49513/api/cursos?mallaId=${mallaId}`);
        if (!res.ok) throw new Error('No se pudieron cargar los cursos.');
        const data = await res.json();

        courses = {};
        addedCourses.clear();

        data.forEach(course => {
            courses[course.Codigo] = {
                code: course.Codigo,
                name: course.Asignatura,
                prerequisite: course.Prerequisito || '',
                color: course.Color,
                semester: course.Semestre,
                creditos: course.Creditos,
                TPS: course.TPS,
                TIS: course.TIS
            };
            addedCourses.set(course.Codigo, course.Semestre);
        });

        // el resto igual
        const summaryBox = document.createElement("div");
        summaryBox.className = "summary-box mt-4";
        summaryBox.innerHTML = `
            <div class="summary-cell">TPS</div>
            <div class="summary-cell">TIS</div>
            <div class="summary-cell">Créditos</div>
            <div class="summary-cell">TPT</div>
            <div class="summary-cell">TIT</div>
            <div class="summary-cell">#</div>`;
        summaryContainer.appendChild(summaryBox);

        const legend = document.createElement("div");
        legend.className = "legend";
        legend.innerHTML = `
            <p><strong>TPS:</strong> Trabajo Presencial Semanal</p>
            <p><strong>TIS:</strong> Trabajo Independiente Semanal</p>
            <p><strong>TPT:</strong> Trabajo Presencial Total</p>
            <p><strong>TIT:</strong> Trabajo Independiente Total</p>
            <p><strong>#:</strong> Número total de créditos</p>`;
        summaryContainer.appendChild(legend);

        const colorLegend = document.createElement("div");
        colorLegend.className = "color-legend mt-6 text-sm text-gray-700";
        colorLegend.innerHTML = `
            <h3 class="font-semibold text-gray-800 mb-2">Leyenda de Colores</h3>
            <div><span class="inline-block w-4 h-4 bg-[#10b981] rounded-sm mr-2"></span> Ciencias Básicas</div>
            <div><span class="inline-block w-4 h-4 bg-[#3b82f6] rounded-sm mr-2"></span> Ciencias Básicas Tecnología - Ingeniería</div>
            <div><span class="inline-block w-4 h-4 bg-[#8b5cf6] rounded-sm mr-2"></span> Formación Profesional</div>
            <div><span class="inline-block w-4 h-4 bg-[#ef4444] rounded-sm mr-2"></span> Formación Complementaria</div>
            <div><span class="inline-block w-4 h-4 bg-[#b6ffff] rounded-sm mr-2"></span> Asignatura que la habilitó</div>`;
        summaryContainer.appendChild(colorLegend);

        renderSemesters();
    } catch (err) {
        grid.innerHTML = `<p class="text-center text-red-600">${err.message}</p>`;
        console.error(err);
    }
}

function renderSemesters() {
    const grid = document.getElementById('semester-grid');
    grid.innerHTML = '';

    // 1. Crear los 10 semestres normales (1 a 10)
    for (let i = 1; i <= 10; i++) {
        const semester = document.createElement('div');
        semester.className = 'semester';
        semester.setAttribute('data-semester', i);
        semester.innerHTML = `<h3>Semestre ${i}</h3><div id="courses-semester-${i}"></div>`;
        grid.appendChild(semester);
    }

    // 2. Crear el bloque de Asignaturas Propedéuticas (Semestre 11 o P)
    // Usaremos el valor '11' para hacer referencia al Semestre Propedéutico
    const propedeutic = document.createElement('div');
    propedeutic.className = 'semester mt-10';
    propedeutic.setAttribute('data-semester', 11);
    propedeutic.style.gridColumn = "1 / -1"; // Ocupar todo el ancho
    propedeutic.innerHTML = `<h3 class="text-center mb-4 text-lg font-semibold">Asignaturas Propedéuticas</h3>
        <div id="courses-semester-11" class="flex flex-wrap justify-center gap-4 mt-4"></div>`;
    grid.appendChild(propedeutic);


    // 3. Renderizar todos los cursos (Semestres 1-10 y 11)
    addedCourses.forEach((semester, code) => {
        const course = courses[code];
        if (!course) return;

        // ❗ La corrección clave: Asegurarse de buscar el ID de contenedor correcto.
        const containerId = `courses-semester-${semester}`;
        const container = document.getElementById(containerId);

        // Si el contenedor no existe (por ejemplo, si el semestre viene como 'P' en lugar de '11')
        if (!container) {
            console.error(`Contenedor no encontrado para el semestre: ${semester}. Verifique que el backend devuelva 11 para Propedéuticas.`);
            return; // Detiene el procesamiento de este curso
        }

        const courseDiv = document.createElement('div');
        courseDiv.className = `course ${course.color}`;
        courseDiv.setAttribute("data-code", course.code);

        const wasCompletedInStorage = localStorage.getItem(`course-${course.code}`) === "true";
        if (wasCompletedInStorage) {
            courseDiv.classList.add("completed");
        }

        // Ahora el requisito de semestre 11 debe funcionar
        if (course.prerequisite && !isCompletedByName(course.prerequisite)) {
            courseDiv.classList.add("disabled");
        }

        const TPS = course.TPS || 0;
        const TIS = course.TIS || 0;
        const creditos = course.creditos || 0;
        const TPT = TPS * 16;
        const TIT = TIS * 16;

        courseDiv.innerHTML = `<div class="course-title">${course.name}</div>
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

        courseDiv.addEventListener("click", () => {
            if (courseDiv.classList.contains("disabled")) return;

            const isNowCompleted = courseDiv.classList.toggle("completed");
            const borderColor = window.getComputedStyle(courseDiv).borderLeftColor;

            if (isNowCompleted) {
                courseDiv.style.setProperty("--check-color", borderColor);
            } else {
                courseDiv.style.removeProperty("--check-color");
            }

            localStorage.setItem(`course-${course.code}`, isNowCompleted ? "true" : "false");
            updateDependencies(course.code);
            computeSemesterSums();
        });

        // ❗ Aquí se produce el append, ahora el 'container' ya existe para el semestre 11.
        container.appendChild(courseDiv);

        if (wasCompletedInStorage) {
            const borderColor = window.getComputedStyle(courseDiv).borderLeftColor;
            courseDiv.style.setProperty("--check-color", borderColor);
        }
    });

    Object.values(courses).forEach(c => updateDependencies(c.code));
    computeSemesterSums();
}

function isCompletedByName(prereqString) {
    if (!prereqString || prereqString.trim() === "") return true;

    // Dividir la cadena de prerrequisitos por coma (,) y limpiar espacios
    const requiredPrereqs = prereqString.split(',').map(p => p.trim()).filter(p => p.length > 0);

    // Iterar sobre cada prerrequisito requerido
    const allCompleted = requiredPrereqs.every(reqName => {
        // Buscar el curso correspondiente por nombre o código
        const c = Object.values(courses).find(x =>
            x.name.toLowerCase() === reqName.toLowerCase() ||
            x.code.toLowerCase() === reqName.toLowerCase()
        );

        // Si el curso no existe en la lista (error de tipeo), lo consideramos "no completado" por seguridad
        if (!c) {
            console.warn(`Prerrequisito no encontrado en la lista maestra: ${reqName}`);
            return false;
        }

        // Verificar el estado de completado en localStorage
        return localStorage.getItem(`course-${c.code}`) === "true";
    });

    return allCompleted;
}

function updateDependencies(code) {
    const completed = localStorage.getItem(`course-${code}`) === "true";
    const enablerDiv = document.querySelector(`[data-code="${code}"]`);
    const enablerColor = enablerDiv ? window.getComputedStyle(enablerDiv).borderLeftColor : "#86efac";

    // Obtener el nombre o código del curso que acaba de cambiar de estado
    const currentCourseName = courses[code]?.name || code;

    Object.values(courses).forEach(course => {

        // ❗ NUEVA LÓGICA: Verificar si el curso actual (code) es uno de los prerrequisitos
        const prereqList = (course.prerequisite || '').split(',').map(p => p.trim().toLowerCase());
        const dependsOnCurrent = prereqList.includes(currentCourseName.toLowerCase()) || prereqList.includes(code.toLowerCase());

        // Si el curso actual (code) es un prerrequisito del curso que estamos evaluando
        if (dependsOnCurrent) {
            const div = document.querySelector(`[data-code="${course.code}"]`);
            if (!div) return;

            // ❗ Reevaluar el estado de habilitación usando la NUEVA función de validación
            const allPrereqsMet = isCompletedByName(course.prerequisite);
            const existingTag = div.querySelector(".enabler-tag");

            if (allPrereqsMet) {
                // Habilitar
                if (div.classList.contains("disabled")) {
                    div.classList.remove("disabled");
                    div.classList.add("available");
                    div.style.setProperty("--highlight-color", enablerColor);
                    setTimeout(() => div.classList.remove("available"), 1000);
                }
                if (!existingTag) {
                    // Solo añadir el tag si es necesario (ejemplo visual)
                    const tag = document.createElement("div");
                    tag.className = "enabler-tag";
                    tag.textContent = code;
                    div.appendChild(tag);
                }
            } else {
                // Deshabilitar (si le falta algún prerrequisito)
                div.classList.add("disabled");
                if (div.classList.contains("completed")) div.classList.remove("completed");
                localStorage.setItem(`course-${course.code}`, "false");
                if (existingTag) existingTag.remove();
            }

            // Continuar la recursividad para las dependencias de este curso
            updateDependencies(course.code);
        }
    });

    computeSemesterSums();
}

function computeSemesterSums() {
    for (let i = 1; i <= 10; i++) {
        const cont = document.getElementById(`courses-semester-${i}`);
        if (!cont) continue;
        const cursos = cont.querySelectorAll(".course");
        const prev = cont.querySelector(".summary-box");
        if (prev) prev.remove();
        if (cursos.length) {
            let s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0;
            cursos.forEach(c => {
                if (c.classList.contains("disabled")) return;
                s1 += parseInt(c.querySelector(".supIzq").textContent) || 0;
                s2 += parseInt(c.querySelector(".infIzq").textContent) || 0;
                s3 += parseInt(c.querySelector(".supDer").textContent) || 0;
                s4 += parseInt(c.querySelector(".infDer").textContent) || 0;
                s5 += parseInt(c.querySelector(".creditos").textContent) || 0;
            });
            const box = document.createElement("div");
            box.className = "summary-box grid grid-cols-3 border border-black text-center";
            box.innerHTML = `
                <div class="col-span-2 grid grid-cols-2 border-r border-black">
                    <div class="border-b border-black">${s1}</div>
                    <div class="border-b border-l border-black">${s3}</div>
                    <div class="border-black">${s2}</div>
                    <div class="border-l border-black">${s4}</div>
                </div>
                <div class="flex items-center justify-center text-lg font-bold border-l border-black">${s5}</div>
            `;
            cont.appendChild(box);
        }
    }
}