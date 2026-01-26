using System;
using System.Web.Mvc;
using MallaCurricular.Models;
using MallaCurricular.Repositorios;

namespace MallaCurricular.Controllers
{
    public class LoginController : Controller
    {
        // Instancia del repositorio para manejar la lógica de datos
        private UsuarioRepositorio _repo = new UsuarioRepositorio();

        /// <summary>
        /// Acción que procesa el inicio de sesión.
        /// Se invoca vía POST desde el formulario de login.
        /// </summary>
        [HttpPost]
        public JsonResult Autenticar(string email, string password)
        {
            try
            {
                // 1. Validar que los campos no vengan vacíos
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                {
                    return Json(new { success = false, message = "Email y contraseña son obligatorios." });
                }

                // 2. Consultar al repositorio (usando campos: email, contrasena, id_rol)
                var usuario = _repo.ValidarUsuario(email, password);

                if (usuario != null)
                {
                    // 3. Crear variables de sesión para mantener al usuario conectado
                    Session["UsuarioID"] = usuario.id_usuario;
                    Session["NombreUsuario"] = usuario.nombre;
                    Session["RolID"] = usuario.id_rol;

                    // 4. Lógica de redirección según el ID del Rol
                    // Rol 1: Jefe -> index.html
                    // Rol 2: Profesor -> profesor.html
                    // Rol 3: Estudiante -> estudiante.html
                    string urlDestino = "";

                    switch (usuario.id_rol)
                    {
                        case 1:
                            urlDestino = "/web/index.html";
                            break;
                        case 2:
                            urlDestino = "/web/profesor.html";
                            break;
                        case 3:
                            urlDestino = "/web/estudiante.html";
                            break;
                        default:
                            return Json(new { success = false, message = "El usuario no tiene un rol válido asignado." });
                    }

                    // 5. Retornar éxito y la URL a la que el JavaScript debe redirigir
                    return Json(new
                    {
                        success = true,
                        nombre = usuario.nombre,
                        rol = usuario.id_rol,
                        redirectUrl = urlDestino
                    });
                }

                // Si no se encontró el usuario o la contraseña falló
                return Json(new { success = false, message = "Correo o contraseña incorrectos." });
            }
            catch (Exception ex)
            {
                // Manejo de errores de conexión o base de datos
                return Json(new { success = false, message = "Error en el servidor: " + ex.Message });
            }
        }

        /// <summary>
        /// Finaliza la sesión del usuario.
        /// </summary>
        public ActionResult Logout()
        {
            Session.Clear();
            Session.Abandon();
            return Redirect("/login.html"); // Cambia por tu página de inicio
        }
    }
}