using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.Entity.Core.EntityClient;
using System.Data.SqlClient;
using System.Web.Http;
using MallaCurricular.Models;

namespace MallaCurricular.Controllers
{
    [RoutePrefix("api/microdisenos")]
    public class MicrodisenosController : ApiController
    {
        private string GetConnectionString()
        {
            var efConnectionString = ConfigurationManager.ConnectionStrings["MallaDBEntities"].ConnectionString;
            var builder = new EntityConnectionStringBuilder(efConnectionString);
            return builder.ProviderConnectionString;
        }

        // 1. Obtener Microdiseño por Curso y Semestre (Para Docentes/Jefes)
        [HttpGet]
        [Route("{cursoCodigo}/{semestre}")]
        public IHttpActionResult GetMicrodiseno(string cursoCodigo, string semestre)
        {
            // Seguridad básica: Si es Estudiante (Rol 3), no permitir ver si no está aprobado
            var session = System.Web.HttpContext.Current.Session;
            if (session != null && session["RolID"] != null && (int)session["RolID"] == 3)
            {
                return GetMicrodisenoAprobado(cursoCodigo);
            }

            var mx = new MicrodisenoDTO();
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand("SELECT TOP 1 * FROM Microdisenos WHERE CursoCodigo = @c AND Semestre = @s ORDER BY Id DESC", conn);
                cmd.Parameters.AddWithValue("@c", cursoCodigo);
                cmd.Parameters.AddWithValue("@s", semestre);

                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        mx.Id = (int)reader["Id"];
                        mx.CursoCodigo = reader["CursoCodigo"].ToString();
                        mx.Semestre = reader["Semestre"].ToString();
                        mx.Facultad = reader["Facultad"]?.ToString();
                        mx.Modalidad = reader["Modalidad"]?.ToString();
                        mx.TipoCredito = reader["TipoCredito"]?.ToString();
                        mx.TipoAsignatura = reader["TipoAsignatura"]?.ToString();
                        mx.Version = reader["Version"]?.ToString();
                        mx.Estado = reader["Estado"]?.ToString();
                        mx.ObservacionesRechazo = reader["ObservacionesRechazo"]?.ToString();
                        mx.ElaboradoPor = reader["ElaboradoPor"]?.ToString();
                        mx.RevisadoPor = reader["RevisadoPor"]?.ToString();
                        mx.AprobadoPor = reader["AprobadoPor"]?.ToString();
                        if (reader["FechaCreacion"] != DBNull.Value) mx.FechaCreacion = (DateTime)reader["FechaCreacion"];
                        if (reader["FechaAprobacion"] != DBNull.Value) mx.FechaAprobacion = (DateTime)reader["FechaAprobacion"];
                        mx.ContenidoJSON = reader["ContenidoJSON"]?.ToString();
                    }
                    else
                    {
                        return NotFound();
                    }
                }
            }
            return Ok(mx);
        }

        // 2. Crear o Actualizar Borrador
        [HttpPost]
        [Route("")]
        public IHttpActionResult GuardarMicrodiseno(MicrodisenoDTO dto)
        {
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                int newId = dto.Id;

                if (dto.Id == 0)
                {
                    // Create
                    var cmd = new SqlCommand(@"
                        INSERT INTO Microdisenos (CursoCodigo, Semestre, Facultad, Modalidad, TipoCredito, TipoAsignatura, Estado, ElaboradoPor, FechaCreacion, Version, ContenidoJSON)
                        OUTPUT INSERTED.Id
                        VALUES (@cc, @sem, @fac, @mod, @tc, @ta, 'Borrador', @elab, GETDATE(), '1.0', @json)", conn);
                    cmd.Parameters.AddWithValue("@cc", dto.CursoCodigo ?? "");
                    cmd.Parameters.AddWithValue("@sem", dto.Semestre ?? "");
                    cmd.Parameters.AddWithValue("@fac", dto.Facultad ?? "");
                    cmd.Parameters.AddWithValue("@mod", dto.Modalidad ?? "");
                    cmd.Parameters.AddWithValue("@tc", dto.TipoCredito ?? "");
                    cmd.Parameters.AddWithValue("@ta", dto.TipoAsignatura ?? "");
                    cmd.Parameters.AddWithValue("@elab", dto.ElaboradoPor ?? "");
                    cmd.Parameters.AddWithValue("@json", dto.ContenidoJSON ?? "{}");
                    
                    newId = (int)cmd.ExecuteScalar();
                }
                else
                {
                    // Update
                    var cmd = new SqlCommand(@"
                        UPDATE Microdisenos SET 
                            Facultad = @fac, Modalidad = @mod, TipoCredito = @tc, TipoAsignatura = @ta, ElaboradoPor = @elab, ContenidoJSON = @json
                        WHERE Id = @id AND Estado IN ('Borrador', 'Rechazado')", conn);
                    cmd.Parameters.AddWithValue("@id", dto.Id);
                    cmd.Parameters.AddWithValue("@fac", dto.Facultad ?? "");
                    cmd.Parameters.AddWithValue("@mod", dto.Modalidad ?? "");
                    cmd.Parameters.AddWithValue("@tc", dto.TipoCredito ?? "");
                    cmd.Parameters.AddWithValue("@ta", dto.TipoAsignatura ?? "");
                    cmd.Parameters.AddWithValue("@elab", dto.ElaboradoPor ?? "");
                    cmd.Parameters.AddWithValue("@json", dto.ContenidoJSON ?? "{}");
                    int rows = cmd.ExecuteNonQuery();
                    if(rows == 0) return BadRequest("Microdiseño no existe o no está en un estado editable.");
                }

                return Ok(new { Message = "Guardado con éxito", Id = newId });
            }
        }

        // 3. Enviar a Revisión
        [HttpPost]
        [Route("{id}/enviar")]
        public IHttpActionResult EnviarRevision(int id)
        {
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand("UPDATE Microdisenos SET Estado = 'Pendiente' WHERE Id = @id AND Estado IN ('Borrador', 'Rechazado')", conn);
                cmd.Parameters.AddWithValue("@id", id);
                if (cmd.ExecuteNonQuery() > 0) return Ok(new { Message = "Enviado a revisión" });
                return BadRequest("No se pudo enviar.");
            }
        }

        // 4. Aprobar
        [HttpPost]
        [Route("{id}/aprobar")]
        public IHttpActionResult Aprobar(int id, RevisionMicrodisenoDTO dto)
        {
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand(@"
                    UPDATE Microdisenos 
                    SET Estado = 'Aprobado', AprobadoPor = @rev, RevisadoPor = @rev, FechaAprobacion = GETDATE(), ObservacionesRechazo = NULL
                    WHERE Id = @id AND Estado = 'Pendiente'", conn);
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@rev", dto.RevisorNombre ?? "");
                
                if (cmd.ExecuteNonQuery() > 0) return Ok(new { Message = "Aprobado" });
                return BadRequest("No se pudo aprobar.");
            }
        }

        // 5. Rechazar
        [HttpPost]
        [Route("{id}/rechazar")]
        public IHttpActionResult Rechazar(int id, RevisionMicrodisenoDTO dto)
        {
            if(string.IsNullOrEmpty(dto.Observaciones)) return BadRequest("Las observaciones son requeridas para rechazar.");

            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand(@"
                    UPDATE Microdisenos 
                    SET Estado = 'Rechazado', RevisadoPor = @rev, ObservacionesRechazo = @obs
                    WHERE Id = @id AND Estado = 'Pendiente'", conn);
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@rev", dto.RevisorNombre ?? "");
                cmd.Parameters.AddWithValue("@obs", dto.Observaciones);
                
                if (cmd.ExecuteNonQuery() > 0) return Ok(new { Message = "Rechazado" });
                return BadRequest("No se pudo rechazar.");
            }
        }

        // 6. Obtener Aprobados para estudiantes
        [HttpGet]
        [Route("aprobados/curso/{cursoCodigo}")]
        public IHttpActionResult GetMicrodisenoAprobado(string cursoCodigo)
        {
            var mx = new MicrodisenoDTO();
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand("SELECT TOP 1 * FROM Microdisenos WHERE CursoCodigo = @c AND Estado = 'Aprobado' ORDER BY FechaAprobacion DESC", conn);
                cmd.Parameters.AddWithValue("@c", cursoCodigo);

                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        mx.Id = (int)reader["Id"];
                        mx.CursoCodigo = reader["CursoCodigo"].ToString();
                        mx.Semestre = reader["Semestre"].ToString();
                        mx.Facultad = reader["Facultad"]?.ToString();
                        mx.Modalidad = reader["Modalidad"]?.ToString();
                        mx.TipoCredito = reader["TipoCredito"]?.ToString();
                        mx.TipoAsignatura = reader["TipoAsignatura"]?.ToString();
                        mx.Version = reader["Version"]?.ToString();
                        mx.Estado = reader["Estado"]?.ToString();
                        mx.ElaboradoPor = reader["ElaboradoPor"]?.ToString();
                        mx.RevisadoPor = reader["RevisadoPor"]?.ToString();
                        mx.AprobadoPor = reader["AprobadoPor"]?.ToString();
                        if (reader["FechaAprobacion"] != DBNull.Value) mx.FechaAprobacion = (DateTime)reader["FechaAprobacion"];
                        mx.ContenidoJSON = reader["ContenidoJSON"]?.ToString();
                    }
                    else
                    {
                        return NotFound();
                    }
                }
            }
            return Ok(mx);
        }
        [HttpGet]
        [Route("test")]
        public IHttpActionResult Test() => Ok("Working");
        // 7. Listar Pendientes (Para Jefe)
        [HttpGet]
        [Route("pendientes")]
        public IHttpActionResult GetPendientes()
        {
            var list = new List<MicrodisenoDTO>();
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand("SELECT Id, CursoCodigo, Semestre, ElaboradoPor, FechaCreacion, Estado FROM Microdisenos WHERE Estado = 'Pendiente' ORDER BY FechaCreacion DESC", conn);
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        list.Add(new MicrodisenoDTO
                        {
                            Id = (int)reader["Id"],
                            CursoCodigo = reader["CursoCodigo"].ToString(),
                            Semestre = reader["Semestre"].ToString(),
                            ElaboradoPor = reader["ElaboradoPor"]?.ToString(),
                            FechaCreacion = reader["FechaCreacion"] != DBNull.Value ? (DateTime)reader["FechaCreacion"] : DateTime.MinValue,
                            Estado = reader["Estado"].ToString()
                        });
                    }
                }
            }
            return Ok(list);
        }
    }
}
