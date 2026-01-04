let courses = {};
const addedCourses = new Map();
let electivas = [];
let optativas = [];
let currentSelector = null;
let occupiedCourseCodes = new Set();

let occupiedElectivasCodes = new Set();
let occupiedOptativasCodes = new Set();

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

    try {
        const res = await fetch(`http://localhost:49513/api/cursos?mallaId=${mallaId}`);
        if (!res.ok) throw new Error('No se pudieron cargar los cursos.');
        const data = await res.json();

        courses = {};
        addedCourses.clear();
        occupiedCourseCodes.clear();
        occupiedElectivasCodes.clear();
        occupiedOptativasCodes.clear();

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
            occupiedCourseCodes.add(course.Codigo);
        });

        Object.values(courses).forEach(course => {
            const isElectivaSlot = course.name.toLowerCase().includes('electiva');
            const isOptativaSlot = course.name.toLowerCase().includes('optativa');

            if (isElectivaSlot || isOptativaSlot) {
                const type = isElectivaSlot ? 'electiva' : 'optativa';
                const slotCode = course.code;
                const selectedCode = localStorage.getItem(`selected-${slotCode}-code`);

                if (selectedCode) {
                    const catalogue = type === 'electiva' ? electivas : optativas;
                    const selectedCourse = catalogue.find(c => c.Codigo === selectedCode);

                    if (selectedCourse) {
                        delete courses[slotCode];
                        addedCourses.delete(slotCode);
                        occupiedCourseCodes.delete(slotCode);

                        const courseData = {
                            code: selectedCourse.Codigo,
                            name: selectedCourse.Asignatura,
                            prerequisite: selectedCourse.Prerequisito || '',
                            color: course.color,
                            semester: course.semester,
                            creditos: selectedCourse.Creditos ?? DEFAULT_CREDITOS,
                            TPS: selectedCourse.TPS ?? DEFAULT_TPS,
                            TIS: selectedCourse.TIS ?? DEFAULT_TIS,
                            courseType: type
                        };

                        courses[selectedCourse.Codigo] = courseData;
                        addedCourses.set(selectedCourse.Codigo, courseData.semester);
                        occupiedCourseCodes.add(selectedCourse.Codigo);

                        if (type === 'electiva') {
                            occupiedElectivasCodes.add(selectedCourse.Codigo);
                        } else {
                            occupiedOptativasCodes.add(selectedCourse.Codigo);
                        }
                    }
                } else {
                    course.creditos = course.creditos ?? DEFAULT_CREDITOS;
                    course.TPS = course.TPS ?? DEFAULT_TPS;
                    course.TIS = course.TIS ?? DEFAULT_TIS;
                    course.courseType = type;
                    occupiedCourseCodes.delete(slotCode);
                }
            }
        });

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

// =========================================================================
// LÓGICA DE SELECCIÓN INTERACTIVA (SEPARADA POR TIPO)
// =========================================================================

function handleCourseSelectionInCard(type, slotCode, newCourseCode) {
    const previousSelectedCode = localStorage.getItem(`selected-${slotCode}-code`);
    const activeCourseCode = previousSelectedCode || slotCode;
    const currentSlotCourse = courses[activeCourseCode];

    if (!currentSlotCourse) {
        console.error(`No se encontró la información del curso activo para el slot: ${activeCourseCode}`);
        return;
    }

    const deleteActiveCourse = () => {
        if (courses[activeCourseCode]) {
            occupiedCourseCodes.delete(activeCourseCode);

            const courseType = courses[activeCourseCode].courseType || type;
            if (courseType === 'electiva') {
                occupiedElectivasCodes.delete(activeCourseCode);
            } else if (courseType === 'optativa') {
                occupiedOptativasCodes.delete(activeCourseCode);
            }

            delete courses[activeCourseCode];
            addedCourses.delete(activeCourseCode);
            localStorage.removeItem(`course-${activeCourseCode}`);
        }
    };

    if (!newCourseCode) {
        deleteActiveCourse();
        localStorage.removeItem(`selected-${slotCode}-code`);

        const courseData = {
            code: slotCode,
            name: currentSlotCourse.name.includes('Electiva') || currentSlotCourse.name.includes('Optativa')
                ? currentSlotCourse.name
                : `${type.charAt(0).toUpperCase() + type.slice(1)} I`,
            prerequisite: currentSlotCourse.prerequisite || '',
            color: currentSlotCourse.color,
            semester: currentSlotCourse.semester,
            creditos: DEFAULT_CREDITOS,
            TPS: DEFAULT_TPS,
            TIS: DEFAULT_TIS,
            courseType: type
        };

        courses[slotCode] = courseData;
        addedCourses.set(slotCode, currentSlotCourse.semester);

        renderSemesters();
        return;
    }

    const newCourse = (type === 'electiva' ? electivas : optativas).find(c => c.Codigo === newCourseCode);

    if (newCourse) {
        deleteActiveCourse();

        const courseData = {
            code: newCourse.Codigo,
            name: newCourse.Asignatura,
            prerequisite: newCourse.Prerequisito || '',
            color: currentSlotCourse.color,
            semester: currentSlotCourse.semester,
            creditos: newCourse.Creditos ?? DEFAULT_CREDITOS,
            TPS: newCourse.TPS ?? DEFAULT_TPS,
            TIS: newCourse.TIS ?? DEFAULT_TIS,
            courseType: type
        };

        courses[newCourse.Codigo] = courseData;
        addedCourses.set(newCourse.Codigo, courseData.semester);
        occupiedCourseCodes.add(newCourse.Codigo);

        if (type === 'electiva') {
            occupiedElectivasCodes.add(newCourse.Codigo);
        } else {
            occupiedOptativasCodes.add(newCourse.Codigo);
        }

        localStorage.setItem(`selected-${slotCode}-code`, newCourseCode);
        localStorage.setItem(`course-${newCourse.Codigo}`, "false");

        renderSemesters();
    }
}

