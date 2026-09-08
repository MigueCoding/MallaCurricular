using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.Entity.Core.EntityClient;
using System.Data.SqlClient;
using System.Web.Http;
using System.IO;
using System.Text;
using System.Linq;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
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
                        mx.VisibleParaTodos = reader["VisibleParaTodos"] != DBNull.Value && (bool)reader["VisibleParaTodos"];
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
                var cmd = new SqlCommand("UPDATE Microdisenos SET Estado = 'PendienteAval', FechaEnvio = GETDATE() WHERE Id = @id AND Estado IN ('Borrador', 'Rechazado')", conn);
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
                    SET Estado = 'PendienteJefe', RevisadoPor = @rev, ObservacionesRechazo = NULL, FechaAval = GETDATE()
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
            // Generar texto de AprobadoPor a partir del Comité Curricular
            string aprobadoPor = dto.RevisorNombre ?? "";
            if (dto.ComiteNumero.HasValue && !string.IsNullOrEmpty(dto.ComiteFecha))
            {
                aprobadoPor = string.Format("Comité Curricular No. {0} de {1}", dto.ComiteNumero.Value, dto.ComiteFecha);
            }

            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand(@"
                    UPDATE Microdisenos 
                    SET Estado = 'Aprobado', AprobadoPor = @rev, FechaAprobacion = GETDATE(), ObservacionesRechazo = NULL, VisibleParaTodos = 0
                    WHERE Id = @id AND Estado = 'PendienteJefe'", conn);
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@rev", aprobadoPor);
                
                if (cmd.ExecuteNonQuery() > 0) return Ok(new { Message = "Aprobado" });
                return BadRequest("No se pudo aprobar.");
            }
        }

        // 4.5 Publicar (hacer visible para todos)
        [HttpPost]
        [Route("{id}/publicar")]
        public IHttpActionResult Publicar(int id)
        {
            using (var conn = new SqlConnection(GetConnectionString()))
            {
                conn.Open();
                var cmd = new SqlCommand(@"
                    UPDATE Microdisenos 
                    SET VisibleParaTodos = 1
                    WHERE Id = @id AND Estado = 'Aprobado'", conn);
                cmd.Parameters.AddWithValue("@id", id);
                
                if (cmd.ExecuteNonQuery() > 0) return Ok(new { Message = "Publicado exitosamente" });
                return BadRequest("No se pudo publicar. Asegúrese de que el microdiseño esté aprobado.");
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

                // Fetch current version and increment it
                string currentVersion = "1.0";
                var cmdGet = new SqlCommand("SELECT Version FROM Microdisenos WHERE Id = @id", conn);
                cmdGet.Parameters.AddWithValue("@id", id);
                var versionObj = cmdGet.ExecuteScalar();
                if (versionObj != null && versionObj != DBNull.Value)
                {
                    currentVersion = versionObj.ToString();
                }

                string newVersion = "2.0";
                if (currentVersion.Contains("."))
                {
                    var parts = currentVersion.Split('.');
                    if (int.TryParse(parts[0], out int major))
                    {
                        newVersion = (major + 1) + "." + (parts.Length > 1 ? parts[1] : "0");
                    }
                }
                else
                {
                    if (int.TryParse(currentVersion, out int major))
                    {
                        newVersion = (major + 1).ToString();
                    }
                }

                var cmd = new SqlCommand(@"
                    UPDATE Microdisenos 
                    SET Estado = 'Rechazado', RevisadoPor = @rev, ObservacionesRechazo = @obs, Version = @ver
                    WHERE Id = @id AND Estado IN ('PendienteAval', 'PendienteJefe')", conn);
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@rev", dto.RevisorNombre ?? "");
                cmd.Parameters.AddWithValue("@obs", dto.Observaciones);
                cmd.Parameters.AddWithValue("@ver", newVersion);
                
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
                var cmd = new SqlCommand("SELECT TOP 1 * FROM Microdisenos WHERE CursoCodigo = @c AND Estado = 'Aprobado' AND VisibleParaTodos = 1 ORDER BY FechaAprobacion DESC", conn);
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
                        mx.VisibleParaTodos = reader["VisibleParaTodos"] != DBNull.Value && (bool)reader["VisibleParaTodos"];
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
                           u1.nombre as CreadorNombre, u2.nombre as AvalNombre, m.AprobadoPor, m.VisibleParaTodos,
                           m.FechaEnvio, m.FechaAval
                    FROM Microdisenos m
                    LEFT JOIN Cursos c ON LTRIM(RTRIM(m.CursoCodigo)) = LTRIM(RTRIM(c.Codigo))
                    LEFT JOIN MicrodisenoRoles r ON LTRIM(RTRIM(m.CursoCodigo)) = LTRIM(RTRIM(r.CursoCodigo))
                    LEFT JOIN Usuarios u1 ON r.CreadorId = u1.id_usuario
                    LEFT JOIN Usuarios u2 ON r.AvalId = u2.id_usuario
                    WHERE m.Estado = 'PendienteJefe' OR (m.Estado = 'Aprobado' AND m.VisibleParaTodos = 0)
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
                            FechaEnvio = reader["FechaEnvio"] != DBNull.Value ? (DateTime)reader["FechaEnvio"] : (DateTime?)null,
                            FechaAval = reader["FechaAval"] != DBNull.Value ? (DateTime)reader["FechaAval"] : (DateTime?)null,
                            Estado = reader["Estado"].ToString(),
                            AprobadoPor = reader["AprobadoPor"]?.ToString(),
                            VisibleParaTodos = reader["VisibleParaTodos"] != DBNull.Value && (bool)reader["VisibleParaTodos"]
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

        // =============================================
        // PLANTILLA BASE - SISTEMA DE VERSIONES
        // =============================================

        private string GetVersionesFilePath()
        {
            return System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/plantilla_versiones.json");
        }

        private PlantillaVersionInfo LoadVersionInfo()
        {
            string path = GetVersionesFilePath();
            if (File.Exists(path))
            {
                string json = File.ReadAllText(path, Encoding.UTF8);
                return JsonConvert.DeserializeObject<PlantillaVersionInfo>(json) ?? new PlantillaVersionInfo();
            }
            // Inicializar con versión base 5
            var info = new PlantillaVersionInfo
            {
                VersionActual = 5,
                FechaVersionActual = "30-07-2024",
                ArchivoVersionActual = "plantilla_base_v5.docx",
                Historial = new List<PlantillaVersionEntry>()
            };
            SaveVersionInfo(info);
            return info;
        }

        private void SaveVersionInfo(PlantillaVersionInfo info)
        {
            string path = GetVersionesFilePath();
            string dir = Path.GetDirectoryName(path);
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            File.WriteAllText(path, JsonConvert.SerializeObject(info, Formatting.Indented), Encoding.UTF8);
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
            var versionInfo = LoadVersionInfo();
            return Ok(new { 
                html, 
                version = versionInfo.VersionActual, 
                fecha = versionInfo.FechaVersionActual,
                archivo = versionInfo.ArchivoVersionActual
            });
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

        // 11. Importar Plantilla Base desde DOCX (sube versión)
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
                    // Extract only the body content from the Word document
                    // (skips the header table with logo/version and the footer control table)
                    string bodyHtml = WordTemplateHelper.ImportDocxToHtml(stream);
                    
                    if (string.IsNullOrWhiteSpace(bodyHtml))
                    {
                        return BadRequest("No se pudo extraer el contenido del documento Word.");
                    }

                    string path = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/plantilla_base.html");
                    string dir = Path.GetDirectoryName(path);
                    if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                    
                    // Cargar info de versiones
                    var versionInfo = LoadVersionInfo();
                    
                    // Backup del HTML actual en PlantillaHistory con nombre de versión
                    if (File.Exists(path))
                    {
                        string historyDir = Path.Combine(dir, "PlantillaHistory");
                        if (!Directory.Exists(historyDir)) Directory.CreateDirectory(historyDir);
                        string backupFileName = "plantilla_v" + versionInfo.VersionActual + ".html";
                        string backupPath = Path.Combine(historyDir, backupFileName);
                        // Si ya existe un backup de esta versión, usa timestamp
                        if (File.Exists(backupPath))
                        {
                            backupFileName = "plantilla_v" + versionInfo.VersionActual + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".html";
                            backupPath = Path.Combine(historyDir, backupFileName);
                        }
                        File.Copy(path, backupPath);
                    }
                    
                    // Calcular nueva versión
                    int nuevaVersion = versionInfo.VersionActual + 1;
                    string fechaNueva = DateTime.Now.ToString("dd-MM-yyyy");
                    string nombreArchivo = file.FileName ?? "archivo_desconocido.docx";
                    
                    // Reconstruct the full HTML: canonical header + imported body + canonical footer
                    // This preserves the logo, rowspan, CSS classes, and full structure
                    string headerHtml = WordTemplateHelper.BuildHeaderHtml(nuevaVersion, fechaNueva);
                    string footerHtml = WordTemplateHelper.BuildFooterControlHtml();
                    string fullHtml = headerHtml + "\n" + bodyHtml + "\n" + footerHtml;
                    
                    // Escribir nuevo HTML completo
                    File.WriteAllText(path, fullHtml, Encoding.UTF8);
                    
                    // Guardar la versión actual en el historial antes de subir
                    string backupRef = "plantilla_v" + versionInfo.VersionActual + ".html";
                    // Verificar si el backup con timestamp fue creado
                    string histDirCheck = Path.Combine(dir, "PlantillaHistory");
                    if (!File.Exists(Path.Combine(histDirCheck, backupRef)))
                    {
                        // Buscar el archivo con timestamp
                        var matchFiles = Directory.GetFiles(histDirCheck, "plantilla_v" + versionInfo.VersionActual + "_*.html");
                        if (matchFiles.Length > 0)
                        {
                            backupRef = Path.GetFileName(matchFiles.Last());
                        }
                    }
                    
                    versionInfo.Historial.Add(new PlantillaVersionEntry
                    {
                        Version = versionInfo.VersionActual,
                        Fecha = versionInfo.FechaVersionActual,
                        ArchivoWord = versionInfo.ArchivoVersionActual,
                        ArchivoBackup = backupRef
                    });
                    
                    versionInfo.VersionActual = nuevaVersion;
                    versionInfo.FechaVersionActual = fechaNueva;
                    versionInfo.ArchivoVersionActual = nombreArchivo;
                    
                    SaveVersionInfo(versionInfo);
                    
                    return Ok(new { 
                        Message = "Plantilla cargada y actualizada con éxito", 
                        html = fullHtml, 
                        version = nuevaVersion, 
                        fecha = fechaNueva,
                        archivo = nombreArchivo
                    });
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

        // 13. Obtener Historial de Versiones de Plantilla
        [HttpGet]
        [Route("plantilla-base/history")]
        public IHttpActionResult GetPlantillaHistory()
        {
            try
            {
                var versionInfo = LoadVersionInfo();
                return Ok(new
                {
                    versionActual = versionInfo.VersionActual,
                    fechaActual = versionInfo.FechaVersionActual,
                    archivoActual = versionInfo.ArchivoVersionActual,
                    historial = versionInfo.Historial ?? new List<PlantillaVersionEntry>()
                });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // 14. Revertir a una versión anterior
        [HttpPost]
        [Route("plantilla-base/revertir")]
        public IHttpActionResult RevertirVersion([FromBody] JObject data)
        {
            try
            {
                int versionObjetivo = data["version"]?.Value<int>() ?? 0;
                if (versionObjetivo <= 0) return BadRequest("Versión inválida.");

                var versionInfo = LoadVersionInfo();

                // Buscar en historial la versión a restaurar
                var entradaHistorial = versionInfo.Historial
                    .FirstOrDefault(h => h.Version == versionObjetivo);

                if (entradaHistorial == null)
                    return BadRequest("No se encontró esa versión en el historial.");

                string dir = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
                string historyDir = Path.Combine(dir, "PlantillaHistory");
                string backupFile = Path.Combine(historyDir, entradaHistorial.ArchivoBackup);

                if (!File.Exists(backupFile))
                    return BadRequest("El archivo de respaldo de esa versión no existe.");

                string plantillaActualPath = Path.Combine(dir, "plantilla_base.html");

                // La versión actual pasa al historial
                if (File.Exists(plantillaActualPath))
                {
                    string backupActual = "plantilla_v" + versionInfo.VersionActual + ".html";
                    string backupActualPath = Path.Combine(historyDir, backupActual);
                    if (File.Exists(backupActualPath))
                    {
                        backupActual = "plantilla_v" + versionInfo.VersionActual + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".html";
                        backupActualPath = Path.Combine(historyDir, backupActual);
                    }
                    File.Copy(plantillaActualPath, backupActualPath);

                    // Agregar la versión actual al historial
                    versionInfo.Historial.Add(new PlantillaVersionEntry
                    {
                        Version = versionInfo.VersionActual,
                        Fecha = versionInfo.FechaVersionActual,
                        ArchivoWord = versionInfo.ArchivoVersionActual,
                        ArchivoBackup = backupActual
                    });
                }

                // Restaurar el archivo de la versión objetivo
                File.Copy(backupFile, plantillaActualPath, true);

                // Eliminar la entrada del historial que acabamos de restaurar
                versionInfo.Historial.Remove(entradaHistorial);

                // Actualizar la versión actual
                versionInfo.VersionActual = entradaHistorial.Version;
                versionInfo.FechaVersionActual = entradaHistorial.Fecha;
                versionInfo.ArchivoVersionActual = entradaHistorial.ArchivoWord;

                SaveVersionInfo(versionInfo);

                return Ok(new
                {
                    Message = $"Versión {versionObjetivo} restaurada exitosamente. La versión anterior fue enviada al historial.",
                    version = versionInfo.VersionActual,
                    fecha = versionInfo.FechaVersionActual
                });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
        // 15. Get Field Config for Plantilla Base cells
        [HttpGet]
        [Route("plantilla-base/field-config")]
        public IHttpActionResult GetFieldConfig()
        {
            try
            {
                string path = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/plantilla_field_config.json");
                if (!File.Exists(path))
                {
                    return Ok(new { fields = new object() });
                }
                string json = File.ReadAllText(path, Encoding.UTF8);
                var obj = JsonConvert.DeserializeObject<object>(json);
                return Ok(obj);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // 16. Save Field Config for Plantilla Base cells
        [HttpPost]
        [Route("plantilla-base/field-config")]
        public IHttpActionResult SaveFieldConfig([FromBody] JObject data)
        {
            try
            {
                string path = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/plantilla_field_config.json");
                string dir = Path.GetDirectoryName(path);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                
                string json = JsonConvert.SerializeObject(data, Formatting.Indented);
                File.WriteAllText(path, json, Encoding.UTF8);
                
                return Ok(new { Message = "Configuración de campos guardada con éxito" });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }

    // Clases para el manejo de versiones de plantilla
    public class PlantillaVersionInfo
    {
        public int VersionActual { get; set; }
        public string FechaVersionActual { get; set; }
        public string ArchivoVersionActual { get; set; }
        public List<PlantillaVersionEntry> Historial { get; set; } = new List<PlantillaVersionEntry>();
    }

    public class PlantillaVersionEntry
    {
        public int Version { get; set; }
        public string Fecha { get; set; }
        public string ArchivoWord { get; set; }
        public string ArchivoBackup { get; set; }
    }
}
