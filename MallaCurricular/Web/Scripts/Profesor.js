const API_BASE_URL = 'http://localhost:49513';
let currentSubject = null;
let grupos = [];
let compromisosData = { avisos: "", evaluaciones: [], respuestas: [] };
let currentInscritos = [];

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");
    
    if(!userId) {
        window.location.href = "login.html";
        return;
    }
    
    document.getElementById("profesor-name").textContent = "Prof. " + userName;
    fetchGrupos(userId);
});

async function fetchGrupos(profesorId) {
    const list = document.getElementById('materias-list');
    list.innerHTML = `<div class="p-6 text-center text-gray-400 text-sm">Cargando...</div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/grupos/mis-grupos?profesorId=${profesorId}`);
        grupos = await res.json();
        renderGrupos();
    } catch {
        list.innerHTML = `<div class="p-6 text-center text-red-500 text-sm">Error al cargar grupos</div>`;
    }
}

function renderGrupos() {
    const list = document.getElementById('materias-list');
    list.innerHTML = '';
    if(grupos.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-gray-500 text-sm">No tienes grupos.</div>`;
        return;
    }

    grupos.forEach(g => {
        const item = document.createElement('div');
        item.className = 'sidebar-item px-5 py-4 border-b cursor-pointer hover:bg-blue-50';
        if (currentSubject && currentSubject.Id === g.Id) item.classList.add('bg-blue-100');

        item.innerHTML = `
            <div class="font-bold text-sm text-blue-900">${g.Asignatura}</div>
            <div class="text-xs text-gray-600 font-bold mt-1">${g.Nombre} <span class="text-gray-400 font-normal">(${g.CursoCodigo})</span></div>
        `;
        item.onclick = () => selectGrupo(g);
        list.appendChild(item);
    });
}

function parseNovedades(novedadesStr) {
    try {
        let parsed = JSON.parse(novedadesStr || "{}");
        if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return {
                avisos: parsed.avisos || "",
                evaluaciones: parsed.evaluaciones || [],
                respuestas: parsed.respuestas || []
            };
        }
    } catch(e) {}
    // Fallback if it was old raw text
    return { avisos: novedadesStr || "", evaluaciones: [], respuestas: [] };
}

async function selectGrupo(g) {
    currentSubject = g;
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('editor-container').classList.remove('hidden');

    document.getElementById('header-subject-name').textContent = g.Asignatura;
    document.getElementById('header-group-name').textContent = g.Nombre + " | " + g.CursoCodigo;

    compromisosData = parseNovedades(g.Novedades);

    renderEvaluationsTable();
    
    // Fetch students to match with responses
    try {
        const res = await fetch(`${API_BASE_URL}/api/grupos/estudiantes-inscritos/${g.Id}`);
        currentInscritos = await res.json();
    } catch(e) { currentInscritos = []; }
    
    renderStudentsResponses();
    renderGrupos(); // update active class
}

function renderEvaluationsTable() {
    const tbody = document.getElementById('evaluations-body');
    tbody.innerHTML = '';
    let total = 0;

    compromisosData.evaluaciones.forEach((ev, index) => {
        total += parseInt(ev.valor) || 0;
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50";
        tr.innerHTML = `
            <td class="p-3">${index + 1}</td>
            <td class="p-2"><input type="text" class="w-full border p-1 rounded" value="${ev.aeae}" onchange="updateEv(${index}, 'aeae', this.value)"></td>
            <td class="p-2"><input type="text" class="w-full border p-1 rounded" value="${ev.tia}" onchange="updateEv(${index}, 'tia', this.value)"></td>
            <td class="p-2"><input type="number" class="w-20 border p-1 rounded text-center" value="${ev.valor}" onchange="updateEv(${index}, 'valor', this.value)"></td>
            <td class="p-2"><input type="date" class="w-full border p-1 rounded" value="${ev.fecha}" onchange="updateEv(${index}, 'fecha', this.value)"></td>
            <td class="p-2 text-center text-red-500 font-bold cursor-pointer hover:underline" onclick="removeEvaluationRow(${index})">X</td>
        `;
        tbody.appendChild(tr);
    });

    const sumEl = document.getElementById('total-percent');
    sumEl.textContent = total + "%";
    sumEl.className = total === 100 ? "p-3 text-green-600 font-black" : "p-3 text-red-600 font-black";
}

function addEvaluationRow() {
    compromisosData.evaluaciones.push({ aeae: "", tia: "", valor: 0, fecha: "" });
    renderEvaluationsTable();
}

function removeEvaluationRow(index) {
    compromisosData.evaluaciones.splice(index, 1);
    renderEvaluationsTable();
}

function updateEv(index, field, value) {
    if(field === 'valor') compromisosData.evaluaciones[index][field] = parseInt(value) || 0;
    else compromisosData.evaluaciones[index][field] = value;
    renderEvaluationsTable();
}

function renderStudentsResponses() {
    const tbody = document.getElementById('students-responses-body');
    tbody.innerHTML = '';

    if(currentInscritos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 italic">No hay estudiantes matriculados en este grupo.</td></tr>`;
        return;
    }

    currentInscritos.forEach(est => {
        // Find existing response targeting this ID
        const resp = compromisosData.respuestas.find(r => String(r.estudianteId) === String(est.EstudianteId));
        
        let estado = resp ? resp.estado : "En Espera";
        let colorEstado = estado === "Aceptado" ? "bg-green-100 text-green-800" : 
                          estado === "Rechazado" ? "bg-red-100 text-red-800" : "bg-gray-200 text-gray-700";

        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50";
        tr.innerHTML = `
            <td class="p-3 text-xs uppercase text-gray-800 font-bold">${est.Nombre}</td>
            <td class="p-3"><span class="px-3 py-1 rounded-full text-xs font-bold ${colorEstado}">${estado}</span></td>
            <td class="p-3 text-gray-500 text-xs">${resp?.fecha || '-'}</td>
            <td class="p-3 text-gray-600 text-xs italic">${resp?.observacion || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function saveAllChanges() {
    if (!currentSubject) return;

    // Calculate total
    const total = compromisosData.evaluaciones.reduce((sum, ev) => sum + (parseInt(ev.valor) || 0), 0);
    if(total !== 100 && compromisosData.evaluaciones.length > 0) {
        if(!confirm("Advertencia: La suma de porcentajes NO es 100%. ¿Desea guardar de todas formas?")) return;
    }

    const payload = JSON.stringify(compromisosData);

    try {
        const res = await fetch(`${API_BASE_URL}/api/grupos/novedades/${currentSubject.Id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Novedades: payload })
        });
        
        if(res.ok) {
            alert('¡Compromiso Académico actualizado exitosamente!');
            currentSubject.Novedades = payload; // local cache update
        } else {
            alert("Error al guardar en el servidor");
        }
    } catch(err) {
        alert("Error de red: " + err);
    }
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}