function openCourseSelectorModal(type, slotCode, targetDiv) {
    if (currentSelector) {
        currentSelector.remove();
        currentSelector = null;
    }

    const catalogue = type === 'electiva' ? electivas : optativas;
    const occupiedSet = type === 'electiva' ? occupiedElectivasCodes : occupiedOptativasCodes;

    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'course-selector-dropdown';
    selectorContainer.style.position = 'absolute';
    selectorContainer.style.zIndex = '100';
    selectorContainer.style.width = '300px';
    selectorContainer.style.backgroundColor = 'white';
    selectorContainer.style.border = '1px solid #ccc';
    selectorContainer.style.borderRadius = '4px';
    selectorContainer.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    selectorContainer.style.maxHeight = '300px';
    selectorContainer.style.overflowY = 'auto';
    selectorContainer.style.top = '100%';
    selectorContainer.style.left = '0';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Buscar curso...';
    searchInput.style.padding = '8px';
    searchInput.style.width = '90%';
    searchInput.style.margin = '5px 5%';
    searchInput.style.border = '1px solid #ddd';
    selectorContainer.appendChild(searchInput);

    const listContainer = document.createElement('div');
    listContainer.className = 'course-selector-list';
    selectorContainer.appendChild(listContainer);

    const renderList = (filter = '') => {
        listContainer.innerHTML = '';
        const normalizedFilter = filter.toLowerCase();

        const deselectItem = document.createElement('div');
        deselectItem.className = 'selector-item deselect-item';
        deselectItem.textContent = 'Seleccione un curso... / Deseleccionar';
        deselectItem.style.padding = '8px';
        deselectItem.style.cursor = 'pointer';
        deselectItem.style.fontWeight = 'bold';
        deselectItem.style.backgroundColor = '#e0f2fe';
        deselectItem.onclick = () => {
            handleCourseSelectionInCard(type, slotCode, null);
            selectorContainer.remove();
            currentSelector = null;
        };
        listContainer.appendChild(deselectItem);

        const filteredList = catalogue.filter(c => {
            const courseCode = c.Codigo;
            const isOccupied = occupiedSet.has(courseCode);
            const matchesFilter = c.Asignatura.toLowerCase().includes(normalizedFilter) ||
                courseCode.toLowerCase().includes(normalizedFilter);

            return !isOccupied && matchesFilter;
        });

        filteredList.forEach(course => {
            const item = document.createElement('div');
            item.className = 'selector-item';
            item.textContent = `${course.Asignatura} (${course.Codigo})`;

            item.style.padding = '8px';
            item.style.cursor = 'pointer';
            item.style.borderBottom = '1px solid #eee';
            item.onmouseover = () => item.style.backgroundColor = '#f4f4f4';
            item.onmouseout = () => item.style.backgroundColor = 'white';

            item.onclick = () => {
                handleCourseSelectionInCard(type, slotCode, course.Codigo);
                selectorContainer.remove();
                currentSelector = null;
            };
            listContainer.appendChild(item);
        });

        if (filteredList.length === 0 && filter) {
            const noResults = document.createElement('div');
            noResults.textContent = 'No se encontraron resultados.';
            noResults.style.padding = '8px';
            listContainer.appendChild(noResults);
        }
    };

    searchInput.oninput = (e) => {
        renderList(e.target.value);
    };

    targetDiv.style.position = 'relative';
    targetDiv.appendChild(selectorContainer);
    currentSelector = selectorContainer;

    renderList();
    searchInput.focus();

    document.addEventListener('click', function closeSelector(e) {
        if (currentSelector && !targetDiv.contains(e.target) && !currentSelector.contains(e.target)) {
            currentSelector.remove();
            currentSelector = null;
            document.removeEventListener('click', closeSelector);
        }
    });
}

