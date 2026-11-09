let courses = {};
const addedCourses = new Map();
const API_BASE_URL = 'http://localhost:49513'; // Asegúrate de que este puerto sea el correcto
let selectedMalla = null;
let isExportingPdf = false;
let selectedMallaRequestId = 0;

function mapCourseFromApi(course) {
    const prerequisiteCodes = Array.isArray(course.Prerequisitos)
        ? course.Prerequisitos.map(p => p.Codigo).filter(Boolean)
        : (course.Prerequisito || '').split(',').map(code => code.trim()).filter(Boolean);

    return {
        code: course.Codigo,
        name: course.Asignatura,
        prerequisiteCodes,
        color: course.Color,
        credits: Number(course.Creditos) || 0,
        tps: Number(course.TPS) || 0,
        tis: Number(course.TIS) || 0,
        type: course.Tipo
    };
}

// --- Funciones de Autenticación (Sin Cambios) ---
function showMallaSection() {
    document.getElementById('malla-section').classList.remove('hidden');
}


// ----------------------------------------------------------------------
// --- Funciones del Buscador en Tiempo Real ---

/**
 * Genera el HTML para el custom select con buscador.
 * @param {number|string} semester - El número de semestre o 'P'.
 */
function createCustomSelect(semester) {
    let availableCourses = Object.values(courses).filter(c => !addedCourses.has(c.code));

    // Ordenar alfabéticamente por nombre
    availableCourses.sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    const optionsHtml = availableCourses
        .map(c => `<div class="custom-option p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap" data-value="${c.code}" onclick="selectCustomOption(this, '${semester}', '${c.code}')">${c.name} (${c.code})</div>`)
        .join('');

    return `
        <div class="custom-select-container relative mb-4">
            <button type="button" class="custom-select-button course-select p-2 border border-gray-300 rounded-md w-full text-left bg-white text-gray-500 hover:text-gray-700" onclick="toggleCustomDropdown(this)">
                Seleccione un curso...
            </button>
            <div class="custom-dropdown absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto hidden">
                <input type="text" class="custom-search-input p-2 border-b border-gray-300 w-full sticky top-0" placeholder="Buscar curso..." onkeyup="filterCustomOptions(this)">
                <div class="custom-options-list">
                    ${optionsHtml || '<div class="p-2 text-gray-500">No hay cursos disponibles.</div>'}
                </div>
            </div>
        </div>
    `;
}

function toggleCustomDropdown(button) {
    // Cierra todos los otros dropdowns abiertos
    document.querySelectorAll('.custom-dropdown').forEach(d => {
        if (d !== button.nextElementSibling) {
            d.classList.add('hidden');
        }
    });

    const dropdown = button.nextElementSibling;
    dropdown.classList.toggle('hidden');

    if (!dropdown.classList.contains('hidden')) {
        const searchInput = dropdown.querySelector('.custom-search-input');
        searchInput.value = '';
        searchInput.focus();
        dropdown.querySelectorAll('.custom-option').forEach(option => option.style.display = 'block');
    }
}

function filterCustomOptions(input) {
    const filter = input.value.toUpperCase();
    const optionsList = input.nextElementSibling;
    const options = optionsList.querySelectorAll('.custom-option');

    options.forEach(option => {
        const text = option.textContent || option.innerText;
        option.style.display = text.toUpperCase().includes(filter) ? 'block' : 'none';
    });
}

function selectCustomOption(optionDiv, semester, courseCode) {
    const button = optionDiv.closest('.custom-select-container').querySelector('.custom-select-button');
    const dropdown = optionDiv.closest('.custom-dropdown');

    addCourseLogic(courseCode, semester);

    dropdown.classList.add('hidden');
    button.textContent = 'Seleccione un curso...';
}

function addCourseLogic(courseCode, semester) {
    if (!courseCode || addedCourses.has(courseCode)) return;

    const course = courses[courseCode];
    if (!course) {
        console.error(`Curso no encontrado: ${courseCode}`);
        return;
    }

    const prereqCodes = course.prerequisiteCodes || [];
    const missingPrereqs = prereqCodes.filter(prCode => !addedCourses.has(prCode));

    if (missingPrereqs.length > 0) {
        const missingPrereqNames = missingPrereqs.map(code => courses[code] ? courses[code].name : code);
        alert(`No puedes agregar "${course.name}" porque debes agregar primero:\n• ${missingPrereqNames.join("\n• ")}`);
        return;
    }

    addedCourses.set(courseCode, semester);
    renderSemesters();
}


// ----------------------------------------------------------------------
// --- Funciones de la Malla Curricular ---

