using MallaCurricular.Models;
using MallaCurricular.Repositories;
using MallaCurricular.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using Newtonsoft.Json.Linq;
using System.Data.Entity;

namespace MallaCurricular.Controllers
{
    [RoutePrefix("api/cursos")]
    public class CursosController : ApiController
    {
        private readonly clsCurso _cursoService;
        private readonly clsMalla _mallaService;

        public CursosController()
        {
            // NOTA: Para una aplicación robusta, se recomienda encarecidamente usar un Contenedor IoC
            // (como Unity, Autofac, etc.) para gestionar estas dependencias automáticamente.

            // 1. Crear una única instancia del contexto DB
            var dbContext = new MallaDBEntities4();

            // 2. Inyección para clsCurso (asumiendo que CursoRepositorio ahora acepta el contexto)
            _cursoService = new clsCurso(new CursoRepositorio(dbContext));

            // 3. Inyección para clsMalla (requiere 4 repositorios, todos aceptando el contexto)
            _mallaService = new clsMalla(
                // Repositorios existentes
                new MallaRepositorio(dbContext),
                new MallaCursoRepositorio(dbContext),

                // Nuevos repositorios para Electivas y Optativas
                new ElectivaRepositorio(dbContext),
                new OptativaRepositorio(dbContext)
            );
        }

        // --------------------------------------------------------------------------------
        // MÉTODOS GET
        // --------------------------------------------------------------------------------

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

        // NUEVO: GET para Catálogo de Electivas
        [HttpGet]
        [Route("catalogo/electivas")]
        public IHttpActionResult GetCatalogoElectivas()
        {
            try
            {
                var electivas = _mallaService.ObtenerCatalogoElectivas();
                return Ok(electivas);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Error al obtener el catálogo de electivas: " + ex.Message));
            }
        }

        // NUEVO: GET para Catálogo de Optativas
        [HttpGet]
        [Route("catalogo/optativas")]
        public IHttpActionResult GetCatalogoOptativas()
        {
            try
            {
                var optativas = _mallaService.ObtenerCatalogoOptativas();
                return Ok(optativas);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Error al obtener el catálogo de optativas: " + ex.Message));
            }
        }

        // --------------------------------------------------------------------------------
        // MÉTODOS POST/PUT
        // --------------------------------------------------------------------------------

        // POST: api/cursos/crear
        [HttpPost]
        [Route("crear")]
        public IHttpActionResult CrearCurso([FromBody] JObject data)
        {
            try
            {
                if (data == null)
                    return BadRequest("Los datos del curso no pueden estar vacíos.");

                // Extracción de datos del JSON
                var prerequisitoCodigosToken = data["PrerequisitoCodigos"];
                List<string> prerequisitoCodigos = prerequisitoCodigosToken?.ToObject<List<string>>()
                                                         ?? new List<string>();

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

                var error = _cursoService.CrearCurso(curso, prerequisitoCodigos);

                if (!string.IsNullOrEmpty(error))
                    return BadRequest(error);

                return Ok(new { message = $"Curso {curso.Codigo} creado exitosamente." });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Error al crear el curso: " + ex.Message));
            }
        }

        // PUT: api/cursos/actualizar/{id}
        [HttpPut]
        [Route("actualizar/{id}")]
        public IHttpActionResult ActualizarCurso(string id, [FromBody] JObject data)
        {
            try
            {
                if (data == null)
                    return BadRequest("Los datos de actualización no pueden estar vacíos.");

                var prerequisitoCodigosToken = data["PrerequisitoCodigos"];
                List<string> prerequisitoCodigos = prerequisitoCodigosToken?.ToObject<List<string>>()
                                                         ?? new List<string>();

                Curso cursoActualizado = data.ToObject<Curso>();

                if (cursoActualizado == null)
                    return BadRequest("Datos del curso incompletos o mal formados para la actualización.");

                var error = _cursoService.ActualizarCurso(id, cursoActualizado, prerequisitoCodigos);

                if (!string.IsNullOrEmpty(error))
                    return BadRequest(error);

                return Ok(new { message = $"Curso {id} actualizado exitosamente." });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Error al actualizar el curso: " + ex.Message));
            }
        }
    }
}