// =========================================================================
// RENDERIZADO (CON BOTÓN ESPECÍFICO PARA CAMBIAR)
// =========================================================================

function renderSemesters() {
    const grid = document.getElementById('semester-grid');
    grid.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
        const semester = document.createElement('div');
        semester.className = 'semester';
        semester.setAttribute('data-semester', i);
        semester.innerHTML = `<h3>Semestre ${i}</h3><div id="courses-semester-${i}"></div>`;
        grid.appendChild(semester);
    }

    const propedeutic = document.createElement('div');
    propedeutic.className = 'semester mt-10';
    propedeutic.setAttribute('data-semester', 11);
    propedeutic.style.gridColumn = "1 / -1";
    propedeutic.innerHTML = `<h3 class="text-center mb-4 text-lg font-semibold">Asignaturas Propedéuticas</h3>
        <div id="courses-semester-11" class="flex flex-wrap justify-center gap-4 mt-4"></div>`;
    grid.appendChild(propedeutic);

    const semesterCoursesMap = new Map();
    addedCourses.forEach((semester, code) => {
        const course = courses[code];
        if (!course) return;
        if (!semesterCoursesMap.has(semester)) semesterCoursesMap.set(semester, []);
        semesterCoursesMap.get(semester).push(course);
    });

    const colorOrder = ["course-green", "course-blue", "course-purple", "course-red"];

    semesterCoursesMap.forEach((courseList, semester) => {
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
            // ✅ NUEVO: Hacer position relative para posicionar el botón
            courseDiv.style.position = 'relative';

            const wasCompletedInStorage = localStorage.getItem(`course-${course.code}`) === "true";
            if (wasCompletedInStorage) courseDiv.classList.add("completed");
            if (course.prerequisite && !isCompletedByName(course.prerequisite)) courseDiv.classList.add("disabled");

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

            const isPlaceholder = course.name.toLowerCase().includes('electiva') || course.name.toLowerCase().includes('optativa');
            const isSelectedCourse = Object.keys(localStorage).some(key => key.startsWith('selected-') && localStorage.getItem(key) === course.code);

            // ✅ CAMBIO PRINCIPAL: Sistema con botón específico para cambiar
            if (isPlaceholder || isSelectedCourse) {
                courseDiv.classList.add('course-selector');
                courseDiv.classList.remove("disabled");

                let uniqueSlotCode;
                let type;

                if (isPlaceholder) {
                    uniqueSlotCode = course.code;
                    type = course.courseType || (course.name.toLowerCase().includes('electiva') ? 'electiva' : 'optativa');
                } else {
                    const selectionKey = Object.keys(localStorage).find(
                        key => key.startsWith('selected-') && localStorage.getItem(key) === course.code
                    );
                    uniqueSlotCode = selectionKey ?
                        selectionKey.replace('selected-', '').replace('-code', '') :
                        course.code;

                    type = course.courseType || 'electiva';
                }

                // ✅ NUEVO: Crear botón de cambio en la esquina superior derecha
                const changeButton = document.createElement('button');
                changeButton.className = 'change-course-button';
                changeButton.innerHTML = '✏️';
                changeButton.title = isPlaceholder ? 'Seleccionar curso' : 'Cambiar selección';
                changeButton.style.cssText = `
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.95);
                    border: 2px solid #3b82f6;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                `;

                // Efectos hover para el botón
                changeButton.addEventListener('mouseenter', () => {
                    changeButton.style.transform = 'scale(1.1)';
                    changeButton.style.borderColor = '#2563eb';
                    changeButton.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                });

                changeButton.addEventListener('mouseleave', () => {
                    changeButton.style.transform = 'scale(1)';
                    changeButton.style.borderColor = '#3b82f6';
                    changeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                });

                // ✅ Evento del botón: abre el selector
                changeButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevenir que dispare el clic del curso
                    openCourseSelectorModal(type, uniqueSlotCode, courseDiv);
                });

                courseDiv.appendChild(changeButton);

                // ✅ SIMPLIFICADO: Clic en el curso solo marca como completada (NO abre selector)
                if (!isPlaceholder) {
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
                } else {
                    // Si es placeholder, el clic también puede abrir el selector (opcional)
                    courseDiv.addEventListener("click", () => {
                        openCourseSelectorModal(type, uniqueSlotCode, courseDiv);
                    });
                }

                // Actualizar texto del placeholder
                if (isPlaceholder) {
                    courseDiv.querySelector('.course-title').textContent =
                        (course.name || course.code) + " (Clic para seleccionar)";
                    localStorage.setItem(`course-${course.code}`, "false");
                    courseDiv.classList.remove("completed");
                }

            } else {
                // Cursos normales: clic simple marca como completada
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
            }

            container.appendChild(courseDiv);

            if (wasCompletedInStorage) {
                const borderColor = window.getComputedStyle(courseDiv).borderLeftColor;
                courseDiv.style.setProperty("--check-color", borderColor);
            }
        });
    });

    Object.values(courses).forEach(c => updateDependencies(c.code));
    computeSemesterSums();
}

