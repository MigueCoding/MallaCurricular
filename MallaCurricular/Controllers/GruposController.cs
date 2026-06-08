using MallaCurricular.Core.Domain.Interfaces;
using MallaCurricular.Infrastructure.Data;
using MallaCurricular.Infrastructure.Repositories;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.Entity.Core.EntityClient;
using System.Data.SqlClient;
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

        private string GetConnectionString()
        {
            var efConnectionString = ConfigurationManager.ConnectionStrings["MallaDBEntities"].ConnectionString;
            var builder = new EntityConnectionStringBuilder(efConnectionString);
            return builder.ProviderConnectionString;
        }

        private string GetNovedadesJson(int grupoId, string textAvisos)
        {
            JObject json;
            try {
                json = JObject.Parse(textAvisos ?? "{}");
            } catch {
                json = new JObject();
                json["avisos"] = textAvisos ?? "";
            }
            JArray evs = new JArray();
            JArray resp = new JArray();

            using(var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmdEv = new SqlCommand("SELECT * FROM MomentosEvaluativos WHERE GrupoId=@g", conn);
                cmdEv.Parameters.AddWithValue("@g", grupoId);
                using(var r = cmdEv.ExecuteReader()) {
                    while(r.Read()) {
                        JObject n = new JObject();
                        n["aeae"] = r["EventoEvaluativo"].ToString();
                        n["tia"] = r["TipoEvento"].ToString();
                        n["valor"] = r["Ponderacion"].ToString();
                        n["fecha"] = r["Fecha"].ToString();
                        evs.Add(n);
                    }
                }

                var cmdResp = new SqlCommand("SELECT * FROM RespuestasCompromiso WHERE GrupoId=@g", conn);
                cmdResp.Parameters.AddWithValue("@g", grupoId);
                using(var r = cmdResp.ExecuteReader()) {
                    while(r.Read()) {
                        JObject n = new JObject();
                        n["estudianteId"] = r["EstudianteId"].ToString();
                        n["estado"] = r["Estado"].ToString();
                        n["observacion"] = r["Observacion"].ToString();
                        n["fecha"] = r["Fecha"].ToString();
                        resp.Add(n);
                    }
                }
            }
            json["evaluaciones"] = evs;
            json["respuestas"] = resp;
            return json.ToString();
        }

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
                string nombre = data["Nombre"].ToString();
                string cursoCodigo = data["CursoCodigo"].ToString();
                int profesorId = int.Parse(data["ProfesorId"].ToString());

                if (_gruposRepo.GetAll().Any(gr => gr.Nombre.ToLower() == nombre.ToLower() && gr.CursoCodigo == cursoCodigo)) {
                    return BadRequest("Ya existe un grupo con ese nombre para esta asignatura.");
                }

                Grupos g = new Grupos();
                g.Nombre = nombre;
                g.CursoCodigo = cursoCodigo;
                g.ProfesorId = profesorId;
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
                int grupoId = int.Parse(data["GrupoId"].ToString());
                int estudianteId = int.Parse(data["EstudianteId"].ToString());

                if (_inscripcionesRepo.GetAll().Any(i => i.GrupoId == grupoId && i.EstudianteId == estudianteId)) {
                    return BadRequest("El estudiante ya se encuentra matriculado en este grupo.");
                }

                Inscripcione ins = new Inscripcione();
                ins.GrupoId = grupoId;
                ins.EstudianteId = estudianteId;
                _inscripcionesRepo.Add(ins);
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
                Novedades = GetNovedadesJson(g.Id, g.Novedades)
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
                
                string payload = data["Novedades"]?.ToString();
                g.Novedades = payload;
                var json = JObject.Parse(payload ?? "{}");
                _gruposRepo.Update(g);

                using(var conn = new SqlConnection(GetConnectionString()))
                {
                    conn.Open();
                    var cmdDel = new SqlCommand("DELETE FROM MomentosEvaluativos WHERE GrupoId=@g", conn);
                    cmdDel.Parameters.AddWithValue("@g", grupoId);
                    cmdDel.ExecuteNonQuery();

                    if (json["evaluaciones"] != null) {
                        foreach(var ev in (JArray)json["evaluaciones"]) {
                            var cmdIns = new SqlCommand("INSERT INTO MomentosEvaluativos (GrupoId, EventoEvaluativo, TipoEvento, Ponderacion, Fecha) VALUES (@g, @aeae, @tia, @val, @f)", conn);
                            cmdIns.Parameters.AddWithValue("@g", grupoId);
                            cmdIns.Parameters.AddWithValue("@aeae", ev["aeae"]?.ToString() ?? "");
                            cmdIns.Parameters.AddWithValue("@tia", ev["tia"]?.ToString() ?? "");
                            
                            decimal val = 0;
                            decimal.TryParse(ev["valor"]?.ToString(), out val);
                            cmdIns.Parameters.AddWithValue("@val", val);
                            
                            cmdIns.Parameters.AddWithValue("@f", ev["fecha"]?.ToString() ?? "");
                            cmdIns.ExecuteNonQuery();
                        }
                    }
                }
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

                using(var conn = new SqlConnection(GetConnectionString()))
                {
                    conn.Open();
                    var cmdDel = new SqlCommand("DELETE FROM RespuestasCompromiso WHERE GrupoId=@g AND EstudianteId=@s", conn);
                    cmdDel.Parameters.AddWithValue("@g", grupoId);
                    cmdDel.Parameters.AddWithValue("@s", estudianteId);
                    cmdDel.ExecuteNonQuery();

                    var cmdIns = new SqlCommand("INSERT INTO RespuestasCompromiso (GrupoId, EstudianteId, Estado, Observacion, Fecha) VALUES (@g, @s, @est, @obs, @f)", conn);
                    cmdIns.Parameters.AddWithValue("@g", grupoId);
                    cmdIns.Parameters.AddWithValue("@s", estudianteId);
                    cmdIns.Parameters.AddWithValue("@est", estado ?? "");
                    cmdIns.Parameters.AddWithValue("@obs", observacion ?? "");
                    cmdIns.Parameters.AddWithValue("@f", fecha);
                    cmdIns.ExecuteNonQuery();
                }

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
            var data = _inscripcionesRepo.GetByEstudianteId(estudianteId).ToList().Select(i => new {
                i.Id,
                i.GrupoId,
                i.Grupos?.CursoCodigo,
                GrupoNombre = i.Grupos?.Nombre,
                CursoNombre = i.Grupos?.Curso?.Asignatura,
                ProfesorNombre = i.Grupos?.Usuario?.nombre,
                Novedades = GetNovedadesJson(i.GrupoId, i.Grupos?.Novedades)
            });
            return Ok(data);
        }
    }
}