async function fetchCourses() {
    const errorMessage = document.getElementById('error-message');
    const mallaSelect = document.getElementById('malla-select');
    const requestId = selectedMallaRequestId;
    const hasSelectedMalla = Boolean(selectedMalla || (mallaSelect && mallaSelect.value));
    errorMessage.style.display = 'none';
    const grid = document.getElementById('semester-grid');
    if (!hasSelectedMalla) grid.innerHTML = '<p class="text-center">Cargando cursos...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/cursos/todos`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (requestId !== selectedMallaRequestId) return;
        if (!hasSelectedMalla) courses = {};
        data.forEach(course => {
            const mappedCourse = mapCourseFromApi(course);
            courses[mappedCourse.code] = mappedCourse;
        });


        const prereqSelect = document.getElementById('new-prerequisite');
        prereqSelect.innerHTML = `<option value="">Ninguno</option>`;
        Object.values(courses).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = `${c.name} (${c.code})`;
            prereqSelect.appendChild(opt);
        });

        // También actualizamos el select de modificación
        if (document.getElementById('update-prerequisite')) {
            const updatePrereqSelect = document.getElementById('update-prerequisite');
            updatePrereqSelect.innerHTML = `<option value="">Ninguno</option>`;
            Object.values(courses).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.name} (${c.code})`;
                updatePrereqSelect.appendChild(opt);
            });
        }


        if (!hasSelectedMalla) renderSemesters();
    } catch (error) {
        console.error('Error al cargar los cursos:', error);
        errorMessage.textContent = `No se pudieron cargar los cursos: ${error.message}.`;
        errorMessage.style.display = 'block';
        grid.innerHTML = '<p class="text-center text-red-600">Error al cargar la malla.</p>';
    }
}

async function fetchMallas() {
    const mallaSelect = document.getElementById('malla-select');
    if (!mallaSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/mallas`, {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const mallas = await response.json();
        mallaSelect.innerHTML = '<option value="">Seleccione una malla</option>';
        mallas.forEach(malla => {
            const option = document.createElement('option');
            option.value = malla.Id;
            option.textContent = malla.Nombre || `Malla ${malla.Id}`;
            option.dataset.createdAt = malla.CreatedAt || '';
            mallaSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar las mallas:', error);
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = 'No se pudieron cargar las mallas disponibles para exportar.';
            errorMessage.style.display = 'block';
        }
    }
}

async function loadSelectedMalla(mallaId) {
    const errorMessage = document.getElementById('error-message');
    const grid = document.getElementById('semester-grid');
    const mallaSelect = document.getElementById('malla-select');

    const requestId = ++selectedMallaRequestId;
    if (errorMessage) errorMessage.style.display = 'none';
    selectedMalla = null;
    addedCourses.clear();

    if (!mallaId) {
        renderSemesters();
        return;
    }

    grid.innerHTML = '<p class="text-center">Cargando malla seleccionada...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/cursos?mallaId=${encodeURIComponent(mallaId)}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const data = await response.json();
        if (requestId !== selectedMallaRequestId) return;
        const selectedOption = mallaSelect.options[mallaSelect.selectedIndex];
        selectedMalla = {
            id: Number(mallaId),
            name: selectedOption ? selectedOption.textContent : `Malla ${mallaId}`,
            createdAt: selectedOption ? selectedOption.dataset.createdAt : ''
        };

        data.forEach(course => {
            const mappedCourse = mapCourseFromApi(course);
            courses[mappedCourse.code] = mappedCourse;
            addedCourses.set(mappedCourse.code, String(course.Semestre || 'P') === '11' ? 'P' : course.Semestre);
        });
        renderSemesters();
    } catch (error) {
        if (requestId !== selectedMallaRequestId) return;
        console.error('Error al cargar la malla seleccionada:', error);
        if (errorMessage) {
            errorMessage.textContent = `No se pudo cargar la malla seleccionada: ${error.message}.`;
            errorMessage.style.display = 'block';
        }
        grid.innerHTML = '<p class="text-center text-red-600">Error al cargar la malla.</p>';
    }
}

function addCourse(select, semester) {
    const courseCode = select.value;
    if (!courseCode) return;

    addCourseLogic(courseCode, semester);
}