// =========================================================================
// LÓGICA DE PRERREQUISITOS Y SUMAS
// =========================================================================

function isCompletedByName(prereqString) {
    if (!prereqString || prereqString.trim() === "") return true;

    const requiredPrereqs = prereqString.split(',').map(p => p.trim()).filter(p => p.length > 0);

    const allCompleted = requiredPrereqs.every(reqName => {
        const c = Object.values(courses).find(x =>
            x.name.toLowerCase() === reqName.toLowerCase() ||
            x.code.toLowerCase() === reqName.toLowerCase()
        );

        if (!c) {
            console.warn(`Prerrequisito no encontrado en la lista maestra: ${reqName}`);
            return false;
        }

        return localStorage.getItem(`course-${c.code}`) === "true";
    });

    return allCompleted;
}

function updateDependencies(code) {
    const completed = localStorage.getItem(`course-${code}`) === "true";
    const enablerDiv = document.querySelector(`[data-code="${code}"]`);
    const enablerColor = enablerDiv ? window.getComputedStyle(enablerDiv).borderLeftColor : "#86efac";

    const currentCourseName = courses[code]?.name || code;

    Object.values(courses).forEach(course => {
        const prereqList = (course.prerequisite || '').split(',').map(p => p.trim().toLowerCase());
        const dependsOnCurrent = prereqList.includes(currentCourseName.toLowerCase()) || prereqList.includes(code.toLowerCase());

        if (dependsOnCurrent) {
            const div = document.querySelector(`[data-code="${course.code}"]`);
            if (!div) return;

            const allPrereqsMet = isCompletedByName(course.prerequisite);
            const existingTag = div.querySelector(".enabler-tag");

            if (allPrereqsMet) {
                if (div.classList.contains("disabled")) {
                    div.classList.remove("disabled");
                    div.classList.add("available");
                    div.style.setProperty("--highlight-color", enablerColor);
                    setTimeout(() => div.classList.remove("available"), 1000);
                }
                if (!existingTag) {
                    const tag = document.createElement("div");
                    tag.className = "enabler-tag";
                    tag.textContent = code;
                    div.appendChild(tag);
                }
            } else {
                div.classList.add("disabled");
                if (div.classList.contains("completed")) div.classList.remove("completed");
                localStorage.setItem(`course-${course.code}`, "false");
                if (existingTag) existingTag.remove();
            }

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

        updateGlobalSemesterLock();
    }
}

function allLowerSemestersCompleted() {
    for (let i = 1; i <= 6; i++) {
        const cont = document.getElementById(`courses-semester-${i}`);
        if (!cont) continue;

        const coursesInSemester = cont.querySelectorAll(".course");
        for (let courseDiv of coursesInSemester) {
            if (!courseDiv.classList.contains("completed") &&
                !courseDiv.querySelector(".course-title").textContent.toLowerCase().includes("electiva") &&
                !courseDiv.querySelector(".course-title").textContent.toLowerCase().includes("optativa")) {
                return false;
            }
        }
    }
    return true;
}

function updateGlobalSemesterLock() {
    const allLowerDone = allLowerSemestersCompleted();

    for (let i = 7; i <= 10; i++) {
        const cont = document.getElementById(`courses-semester-${i}`);
        if (!cont) continue;

        const coursesInSemester = cont.querySelectorAll(".course");

        coursesInSemester.forEach(courseDiv => {
            if (allLowerDone) {
                courseDiv.classList.remove("disabled");
            } else {
                if (!courseDiv.classList.contains("completed")) {
                    courseDiv.classList.add("disabled");
                }
            }
        });
    }
}