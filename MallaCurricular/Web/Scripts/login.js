document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtener valores de los inputs
        // Nota: Asegúrate de que en tu HTML los IDs sean 'username' (para email) y 'password'
        const emailValue = document.getElementById('username').value;
        const passwordValue = document.getElementById('password').value;
        const btnSubmit = document.getElementById('btn-submit');

        // Estado de carga
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Verificando...';
        errorMsg.classList.add('hidden');

        try {
            // PETICIÓN AL CONTROLADOR C#
            const response = await fetch('/Login/Autenticar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Enviamos los datos como JSON
                body: JSON.stringify({
                    email: emailValue,
                    password: passwordValue
                })
            });

            const data = await response.json();

            if (data.success) {
                // 1. Guardar datos importantes en localStorage (opcional, para el frontend)
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userName', data.nombre);
                localStorage.setItem('userRole', data.rol);

                // 2. Redirigir según la URL que envió el servidor
                window.location.href = data.redirectUrl;
            } else {
                // Mostrar mensaje de error del servidor
                errorMsg.textContent = data.message;
                errorMsg.classList.remove('hidden');
                resetButton(btnSubmit);
            }
        } catch (err) {
            console.error('Error en login:', err);
            errorMsg.textContent = 'Error de conexión con el servidor.';
            errorMsg.classList.remove('hidden');
            resetButton(btnSubmit);
        }
    });

    function resetButton(btn) {
        btn.disabled = false;
        btn.textContent = 'Iniciar Sesión';
    }
});
