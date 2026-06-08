using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.Entity.Core.EntityClient;
using System.Data.SqlClient;
using System.Web.Http;
using System.IO;
using System.Text;
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
                var cmd = new SqlCommand(@"
                    SELECT m.*, c.Asignatura 
                    FROM Microdisenos m
                    LEFT JOIN Cursos c ON LTRIM(RTRIM(m.CursoCodigo)) = LTRIM(RTRIM(c.Codigo))
                    WHERE LTRIM(RTRIM(m.CursoCodigo)) = @c AND LTRIM(RTRIM(m.Semestre)) = @s 
                    ORDER BY m.Id DESC", conn);
                cmd.Parameters.AddWithValue("@c", cursoCodigo);
                cmd.Parameters.AddWithValue("@s", semestre);

                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        mx.Id = (int)reader["Id"];
                        mx.CursoCodigo = reader["CursoCodigo"].ToString();
                        mx.Asignatura = reader["Asignatura"].ToString();
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

                if (mx.Id > 0 || !string.IsNullOrEmpty(mx.CursoCodigo))
                {
                    var cmdRoles = new SqlCommand("SELECT CreadorId, AvalId FROM MicrodisenoRoles WHERE CursoCodigo = @c", conn);
                    cmdRoles.Parameters.AddWithValue("@c", (mx.CursoCodigo ?? "").Trim());
                    using (var rRoles = cmdRoles.ExecuteReader()) {
                        if (rRoles.Read()) {
                            mx.CreadorId = rRoles["CreadorId"] != DBNull.Value ? (int)rRoles["CreadorId"] : 0;
                            mx.AvalId = rRoles["AvalId"] != DBNull.Value ? (int)rRoles["AvalId"] : 0;
                        }
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
                var cmd = new SqlCommand("UPDATE Microdisenos SET Estado = 'PendienteAval' WHERE Id = @id AND Estado IN ('Borrador', 'Rechazado')", conn);
                cmd.Parameters.AddWithValue("@id", id);
                if (cmd.ExecuteNonQuery() > 0) return Ok(new { Message = "Enviado a revisión de aval" });
                return BadRequest("No se pudo enviar.");
            }
        }

        // 3.5 Aprobar por Aval
        [HttpPost]
        [Route("{id}/aprobar-aval")]
        public IHttpActionResult AprobarAval(int id, [FromBody] RevisionMicrodisenoDTO dto)
        {
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand(@"
                    UPDATE Microdisenos 
                    SET Estado = 'PendienteJefe', RevisadoPor = @rev, ObservacionesRechazo = NULL
                    WHERE Id = @id AND Estado = 'PendienteAval'", conn);
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@rev", dto.RevisorNombre ?? "");
                
                if (cmd.ExecuteNonQuery() > 0) return Ok(new { Message = "Aprobado por aval" });
                return BadRequest("No se pudo aprobar.");
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
                    SET Estado = 'Aprobado', AprobadoPor = @rev, FechaAprobacion = GETDATE(), ObservacionesRechazo = NULL
                    WHERE Id = @id AND Estado = 'PendienteJefe'", conn);
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
                    WHERE Id = @id AND Estado IN ('PendienteAval', 'PendienteJefe')", conn);
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
                var cmd = new SqlCommand(@"
                    SELECT m.Id, m.CursoCodigo, m.Semestre, m.ElaboradoPor, m.FechaCreacion, m.Estado, c.Asignatura,
                           u1.nombre as CreadorNombre, u2.nombre as AvalNombre
                    FROM Microdisenos m
                    LEFT JOIN Cursos c ON LTRIM(RTRIM(m.CursoCodigo)) = LTRIM(RTRIM(c.Codigo))
                    LEFT JOIN MicrodisenoRoles r ON LTRIM(RTRIM(m.CursoCodigo)) = LTRIM(RTRIM(r.CursoCodigo))
                    LEFT JOIN Usuarios u1 ON r.CreadorId = u1.id_usuario
                    LEFT JOIN Usuarios u2 ON r.AvalId = u2.id_usuario
                    WHERE m.Estado = 'PendienteJefe' 
                    ORDER BY m.FechaCreacion DESC", conn);
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        list.Add(new MicrodisenoDTO
                        {
                            Id = (int)reader["Id"],
                            CursoCodigo = reader["CursoCodigo"].ToString(),
                            Asignatura = reader["Asignatura"]?.ToString(),
                            Semestre = reader["Semestre"].ToString(),
                            ElaboradoPor = reader["ElaboradoPor"]?.ToString(),
                            CreadorNombre = reader["CreadorNombre"]?.ToString(),
                            AvalNombre = reader["AvalNombre"]?.ToString(),
                            FechaCreacion = reader["FechaCreacion"] != DBNull.Value ? (DateTime)reader["FechaCreacion"] : DateTime.MinValue,
                            Estado = reader["Estado"].ToString()
                        });
                    }
                }
            }
            return Ok(list);
        }

        // 8. Endpoints de Roles
        [HttpGet]
        [Route("roles/docentes-materias")]
        public IHttpActionResult GetDocentesMaterias()
        {
            var list = new List<DocenteMateriaDTO>();
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand(@"
                    SELECT DISTINCT g.ProfesorId, u.nombre AS ProfesorNombre, g.CursoCodigo, c.Asignatura
                    FROM Grupos g
                    INNER JOIN Usuarios u ON g.ProfesorId = u.id_usuario
                    INNER JOIN Cursos c ON g.CursoCodigo = c.Codigo
                ", conn);
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        list.Add(new DocenteMateriaDTO {
                            ProfesorId = (int)reader["ProfesorId"],
                            ProfesorNombre = reader["ProfesorNombre"].ToString(),
                            CursoCodigo = reader["CursoCodigo"].ToString(),
                            Asignatura = reader["Asignatura"].ToString()
                        });
                    }
                }
            }
            return Ok(list);
        }

        [HttpPost]
        [Route("roles/asignar")]
        public IHttpActionResult AsignarRoles(MicrodisenoRolesDTO dto)
        {
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand(@"
                    IF EXISTS (SELECT * FROM MicrodisenoRoles WHERE CursoCodigo = @cc)
                        UPDATE MicrodisenoRoles SET CreadorId = @c, AvalId = @a WHERE CursoCodigo = @cc
                    ELSE
                        INSERT INTO MicrodisenoRoles (CursoCodigo, CreadorId, AvalId) VALUES (@cc, @c, @a)
                ", conn);
                cmd.Parameters.AddWithValue("@cc", dto.CursoCodigo);
                cmd.Parameters.AddWithValue("@c", dto.CreadorId);
                cmd.Parameters.AddWithValue("@a", dto.AvalId);
                cmd.ExecuteNonQuery();
                return Ok(new { success = true });
            }
        }

        [HttpGet]
        [Route("roles/{cursoCodigo}")]
        public IHttpActionResult GetRoles(string cursoCodigo)
        {
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand("SELECT CreadorId, AvalId FROM MicrodisenoRoles WHERE CursoCodigo = @cc", conn);
                cmd.Parameters.AddWithValue("@cc", cursoCodigo);
                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        return Ok(new { CreadorId = (int)reader["CreadorId"], AvalId = (int)reader["AvalId"] });
                    }
                }
            }
            return Ok(new { CreadorId = 0, AvalId = 0 });
        }

        // 9. Obtener Plantilla Base HTML
        [HttpGet]
        [Route("plantilla-base")]
        public IHttpActionResult GetPlantillaBase()
        {
            string path = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/plantilla_base.html");
            if (!File.Exists(path))
            {
                string dir = Path.GetDirectoryName(path);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.WriteAllText(path, WordTemplateHelper.DefaultTemplateHtml, Encoding.UTF8);
            }
            string html = File.ReadAllText(path, Encoding.UTF8);
            return Ok(new { html });
        }

        // 10. Exportar Plantilla Base a DOCX
        [HttpGet]
        [Route("plantilla-base/export")]
        public System.Net.Http.HttpResponseMessage ExportPlantillaBase()
        {
            string path = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/plantilla_base.html");
            if (!File.Exists(path))
            {
                string dir = Path.GetDirectoryName(path);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.WriteAllText(path, WordTemplateHelper.DefaultTemplateHtml, Encoding.UTF8);
            }
            string html = File.ReadAllText(path, Encoding.UTF8);

            var ms = new MemoryStream();
            WordTemplateHelper.ExportHtmlToDocx(html, ms);
            ms.Position = 0;

            var response = new System.Net.Http.HttpResponseMessage(System.Net.HttpStatusCode.OK);
            response.Content = new System.Net.Http.StreamContent(ms);
            response.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            response.Content.Headers.ContentDisposition = new System.Net.Http.Headers.ContentDispositionHeaderValue("attachment")
            {
                FileName = "plantilla_base.docx"
            };
            return response;
        }

        // 11. Importar Plantilla Base desde DOCX
        [HttpPost]
        [Route("plantilla-base/import")]
        public IHttpActionResult ImportPlantillaBase()
        {
            var request = System.Web.HttpContext.Current.Request;
            if (request.Files.Count == 0)
            {
                return BadRequest("No se subió ningún archivo.");
            }

            var file = request.Files[0];
            if (file.ContentLength == 0)
            {
                return BadRequest("El archivo está vacío.");
            }

            try
            {
                using (var stream = file.InputStream)
                {
                    string html = WordTemplateHelper.ImportDocxToHtml(stream);
                    
                    if (string.IsNullOrWhiteSpace(html))
                    {
                        return BadRequest("No se pudo extraer el contenido del documento Word.");
                    }

                    string path = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/plantilla_base.html");
                    string dir = Path.GetDirectoryName(path);
                    if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                    
                    File.WriteAllText(path, html, Encoding.UTF8);
                    
                    return Ok(new { Message = "Plantilla cargada y actualizada con éxito", html });
                }
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // 12. Restaurar Plantilla Base por Defecto
        [HttpPost]
        [Route("plantilla-base/reset")]
        public IHttpActionResult ResetPlantillaBase()
        {
            try
            {
                string path = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/plantilla_base.html");
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
                return Ok(new { Message = "Plantilla restaurada con éxito" });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }
}
