const API_MICRODISENOS = 'http://localhost:49513/api/microdisenos';

async function fetchMicrodisenosPendientes() {
    try {
        const res = await fetch(`${API_MICRODISENOS}/pendientes`);
        if(!res.ok) throw new Error('Error al obtener microdiseños');
        
        const data = await res.json();
        const tbody = document.getElementById('microdisenos-list-body');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        
        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-500 italic">No hay microdiseños pendientes de revisión.</td></tr>';
            return;
        }

        data.forEach(m => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-gray-50 transition";
            tr.innerHTML = `
                <td class="p-4 font-bold text-indigo-700">${m.CursoCodigo}</td>
                <td class="p-4 text-gray-600">${m.Semestre}</td>
                <td class="p-4">${m.ElaboradoPor || 'Docente'}</td>
                <td class="p-4 text-xs text-gray-400">${new Date(m.FechaCreacion).toLocaleString()}</td>
                <td class="p-4 text-center">
                    <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">${m.Estado}</span>
                </td>
                <td class="p-4 text-center">
                    <button onclick="revisarMicrodiseno('${m.CursoCodigo}', '${m.Semestre}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-lg text-xs font-bold shadow transition-all transform hover:scale-105">
                        Revisar y Decidir
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(e) { 
        console.error(e);
        const tbody = document.getElementById('microdisenos-list-body');
        if(tbody) tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-red-500 font-bold">Error al cargar datos del servidor.</td></tr>';
    }
}

function revisarMicrodiseno(codigo, semestre) {
    window.location.href = `Microdiseno_Review.html?cursoCodigo=${encodeURIComponent(codigo)}&semestre=${encodeURIComponent(semestre)}`;
}

// Redefinimos switchJefeTab para incluir microdiseños
function switchJefeTab(tab) {
    // Escondemos todas las secciones conocidas
    const sections = ['malla-section', 'grupos-section', 'microdisenos-section'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.add('hidden');
    });

    // Reset estilos tabs
    const tabs = ['tab-malla', 'tab-grupos', 'tab-microdisenos'];
    tabs.forEach(t => {
        const el = document.getElementById(t);
        if(el) {
            el.classList.remove('text-white');
            el.classList.add('text-gray-300');
        }
    });

    // Mostramos la activa
    const activeSection = document.getElementById(tab + '-section');
    if(activeSection) activeSection.classList.remove('hidden');
    
    const activeTab = document.getElementById('tab-' + tab);
    if(activeTab) {
        activeTab.classList.remove('text-gray-300');
        activeTab.classList.add('text-white');
    }

    // Inicialización específica según el tab
    if(tab === 'grupos') {
        if(typeof initJefeGrupos === 'function') initJefeGrupos();
    }
    if(tab === 'microdisenos') {
        fetchMicrodisenosPendientes();
    }
}

// Al cargar, verificar si hay un tab en el URL
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if(tab) {
        switchJefeTab(tab);
    } else {
        // Por defecto mostrar malla
        switchJefeTab('malla');
    }
});
