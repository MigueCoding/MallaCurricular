using MallaCurricular.Models;
using MallaCurricular.Repositories;
using MallaCurricular.Services;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;

namespace MallaCurricular.Controllers
{
    [RoutePrefix("api/mallas")]
    public class MallasController : ApiController
    {
        private readonly clsMalla _mallaService;

        public MallasController()
        {
            // NOTA: Para una arquitectura robusta, usa un contenedor IoC.

            // 1. Crear una única instancia del contexto DB
            var dbContext = new MallaDBEntities4();

            // 2. Corregir la inyección de clsMalla para los 4 argumentos requeridos
            // ASUMIMOS que todos los repositorios ahora aceptan MallaDBEntities4
            _mallaService = new clsMalla(
                // Repositorios existentes (ahora aceptan dbContext)
                new MallaRepositorio(dbContext),
                new MallaCursoRepositorio(dbContext),

                // Nuevos repositorios requeridos por la firma del constructor de clsMalla
                new ElectivaRepositorio(dbContext),
                new OptativaRepositorio(dbContext)
            );
        }

        // GET: api/mallas
        [HttpGet]
        [Route("")]
        public IHttpActionResult Get()
        {
            var mallas = _mallaService.ObtenerTodos();
            return Ok(mallas);
        }

        // POST: api/mallas
        [HttpPost]
        [Route("")]
        public IHttpActionResult Post([FromBody] MallaDto mallaDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var malla = new Malla
            {
                Nombre = mallaDto.Nombre
            };

            var mallaCursos = mallaDto.Courses.Select(c => new MallaCurso
            {
                // Asumiendo que MallaCurso tiene CursoCodigo (string) y Semestre (int)
                CursoCodigo = c.Codigo,
                Semestre = c.Semestre
            }).ToList();

            var error = _mallaService.CrearMalla(malla, mallaCursos);
            if (error != null)
                return BadRequest(error.ToString());

            return Ok(new { message = "Malla guardada exitosamente", mallaId = malla.Id });
        }

    }

    // DTO para mapear el cuerpo de la solicitud POST
    public class MallaDto
    {
        public string Nombre { get; set; }
        public List<MallaCursoDto> Courses { get; set; }
    }

    public class MallaCursoDto
    {
        public string Codigo { get; set; }
        public int Semestre { get; set; }
    }
}