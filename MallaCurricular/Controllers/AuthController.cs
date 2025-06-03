using System.Web.Http;
using MallaCurricular.Models;
using System.Linq;

namespace MallaCurricular.Controllers
{
    public class AuthController : ApiController
    {
        private MallaDBEntities2 db = new MallaDBEntities2();

        [HttpPost]
        [Route("Auth/Login")]
        public IHttpActionResult Login(LoginViewModel model)
        {
            if (model == null || string.IsNullOrEmpty(model.Email) || string.IsNullOrEmpty(model.Contrasena))
            {
                return BadRequest("Datos de inicio de sesión incompletos.");
            }

            var usuario = db.Usuarios.FirstOrDefault(u => u.Correo == model.Email && u.Clave == model.Contrasena);
            if (usuario != null)
            {
                return Ok(new
                {
                    success = true,
                    userId = usuario.Id.ToString(),
                    userName = usuario.Nombre
                });
            }

            return Ok(new { success = false, message = "Credenciales incorrectas." });
        }
    }
}
