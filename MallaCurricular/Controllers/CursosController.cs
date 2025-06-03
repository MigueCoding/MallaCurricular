using MallaCurricular.Models;
using MallaCurricular.Repositories;
using MallaCurricular.Services;
using System;
using System.Linq;
using System.Web.Http;

namespace MallaCurricular.Controllers
{
    [RoutePrefix("api/cursos")]
    public class CursosController : ApiController
    {
        private readonly clsCurso _cursoService;
        private readonly clsMalla _mallaService;

        public CursosController()
        {
            _cursoService = new clsCurso(new CursoRepositorio());
            _mallaService = new clsMalla(new MallaRepositorio(), new MallaCursoRepositorio());
        }

        [HttpGet]
        [Route("todos")]
        public IHttpActionResult GetAllCourses()
        {
            try
            {
                var cursos = _cursoService.ObtenerTodos();
                return Ok(cursos);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error al obtener todos los cursos: " + ex.Message );
            }
        }
        // GET: api/cursos?mallaId={id}
        [HttpGet]
        [Route("")]
        public IHttpActionResult Get([FromUri] int? mallaId = null)
        {
            try
            {
                Malla malla = null;

                if (mallaId.HasValue)
                {
                    malla = _mallaService.ObtenerMallaPorId(mallaId.Value);

                    if (malla == null)
                        return BadRequest($"No se encontró una malla con ID {mallaId.Value}.");
                }
                else
                {
                    malla = _mallaService.ObtenerUltimaMalla();

                    if (malla == null)
                    {
                        var cursos = _cursoService.ObtenerTodos();
                        return Ok(cursos);
                    }
                }

                var cursosInMalla = _mallaService.ObtenerCursosPorMalla(malla.Id);
                return Ok(cursosInMalla);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }


        // POST: api/cursos
        // POST: api/cursos/crear
        [HttpPost]
        [Route("crear")]
        public IHttpActionResult CrearCurso([FromBody] Curso curso)
        {
            try
            {
                if (curso == null)
                    return BadRequest("Los datos del curso no pueden estar vacíos.");

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();

                    return BadRequest("Datos inválidos: " + string.Join(", ", errors));
                }

                var error = _cursoService.CrearCurso(curso);

                if (!string.IsNullOrEmpty(error))
                    return BadRequest(error);

                return Ok(new { message = "Curso creado exitosamente." });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Error al crear el curso: " + ex.Message));
            }
        }

    }
}
