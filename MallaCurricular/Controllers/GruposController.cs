using MallaCurricular.Core.Domain.Interfaces;
using MallaCurricular.Infrastructure.Data;
using MallaCurricular.Infrastructure.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using Newtonsoft.Json.Linq;

namespace MallaCurricular.Controllers
{
    [RoutePrefix("api/grupos")]
    public class GruposController : ApiController
    {
        private IGruposRepositorio _gruposRepo = new GruposRepositorio();
        private IInscripcioneRepositorio _inscripcionesRepo = new InscripcioneRepositorio();
        private UsuarioRepositorio _usRepo = new UsuarioRepositorio();

        // ----------------------------------------------------
        // JEFE
        // ----------------------------------------------------
        [HttpGet]
        [Route("todos")]
        public IHttpActionResult GetAll()
        {
            var data = _gruposRepo.GetAll().Select(g => new { 
                g.Id, 
                g.Nombre, 
                g.CursoCodigo, 
                Asignatura = g.Curso?.Asignatura,
                g.ProfesorId,
                ProfesorNombre = g.Usuario?.nombre,
                g.Novedades 
            });
            return Ok(data);
        }

        [HttpPost]
        [Route("crear")]
        public IHttpActionResult Crear([FromBody] JObject data)
        {
            try {
                Grupos g = new Grupos();
                g.Nombre = data["Nombre"].ToString();
                g.CursoCodigo = data["CursoCodigo"].ToString();
                g.ProfesorId = int.Parse(data["ProfesorId"].ToString());
                _gruposRepo.Add(g);
                return Ok(new { success = true, id = g.Id });
            } catch(Exception ex) {
                return BadRequest("Error: " + ex.Message);
            }
        }

        [HttpPost]
        [Route("inscribir")]
        public IHttpActionResult Inscribir([FromBody] JObject data)
        {
            try {
                Inscripcione i = new Inscripcione();
                i.GrupoId = int.Parse(data["GrupoId"].ToString());
                i.EstudianteId = int.Parse(data["EstudianteId"].ToString());
                _inscripcionesRepo.Add(i);
                return Ok(new { success = true });
            } catch(Exception ex) {
                return BadRequest("Error: " + ex.Message);
            }
        }

        [HttpGet]
        [Route("profesores")]
        public IHttpActionResult GetProfesores()
        {
            return Ok(_usRepo.ObtenerProfesores().Select(u => new { u.id_usuario, u.nombre }));
        }

        [HttpGet]
        [Route("estudiantes")]
        public IHttpActionResult GetEstudiantes()
        {
            return Ok(_usRepo.ObtenerEstudiantes().Select(u => new { u.id_usuario, u.nombre }));
        }

        // ----------------------------------------------------
        // PROFESOR
        // ----------------------------------------------------
        [HttpGet]
        [Route("mis-grupos")]
        public IHttpActionResult MisGrupos(int profesorId)
        {
            var data = _gruposRepo.GetByProfesorId(profesorId).Select(g => new {
                g.Id, 
                g.Nombre, 
                g.CursoCodigo, 
                Asignatura = g.Curso?.Asignatura, 
                g.Novedades
            });
            return Ok(data);
        }

        [HttpPut]
        [Route("novedades/{grupoId}")]
        public IHttpActionResult ActualizarNovedades(int grupoId, [FromBody] JObject data)
        {
            try {
                var g = _gruposRepo.GetById(grupoId);
                if (g == null) return BadRequest("Grupo no encontrado");
                
                g.Novedades = data["Novedades"]?.ToString();
                _gruposRepo.Update(g);
                return Ok(new { success = true });
            } catch (Exception ex) {
                return BadRequest("Error: " + ex.Message);
            }
        }

        [HttpGet]
        [Route("estudiantes-inscritos/{grupoId}")]
        public IHttpActionResult GetEstudiantesInscritos(int grupoId)
        {
            try 
            {
                var g = _gruposRepo.GetById(grupoId);
                if (g == null) return BadRequest("Grupo no encontrado");
                
                var inscritos = g.Inscripciones.Select(i => new {
                    EstudianteId = i.EstudianteId,
                    Nombre = i.Usuario?.nombre
                }).ToList();
                
                return Ok(inscritos);
            } 
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpPost]
        [Route("responder-compromiso")]
        public IHttpActionResult ResponderCompromiso([FromBody] JObject data)
        {
            try
            {
                int grupoId = int.Parse(data["GrupoId"].ToString());
                int estudianteId = int.Parse(data["EstudianteId"].ToString());
                string estado = data["Estado"]?.ToString();
                string observacion = data["Observacion"]?.ToString();
                string fecha = DateTime.Now.ToString("yyyy-MM-dd HH:mm");

                var g = _gruposRepo.GetById(grupoId);
                if (g == null) return BadRequest("Grupo no encontrado");

                JObject json = null;
                try {
                    json = JObject.Parse(g.Novedades ?? "{}");
                } catch {
                    json = new JObject();
                    json["avisos"] = g.Novedades; 
                }

                if (json["respuestas"] == null) json["respuestas"] = new JArray();
                JArray respuestas = (JArray)json["respuestas"];
                
                var existing = respuestas.FirstOrDefault(r => r["estudianteId"]?.ToString() == estudianteId.ToString());
                if (existing != null) existing.Remove();

                JObject nuevaResp = new JObject();
                nuevaResp["estudianteId"] = estudianteId;
                nuevaResp["estado"] = estado;
                nuevaResp["fecha"] = fecha;
                nuevaResp["observacion"] = observacion;

                respuestas.Add(nuevaResp);
                
                g.Novedades = json.ToString();
                _gruposRepo.Update(g);

                return Ok(new { success = true });
            }
            catch (Exception ex) { return BadRequest("Error: " + ex.Message); }
        }

        // ----------------------------------------------------
        // ESTUDIANTE
        // ----------------------------------------------------
        [HttpGet]
        [Route("mis-inscripciones")]
        public IHttpActionResult MisInscripciones(int estudianteId)
        {
            var data = _inscripcionesRepo.GetByEstudianteId(estudianteId).Select(i => new {
                i.Id,
                i.GrupoId,
                GrupoNombre = i.Grupos?.Nombre,
                CursoNombre = i.Grupos?.Curso?.Asignatura,
                ProfesorNombre = i.Grupos?.Usuario?.nombre,
                Novedades = i.Grupos?.Novedades
            });
            return Ok(data);
        }
    }
}
