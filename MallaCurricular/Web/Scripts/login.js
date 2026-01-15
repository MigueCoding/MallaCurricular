document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const btnSubmit = document.getElementById('btn-submit');

        // Estado de carga
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Verificando...';
        errorMsg.classList.add('hidden');

        try {
            // Ejemplo de validación local (reemplazar con fetch a tu API)
            if (username === 'admin' && password === '123') {
                // Guardar sesión (ejemplo simple)
                localStorage.setItem('userAuthenticated', 'true');

                // Redirigir a la malla
                window.location.href = 'plana.html';
            } else {
                throw new Error('Credenciales inválidas');
            }
        } catch (err) {
            errorMsg.classList.remove('hidden');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Iniciar Sesión';
        }
    });
});