function renderSemesters() {
    const grid = document.getElementById('semester-grid');
    grid.innerHTML = '';
    const isJefeMallaView = document.body.classList.contains('jefe-page') && selectedMalla;
    grid.classList.toggle('jefe-malla-view', Boolean(isJefeMallaView));

    // Generar los 10 semestres normales
    for (let i = 1; i <= 10; i++) {
        const semester = document.createElement('div');
        semester.className = 'semester';
        semester.setAttribute('data-semester', i);
        semester.innerHTML = `
        <h3>Semestre ${i}</h3>
        ${isJefeMallaView ? '' : createCustomSelect(i)}
        <div id="courses-semester-${i}"></div>
        `;
        grid.appendChild(semester);
    }

    // Agregar bloque de Materias Propedéuticas (en horizontal)
    const propedeutic = document.createElement('div');
    propedeutic.className = 'semester mt-10';
    propedeutic.setAttribute('data-semester', 'P');
    propedeutic.style.gridColumn = "1 / -1";
    propedeutic.innerHTML = `
        <h3 class="text-center mb-4 text-lg font-semibold">Materias Propedéuticas</h3>
        ${isJefeMallaView ? '' : `<div class="mx-auto" style="max-width: 600px;">${createCustomSelect('P')}</div>`}
        <div id="courses-semester-P"
            class="flex flex-wrap justify-center gap-4 mt-4">
        </div>
    `;
    grid.appendChild(propedeutic);

    addedCourses.forEach((semester, courseCode) => {
        const course = courses[courseCode];
        if (course) {
            const courseList = document.getElementById(`courses-semester-${semester}`);
            if (!courseList) return;

            const courseDiv = document.createElement('div');
            courseDiv.className = `course ${course.color} ${isJefeMallaView ? 'jefe-course-card' : 'p-3 rounded-lg shadow text-center'}`;
            courseDiv.setAttribute('data-code', courseCode);
            courseDiv.setAttribute('data-semester', semester);

            const prereqsHtml = course.prerequisiteCodes && course.prerequisiteCodes.length > 0
                ? `<div class="text-xs mt-1 text-gray-500">Req: ${course.prerequisiteCodes.join(', ')}</div>`
                : '';

            if (isJefeMallaView) {
                const prerequisiteTag = course.prerequisiteCodes && course.prerequisiteCodes.length
                    ? `<span class="enabler-tag">${course.prerequisiteCodes[0]}</span>` : '';
                const semesterNumber = semester === 'P' ? 11 : semester;
                courseDiv.setAttribute('role', 'button');
                courseDiv.setAttribute('tabindex', '0');
                courseDiv.setAttribute('aria-label', `Abrir microdiseño de ${course.name}`);
                courseDiv.innerHTML = `
                    ${prerequisiteTag}
                    <div class="course-title">${course.name}</div>
                    <div class="course-code">${course.code}</div>
                    <div class="credit-grid">
                        <div class="credit-cell"><span>${course.tps}</span><span>${course.tps * 16}</span></div>
                        <div class="credit-cell"><span>${course.tis}</span><span>${course.tis * 16}</span></div>
                        <div class="credit-total">${course.credits}</div>
                    </div>`;
                const openMicrodiseno = () => {
                    const params = new URLSearchParams({
                        cursoCode: course.code,
                        cursoCodigo: course.code,
                        semestre: '2026-I',
                        semestreMalla: String(semesterNumber)
                    });
                    window.location.href = `Microdiseno.html?${params.toString()}`;
                };
                courseDiv.addEventListener('click', openMicrodiseno);
                courseDiv.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openMicrodiseno();
                    }
                });
                courseList.appendChild(courseDiv);
                return;
            }

            const userRole = parseInt(localStorage.getItem('userRole'));
            let microdisenoLink = '';
            if(userRole) {
                let targetPage = 'Microdiseno.html';
                const finalCode = course.code || course.Codigo || courseCode || "";
                let urlParams = `?cursoCode=${encodeURIComponent(finalCode)}&cursoCodigo=${encodeURIComponent(finalCode)}&semestre=2026-I`;
                
                if(userRole === 1 || userRole === 2) {
                    targetPage = 'Microdiseno.html';
                } else if(userRole === 3) {
                    targetPage = 'Microdiseno.html';
                    urlParams = `?cursoCode=${encodeURIComponent(finalCode)}&cursoCodigo=${encodeURIComponent(finalCode)}`;
                }

                microdisenoLink = `<div class="mt-2 pt-2 border-t border-black/10">
                    <a href="${targetPage}${urlParams}" 
                       class="text-[10px] bg-white/20 hover:bg-white/40 px-2 py-0.5 rounded font-bold uppercase tracking-tighter transition-colors">
                       Microdiseño
                    </a>
                </div>`;
            }

            courseDiv.innerHTML = `
                <div>
                    <div class="course-title font-semibold">${course.name}</div>
                    <div class="course-code text-sm text-gray-600">${course.code}</div>
                    ${prereqsHtml}
                    <div class="text-xs mt-1 text-gray-600">
                        <span class="tps">TPS: ${course.tps || 0}</span> |
                        <span class="tis">TIS: ${course.tis || 0}</span> |
                        <span class="creditos">Créditos: ${course.credits || 0}</span>
                    </div>
                    ${microdisenoLink}
                </div>
                <button class="remove-btn mt-2 bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded" onclick="removeCourse(this, '${courseCode}')">Remover</button>
            `;

            courseList.appendChild(courseDiv);
        }
    });

    if (typeof applyFilters === 'function') {
        applyFilters();
    }
    computeSemesterSums();
}


