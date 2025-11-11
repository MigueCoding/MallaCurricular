using MallaCurricular.Models;
using MallaCurricular.Repositories;
using MallaCurricular.Services;
using System;
using System.Collections.Generic; // Necesario para List<string>
using System.Linq;
using System.Web.Http;
using Newtonsoft.Json.Linq; // Necesario si estás usando dynamic y ToObject<T>() en ASP.NET Web API

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
                return BadRequest($"Error al obtener todos los cursos: " + ex.Message);
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


        // POST: api/cursos/crear
        [HttpPost]
        [Route("crear")]
        public IHttpActionResult CrearCurso([FromBody] JObject data) // Usamos JObject para facilitar la extracción
        {
            try
            {
                if (data == null)
                    return BadRequest("Los datos del curso no pueden estar vacíos.");

                // 1. Deserializar la entidad Curso y la lista de códigos de prerequisito.
                // Asume que las propiedades se llaman 'Curso' y 'PrerequisitoCodigos' en el JSON.

                // Extraer la lista de códigos de prerequisitos (puede ser null)
                var prerequisitoCodigosToken = data["PrerequisitoCodigos"];
                List<string> prerequisitoCodigos = prerequisitoCodigosToken?.ToObject<List<string>>()
                                                    ?? new List<string>();


                // Deserializar el resto del objeto JSON a la entidad Curso
                Curso curso = data.ToObject<Curso>();

                if (curso == null)
                    return BadRequest("Datos del curso incompletos o mal formados.");

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();

                    return BadRequest("Datos inválidos: " + string.Join(", ", errors));
                }

                // 2. Llamar al servicio con los dos argumentos
                var error = _cursoService.CrearCurso(curso, prerequisitoCodigos); // LÍNEA CORREGIDA

                if (!string.IsNullOrEmpty(error))
                    return BadRequest(error);

                return Ok(new { message = "Curso creado exitosamente." });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Error al crear el curso: " + ex.Message));
            }
        }

        // Nota: También debes corregir el método [HttpPut] o [HttpPatch] (ActualizarCurso) 
        // para que use este mismo patrón de DTO/dynamic y pase la lista de códigos de prerequisito al servicio.

    }
}