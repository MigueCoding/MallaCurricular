let courses = {};
const addedCourses = new Map();
const API_BASE_URL = 'http://localhost:49513'; // Asegúrate de que este puerto sea el correcto

// --- Funciones de Autenticación (Sin Cambios) ---

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginErrorMessage = document.getElementById('login-error-message');
    loginErrorMessage.style.display = 'none';

    const formData = new URLSearchParams();
    formData.append('Email', email);
    formData.append('Contrasena', password);

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/Login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: formData.toString()
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userName', data.userName);

                showMallaSection();
                fetchCourses();
            } else {
                loginErrorMessage.textContent = data.message || 'Credenciales incorrectas.';
                loginErrorMessage.style.display = 'block';
            }
        } else {
            if (response.headers.get('Content-Type')?.includes('text/html')) {
                loginErrorMessage.textContent = `Error de validación en el servidor. Verifica tus datos.`;
            } else {
                const errorData = await response.json();
                loginErrorMessage.textContent = errorData.message || `Error en el servidor: ${response.status} ${response.statusText}`;
            }
            loginErrorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        loginErrorMessage.textContent = `No se pudo conectar al servidor: ${error.message}. Asegúrate de que el backend esté ejecutándose.`;
        loginErrorMessage.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    showLoginSection();
}

function checkAuthAndRender() {
    if (localStorage.getItem('isAuthenticated') === 'true') {
        showMallaSection();
        fetchCourses();
    } else {
        showLoginSection();
    }
}

function showLoginSection() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('malla-section').classList.add('hidden');
}

function showMallaSection() {
    document.getElementById('login-section').classList.add('hidden');
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
            <div class="custom-dropdown absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto hidden"
                style="width: 400px;"
                >
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
    errorMessage.style.display = 'none';
    const grid = document.getElementById('semester-grid');
    grid.innerHTML = '<p class="text-center">Cargando cursos...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/cursos/todos`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        courses = {};
        data.forEach(course => {
            const prerequisiteCodes = Array.isArray(course.Prerequisitos)
                ? course.Prerequisitos.map(p => p.Codigo)
                : [];

            courses[course.Codigo] = {
                code: course.Codigo,
                name: course.Asignatura,
                prerequisiteCodes: prerequisiteCodes,
                color: course.Color,
                credits: course.Creditos,
                tps: course.TPS,
                tis: course.TIS,
                type: course.Tipo // Aseguramos que 'Tipo' esté disponible
            };
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


        renderSemesters();
    } catch (error) {
        console.error('Error al cargar los cursos:', error);
        errorMessage.textContent = `No se pudieron cargar los cursos: ${error.message}.`;
        errorMessage.style.display = 'block';
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

    // Generar los 10 semestres normales
    for (let i = 1; i <= 10; i++) {
        const semester = document.createElement('div');
        semester.className = 'semester';
        semester.setAttribute('data-semester', i);
        semester.innerHTML = `
        <h3>Semestre ${i}</h3> ${createCustomSelect(i)} 
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
        <div class="mx-auto" style="max-width: 600px;"> 
            ${createCustomSelect('P')} 
        </div>
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
            courseDiv.className = `course ${course.color} p-3 rounded-lg shadow text-center`;
            courseDiv.setAttribute('data-code', courseCode);
            courseDiv.setAttribute('data-semester', semester);

            const prereqsHtml = course.prerequisiteCodes && course.prerequisiteCodes.length > 0
                ? `<div class="text-xs mt-1 text-gray-500">Req: ${course.prerequisiteCodes.join(', ')}</div>`
                : '';

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

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const coursesSection = document.querySelector('.courses');
    const filtersSection = document.querySelector('.filters');
    const retryBtn = document.querySelector('.retry-btn');
    const exportBtn = document.querySelector('.export-btn');
    const saveBtn = document.querySelector('.save-btn');
    const colorPalette = document.querySelector('.color-palette');
    const logoutBtn = document.querySelector('.logout-btn');
    const updateBtn = document.querySelector('.filters button:nth-child(2)'); // Ajustar selector para el nuevo botón

    const courseSelects = document.querySelectorAll('.custom-select-container');
    const removeButtons = document.querySelectorAll('.remove-btn');
    const summaryBoxes = document.querySelectorAll('.semester-summary');

    // Ocultar elementos de UI antes de exportar
    [filtersSection, retryBtn, exportBtn, saveBtn, colorPalette, logoutBtn, updateBtn].forEach(el => {
        if (el) el.style.display = 'none';
    });
    courseSelects.forEach(sel => sel.style.display = 'none');
    removeButtons.forEach(btn => btn.style.display = 'none');
    summaryBoxes.forEach(box => box.style.display = 'none');


    try {
        const canvas = await html2canvas(coursesSection, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const imgWidth = 190;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 20;

        doc.setFontSize(16);
        doc.text('Malla Curricular - ITM', 10, 10);

        doc.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - position - 10);

        while (heightLeft > 0) {
            doc.addPage();
            position = 10;
            doc.addImage(imgData, 'JPEG', 10, position - heightLeft, imgWidth, imgHeight);
            heightLeft -= (pageHeight - 10);
        }

        doc.save('malla_curricular.pdf');
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        const errorMsg = document.getElementById('error-message');
        if (errorMsg) {
            errorMsg.textContent = 'Error al generar el PDF. Revisa la consola.';
            errorMsg.style.display = 'block';
        }
    } finally {
        // Restaurar elementos de UI después de exportar
        [filtersSection, retryBtn, exportBtn, saveBtn, colorPalette, logoutBtn, updateBtn].forEach(el => {
            if (el) el.style.display = 'block';
        });
        courseSelects.forEach(sel => sel.style.display = 'block');
        removeButtons.forEach(btn => btn.style.display = 'block');
        summaryBoxes.forEach(box => box.style.display = 'block');
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
            <div class="grid grid-cols-3 border border-black" style="font-size: 1.25rem;">

                <div class="col-span-2 grid grid-cols-2 border-r border-black bg-gray-100">

                    <div class="border-b border-black font-bold text-lg p-1">${tps_total}</div>
                    <div class="border-b border-black border-l font-bold text-lg p-1">${tis_total}</div>

                    <div class="font-bold text-lg p-1">${tps_hours}</div>
                    <div class="font-bold border-l border-black text-lg p-1">${tis_hours}</div>
                </div>

                <div class="flex items-center justify-center text-3xl font-bold text-gray-700 bg-gray-200 border-l border-black">
                    ${total_credits}
                </div>
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
    document.getElementById('update-name').value = course.name;
    document.getElementById('update-color').value = course.color;
    document.getElementById('update-tps').value = course.tps;
    document.getElementById('update-tis').value = course.tis;
    document.getElementById('update-type').value = course.type || 'Teorica';
    document.getElementById('update-credits').value = course.credits;

    // Rellenar prerrequisito
    const prereqCode = (course.prerequisiteCodes && course.prerequisiteCodes.length > 0) ? course.prerequisiteCodes[0] : '';
    document.getElementById('update-prerequisite').value = prereqCode;
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



// --- Inicialización (Modificada para incluir el listener de actualización) ---

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    const updateForm = document.getElementById('update-course-form');
    if (updateForm) {
        updateForm.addEventListener('submit', handleUpdateCourse);
    }

    checkAuthAndRender();

    document.addEventListener('click', (event) => {
        // Cierra los dropdowns de selección de curso
        if (!event.target.closest('.custom-select-container')) {
            document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.add('hidden'));
        }
    });
});