function removeCourse(button, courseCode) {
    addedCourses.delete(courseCode);
    renderSemesters();
}

async function createCourse() {
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    const code = document.getElementById('new-code').value.trim();
    const name = document.getElementById('new-name').value.trim();
    const prerequisiteCode = document.getElementById('new-prerequisite').value;
    const color = document.getElementById('new-color').value;
    const tps = parseInt(document.getElementById('new-tps').value);
    const tis = parseInt(document.getElementById('new-tis').value);
    const tipo = document.getElementById('new-type').value;
    const creditos = parseInt(document.getElementById('new-credits').value);

    if (!code || !name || !color || !tipo || isNaN(tps) || isNaN(tis) || isNaN(creditos)) {
        errorMessage.textContent = 'Por favor, completa todos los campos obligatorios.';
        errorMessage.style.display = 'block';
        return;
    }

    const payload = {
        Codigo: code,
        Asignatura: name,
        Color: color,
        TPS: tps,
        TIS: tis,
        Tipo: tipo,
        Creditos: creditos,
        PrerequisitoCodigos: prerequisiteCode ? [prerequisiteCode] : []
    };


    try {
        const response = await fetch(`${API_BASE_URL}/api/cursos/crear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorText = `Error HTTP: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData?.message) errorText = errorData.message;
            } catch { }
            throw new Error(errorText);
        }

        document.getElementById('new-code').value = '';
        document.getElementById('new-name').value = '';
        document.getElementById('new-prerequisite').value = '';
        document.getElementById('new-color').value = 'course-green';
        document.getElementById('new-tps').value = '';
        document.getElementById('new-tis').value = '';
        document.getElementById('new-type').value = 'Teorica';
        document.getElementById('new-credits').value = '';

        successMessage.textContent = 'Asignatura creada exitosamente.';
        successMessage.style.display = 'block';
        setTimeout(() => successMessage.style.display = 'none', 3000);

        await fetchCourses();
    } catch (error) {
        console.error('Error al crear el curso:', error);
        errorMessage.textContent = `Error al crear el curso: ${error.message}`;
        errorMessage.style.display = 'block';
    }
}


// --- Funciones sin cambios significativos ---

function applyFilters() {
    const semesterFilter = document.getElementById('semester-filter')?.value;
    const showPrerequisites = document.getElementById('show-prerequisites')?.checked;

    document.querySelectorAll('.semester').forEach(semester => {
        const semesterNum = semester.getAttribute('data-semester');
        semester.style.display = (semesterFilter === 'all' || semesterFilter === semesterNum) ? 'block' : 'none';
    });

    document.querySelectorAll('.course-prerequisite').forEach(prereq => {
        prereq.style.display = showPrerequisites ? 'block' : 'none';
    });
}

function logout() {
    // 1. Limpiar datos de sesión (si los hay)
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');

    // 2. Redireccionar a plana.html
    window.location.href = 'login.html';
}

