document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMsg = document.getElementById('register-error');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const carnet = document.getElementById('carnet').value;
        const password = document.getElementById('password').value;
        const btnRegister = document.getElementById('btn-register');

        // Estado de carga visual
        btnRegister.disabled = true;
        btnRegister.textContent = 'Procesando...';
        errorMsg.classList.add('hidden');

        const userData = {
            Email: email,
            Carnet: carnet,
            Password: password
        };

        try {
            // Reemplaza con la URL real de tu API en .NET
            const response = await fetch('http://localhost:49513/api/usuarios/registrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
                window.location.href = 'Login.html';
            } else {
                throw new Error('Error en el servidor');
            }
        } catch (err) {
            console.error(err);
            errorMsg.classList.remove('hidden');
            btnRegister.disabled = false;
            btnRegister.textContent = 'Registrarse';
        }
    });
});