async function exportToPDF() {
    const errorMsg = document.getElementById('error-message');
    const exportBtn = document.querySelector('.export-btn');
    if (errorMsg) errorMsg.style.display = 'none';

    if (isExportingPdf) return;
    if (!selectedMalla) {
        if (errorMsg) {
            errorMsg.textContent = 'Seleccione una malla curricular antes de exportarla.';
            errorMsg.style.display = 'block';
        }
        return;
    }
    if (!addedCourses.size) {
        if (errorMsg) {
            errorMsg.textContent = 'La malla seleccionada no tiene asignaturas para exportar.';
            errorMsg.style.display = 'block';
        }
        return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        if (errorMsg) {
            errorMsg.textContent = 'No fue posible cargar la biblioteca para generar el PDF. Intente nuevamente.';
            errorMsg.style.display = 'block';
        }
        return;
    }

    isExportingPdf = true;
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.textContent = 'Generando PDF...';
    }

    try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 7.5;
        const columnGap = 2.5;
        const semesters = [...Array(10).keys()].map(index => index + 1);
        const semesterCourses = new Map(semesters.map(semester => [semester, []]));
        const propedeuticCourses = [];
        const colorMap = {
            'course-green': [16, 185, 129], 'course-blue': [59, 130, 246],
            'course-purple': [139, 92, 246], 'course-red': [239, 68, 68]
        };
        Array.from(addedCourses).forEach(([code, assignedSemester]) => {
            const course = courses[code];
            if (!course) return;
            if (String(assignedSemester) === 'P') propedeuticCourses.push(course);
            else if (semesterCourses.has(Number(assignedSemester))) semesterCourses.get(Number(assignedSemester)).push(course);
        });
        semesterCourses.forEach(coursesBySemester => coursesBySemester.sort((a, b) => (a.code || '').localeCompare(b.code || '')));
        propedeuticCourses.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

        const maxRows = Math.max(...Array.from(semesterCourses.values()).map(items => items.length), 1);
        if (maxRows > 11 || propedeuticCourses.length > 10) {
            throw new Error('La malla tiene demasiadas asignaturas para conservar una presentación legible en una sola hoja.');
        }

        const columnWidth = (pageWidth - margin * 2 - columnGap * 9) / 10;
        const courseGridY = 36;
        const courseGridHeight = 114;
        const cardGap = 2;
        const cardHeight = Math.max(8.5, Math.min(20, (courseGridHeight - cardGap * (maxRows - 1)) / maxRows));
        const cardFontSize = cardHeight < 12 ? 2.5 : cardHeight < 16 ? 2.9 : 3.3;

        const setCourseFill = (rgb) => doc.setFillColor(
            Math.round(rgb[0] + (255 - rgb[0]) * 0.55),
            Math.round(rgb[1] + (255 - rgb[1]) * 0.55),
            Math.round(rgb[2] + (255 - rgb[2]) * 0.55)
        );
        const drawCourseCard = (course, x, y, width, height) => {
            const rgb = colorMap[course.color] || [107, 114, 128];
            const headingHeight = height * 0.60;
            setCourseFill(rgb);
            doc.setDrawColor(31, 41, 55);
            doc.rect(x, y, width, headingHeight, 'FD');
            doc.setFillColor(255, 255, 255);
            doc.rect(x, y + headingHeight, width, height - headingHeight, 'FD');
            doc.line(x, y + headingHeight + (height - headingHeight) / 2, x + width, y + headingHeight + (height - headingHeight) / 2);
            doc.line(x + width / 3, y + headingHeight, x + width / 3, y + height);
            doc.line(x + (width * 2) / 3, y + headingHeight, x + (width * 2) / 3, y + height);

            doc.setTextColor(17, 24, 39);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(cardFontSize);
            const titleLines = doc.splitTextToSize(course.name || 'Sin nombre', width - 1.4).slice(0, 3);
            doc.text(titleLines, x + width / 2, y + Math.min(4, headingHeight * 0.38), { align: 'center', baseline: 'middle' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(Math.max(2.1, cardFontSize - 0.5));
            doc.text(String(course.code || 'N/D'), x + width / 2, y + headingHeight - 1.2, { align: 'center' });

            const firstRowY = y + headingHeight + (height - headingHeight) * 0.30;
            const secondRowY = y + headingHeight + (height - headingHeight) * 0.80;
            doc.setFontSize(Math.max(2.2, cardFontSize - 0.3));
            doc.text(String(course.tps), x + width / 6, firstRowY, { align: 'center' });
            doc.text(String(course.tis), x + width / 2, firstRowY, { align: 'center' });
            doc.text(String(course.credits), x + (width * 5) / 6, firstRowY, { align: 'center' });
            doc.text(String(course.tps * 16), x + width / 6, secondRowY, { align: 'center' });
            doc.text(String(course.tis * 16), x + width / 2, secondRowY, { align: 'center' });
            const prerequisiteMark = course.prerequisiteCodes && course.prerequisiteCodes.length ? 'R' : '-';
            doc.text(prerequisiteMark, x + (width * 5) / 6, secondRowY, { align: 'center' });
        };
        const semesterTotals = (items) => items.reduce((totals, course) => ({
            tps: totals.tps + course.tps,
            tis: totals.tis + course.tis,
            credits: totals.credits + course.credits
        }), { tps: 0, tis: 0, credits: 0 });
        const drawSummary = (totals, x, y, width) => {
            const height = 8;
            doc.setFillColor(226, 232, 240);
            doc.setDrawColor(31, 41, 55);
            doc.rect(x, y, width, height, 'FD');
            doc.line(x, y + height / 2, x + width * 0.66, y + height / 2);
            doc.line(x + width / 3, y, x + width / 3, y + height);
            doc.line(x + width * 0.66, y, x + width * 0.66, y + height);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(17, 24, 39);
            doc.setFontSize(2.8);
            doc.text(String(totals.tps), x + width / 6, y + 2.7, { align: 'center' });
            doc.text(String(totals.tis), x + width / 2, y + 2.7, { align: 'center' });
            doc.text(String(totals.tps * 16), x + width / 6, y + 6.6, { align: 'center' });
            doc.text(String(totals.tis * 16), x + width / 2, y + 6.6, { align: 'center' });
            doc.setFontSize(4.1);
            doc.text(String(totals.credits), x + width * 0.83, y + 4.9, { align: 'center' });
        };

        doc.setDrawColor(31, 41, 55);
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, 7, pageWidth - margin * 2, 10, 'S');
        doc.setFillColor(30, 64, 175);
        doc.rect(margin, 7, 27, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.text('ITM', margin + 13.5, 13, { align: 'center' });
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(5);
        doc.text('PLAN DE ESTUDIOS', pageWidth / 2, 13, { align: 'center' });
        doc.setFontSize(3);
        doc.text(`Malla #${selectedMalla.id} - ${selectedMalla.name}`, margin + 30, 20.5);
        doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-CO')}`, pageWidth - margin, 20.5, { align: 'right' });

        semesters.forEach((semester, index) => {
            const x = margin + index * (columnWidth + columnGap);
            const items = semesterCourses.get(semester);
            doc.setFillColor(219, 234, 254);
            doc.setDrawColor(31, 41, 55);
            doc.rect(x, 29, columnWidth, 4, 'FD');
            doc.setTextColor(17, 24, 39);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(2.8);
            doc.text(`Nivel ${semester}`, x + columnWidth / 2, 31.6, { align: 'center' });
            items.forEach((course, row) => drawCourseCard(course, x, courseGridY + row * (cardHeight + cardGap), columnWidth, cardHeight));
            drawSummary(semesterTotals(items), x, 154, columnWidth);
        });

        doc.setDrawColor(31, 41, 55);
        doc.line(margin, 168, pageWidth - margin, 168);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(3.2);
        doc.setTextColor(17, 24, 39);
        doc.text('Asignaturas Propedéuticas', pageWidth / 2, 171, { align: 'center' });
        const propCardWidth = Math.min(columnWidth * 1.8, (pageWidth - margin * 2 - Math.max(propedeuticCourses.length - 1, 0) * columnGap) / Math.max(propedeuticCourses.length, 1));
        const propTotalWidth = propedeuticCourses.length * propCardWidth + Math.max(propedeuticCourses.length - 1, 0) * columnGap;
        const propStartX = (pageWidth - propTotalWidth) / 2;
        propedeuticCourses.forEach((course, index) => drawCourseCard(course, propStartX + index * (propCardWidth + columnGap), 174, propCardWidth, 18));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(2.5);
        doc.text('Leyenda de la tabla: TPS Trabajo Presencial Semanal | TIS Trabajo Independiente Semanal | TPT TPS x 16 | TIT TIS x 16 | Créditos | R Tiene prerrequisito', margin, 202);
        doc.text('La distribución se ajusta automáticamente para una sola hoja tamaño carta horizontal.', pageWidth - margin, 202, { align: 'right' });

        const safeName = selectedMalla.name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'malla_curricular';
        doc.save(`${safeName}.pdf`);
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        if (errorMsg) {
            errorMsg.textContent = 'No se pudo generar el PDF. Intente nuevamente.';
            errorMsg.style.display = 'block';
        }
    } finally {
        isExportingPdf = false;
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Exportar Malla a PDF';
        }
    }
}


async function saveMalla() {
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    const nombreMalla = prompt("Ingrese un nombre para la malla:");
    if (!nombreMalla || nombreMalla.trim() === "") {
        alert("Debe ingresar un nombre para la malla.");
        return;
    }
    const Version = prompt("Ingrese version de la malla:");
    if (!Version || Version.trim() === "") {
        alert("Debe ingresar una version para la malla.");
        return;
    }
    const fechaCreacion = new Date().toISOString();


    const malla = {
        nombre: nombreMalla.trim(),
        Version: Version.trim(),
        fechaCreacion: fechaCreacion,
        courses: Array.from(addedCourses).map(([code, semester]) => ({
            Codigo: code,
            Semestre: semester === 'P' ? 11 : semester,
        }))

    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/mallas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(malla)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error HTTP: ${response.status} ${response.statusText}`);
        }
        await fetchMallas();
        const mallaSelect = document.getElementById('malla-select');
        if (mallaSelect && response.ok) {
            const result = await response.clone().json().catch(() => null);
            if (result && result.mallaId) {
                mallaSelect.value = String(result.mallaId);
                await loadSelectedMalla(result.mallaId);
            }
        }
        successMessage.textContent = 'Malla guardada exitosamente.';
        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error('Error al guardar la malla:', error);
        errorMessage.textContent = `Error al guardar la malla: ${error.message}.`;
        errorMessage.style.display = 'block';
    }
}

function computeSemesterSums() {
    for (let i = 1; i <= 10; i++) {
        computeForSemester(i);
    }
    computeForSemester('P');
}

function computeForSemester(semesterKey) {
    const cont = document.getElementById(`courses-semester-${semesterKey}`);
    if (!cont) return;

    const cursos = cont.querySelectorAll(".course");

    const prev = cont.querySelector(".semester-summary");
    if (prev) prev.remove();

    if (cursos.length) {
        let tps_total = 0, tis_total = 0, creditos_total = 0;

        cursos.forEach(c => {
            if (c.classList.contains("disabled")) return;

            const courseCode = c.getAttribute('data-code');
            const courseData = courses[courseCode];

            if (courseData) {
                tps_total += courseData.tps || 0;
                tis_total += courseData.tis || 0;
                creditos_total += courseData.credits || 0;
            }
        });

        const tps_hours = tps_total * 16;
        const tis_hours = tis_total * 16;
        const total_credits = creditos_total;

        const box = document.createElement("div");
        box.className = "semester-summary mt-2 text-center text-xs";

        box.innerHTML = `
            <div class="semester-summary-grid" aria-label="Totales del semestre">
                <div class="semester-summary-value">${tps_total}</div>
                <div class="semester-summary-value">${tis_total}</div>
                <div class="semester-summary-value">${tps_hours}</div>
                <div class="semester-summary-value">${tis_hours}</div>
                <div class="semester-summary-credits">${total_credits}</div>
            </div>
        `;
        cont.appendChild(box);
    }
}


// ----------------------------------------------------------------------
// --- FUNCIONES NUEVAS: Modificar Asignatura ---
// ----------------------------------------------------------------------

/**
 * Abre el modal de modificación de curso y lo inicializa.
 */
function openUpdateCourseModal() {
    const modal = document.getElementById('update-course-modal');
    modal.classList.remove('hidden');
    document.getElementById('update-error-message').style.display = 'none';

    // 1. Resetear formulario
    document.getElementById('update-course-form').reset();

    // 2. Poblar el select de cursos (solo los que existen)
    const courseSelect = document.getElementById('update-course-code');
    courseSelect.innerHTML = '<option value="">Selecciona un curso...</option>';

    // 3. Poblar el select de prerrequisitos (se refresca con fetchCourses, pero lo hacemos aquí también)
    const prereqSelect = document.getElementById('update-prerequisite');
    prereqSelect.innerHTML = `<option value="">Ninguno</option>`;

    Object.values(courses).forEach(c => {
        // Opción para seleccionar el curso a editar
        const courseOpt = document.createElement('option');
        courseOpt.value = c.code;
        courseOpt.textContent = `${c.name} (${c.code})`;
        courseSelect.appendChild(courseOpt);

        // Opción para el prerrequisito
        const prereqOpt = document.createElement('option');
        prereqOpt.value = c.code;
        prereqOpt.textContent = `${c.name} (${c.code})`;
        prereqSelect.appendChild(prereqOpt);
    });
}

/**
 * Cierra el modal de modificación de curso.
 */
function closeUpdateCourseModal() {
    document.getElementById('update-course-modal').classList.add('hidden');
}

/**
 * Rellena el formulario de actualización con los datos del curso seleccionado.
 * @param {string} courseCode - El código del curso seleccionado.
 */
function fillUpdateForm(courseCode) {
    document.getElementById('update-error-message').style.display = 'none';

    if (!courseCode || !courses[courseCode]) {
        document.getElementById('update-course-form').reset();
        return;
    }

    const course = courses[courseCode];

    // Rellenar los campos
    const nameEl = document.getElementById('update-name');
    if (nameEl) nameEl.value = course.name;
    
    const colorEl = document.getElementById('update-color');
    if (colorEl) colorEl.value = course.color;
    
    const tpsEl = document.getElementById('update-tps');
    if (tpsEl) tpsEl.value = course.tps;
    
    const tisEl = document.getElementById('update-tis');
    if (tisEl) tisEl.value = course.tis;
    
    const typeEl = document.getElementById('update-type');
    if (typeEl) typeEl.value = course.type || 'Teorica';
    
    const creditsEl = document.getElementById('update-credits');
    if (creditsEl) creditsEl.value = course.credits;

    // Rellenar prerrequisito
    const prereqCode = (course.prerequisiteCodes && course.prerequisiteCodes.length > 0) ? course.prerequisiteCodes[0] : '';
    const prereqEl = document.getElementById('update-prerequisite');
    if (prereqEl) prereqEl.value = prereqCode;
}

/**
 * Maneja la lógica de actualización del curso enviando los datos a la API.
 * @param {Event} event - El evento de envío del formulario.
 */
async function handleUpdateCourse(event) {
    event.preventDefault();

    const errorMessage = document.getElementById('update-error-message');
    errorMessage.style.display = 'none';

    const courseCode = document.getElementById('update-course-code').value;
    const name = document.getElementById('update-name').value.trim();
    const prerequisiteCode = document.getElementById('update-prerequisite').value;
    const color = document.getElementById('update-color').value;
    const tps = parseInt(document.getElementById('update-tps').value);
    const tis = parseInt(document.getElementById('update-tis').value);
    const tipo = document.getElementById('update-type').value;
    const creditos = parseInt(document.getElementById('update-credits').value);

    if (!courseCode) {
        errorMessage.textContent = 'Por favor, selecciona la asignatura a modificar.';
        errorMessage.style.display = 'block';
        return;
    }

    if (!name || !color || !tipo || isNaN(tps) || isNaN(tis) || isNaN(creditos)) {
        errorMessage.textContent = 'Por favor, completa todos los campos obligatorios del formulario.';
        errorMessage.style.display = 'block';
        return;
    }

    const payload = {
        Asignatura: name,
        Color: color,
        TPS: tps,
        TIS: tis,
        Tipo: tipo,
        Creditos: creditos,
        PrerequisitoCodigos: prerequisiteCode ? [prerequisiteCode] : []
    };

    try {
        // ✅ CORRECCIÓN: Agregar el 'courseCode' a la URL para que la ruta sea válida
        const response = await fetch(`${API_BASE_URL}/api/cursos/actualizar/${courseCode}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload) // Ahora el payload solo contiene los campos a actualizar
        });

        if (!response.ok) {
            let errorText = `Error HTTP: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData?.message) errorText = errorData.message;
            } catch { }
            throw new Error(errorText);
        }

        alert('Asignatura modificada exitosamente.');
        closeUpdateCourseModal();
        await fetchCourses(); // Recargar todos los cursos para actualizar la malla
    } catch (error) {
        console.error('Error al modificar el curso:', error);
        errorMessage.textContent = `Error al modificar el curso: ${error.message}`;
        errorMessage.style.display = 'block';
    }
}

async function deleteCourse() {
    const errorMessage = document.getElementById('update-error-message');
    errorMessage.style.display = 'none';

    const courseCode = document.getElementById('update-course-code').value;

    if (!courseCode) {
        errorMessage.textContent = 'Por favor, selecciona la asignatura a eliminar.';
        errorMessage.style.display = 'block';
        return;
    }

    // 1. Confirmación de seguridad
    if (!confirm(`¿Estás seguro de que quieres eliminar la asignatura con código ${courseCode}?\nEsta acción es irreversible y afectará las mallas que la contengan.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/cursos/eliminar/${courseCode}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            let errorText = `Error HTTP: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData?.message) errorText = errorData.message;
            } catch {
                if (response.status === 400 || response.status === 500) {
                    errorText = await response.text(); // Intentar leer el cuerpo como texto si no es JSON
                }
            }
            throw new Error(errorText);
        }

        // Si la eliminación fue exitosa
        alert(`Asignatura ${courseCode} eliminada exitosamente.`);
        closeUpdateCourseModal();

        // 2. Limpiar el progreso si el curso eliminado estaba en la malla actual
        addedCourses.delete(courseCode);

        // 3. Recargar la lista de cursos global y el renderizado
        await fetchCourses();

    } catch (error) {
        console.error('Error al eliminar el curso:', error);
        errorMessage.textContent = `Error al eliminar el curso: ${error.message}`;
        errorMessage.style.display = 'block';
    }
}
// --- Inicialización (Limpia sin Login) ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Forzar visibilidad de la malla (quita el 'hidden' de Tailwind)
    const mallaSection = document.getElementById('malla-section');
    if (mallaSection) {
        mallaSection.classList.remove('hidden');
    }

    // 2. Listener para actualizar cursos (si el formulario existe)
    const updateForm = document.getElementById('update-course-form');
    if (updateForm) {
        updateForm.addEventListener('submit', handleUpdateCourse);
    }

    // 3. Cargar datos de la API inmediatamente
    fetchCourses();
    fetchMallas();

    // 4. Lógica para cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.custom-select-container')) {
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                d.classList.add('hidden');
            });
        }
    });
});
