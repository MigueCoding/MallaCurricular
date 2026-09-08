using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.Entity.Core.EntityClient;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Http;
using Newtonsoft.Json;
using MallaCurricular.Models;

namespace MallaCurricular.Controllers
{
    [RoutePrefix("api/resultados-aprendizaje")]
    public class ResultadosAprendizajeController : ApiController
    {
        private const string ProgramaCodigo = "TEC_DESARROLLO_SOFTWARE";

        private string ConnectionString()
        {
            var ef = ConfigurationManager.ConnectionStrings["MallaDBEntities"].ConnectionString;
            return new EntityConnectionStringBuilder(ef).ProviderConnectionString;
        }

        // The login creates both Session and a server-signed Forms cookie.  The
        // latter is a reliable fallback for Web API requests when Session is not
        // materialized by the hosting pipeline.
        private bool CanEdit()
        {
            return AuthenticatedJefeId().HasValue;
        }

        private int? AuthenticatedJefeId()
        {
            var session = HttpContext.Current == null ? null : HttpContext.Current.Session;
            if (session != null && session["RolID"] != null && session["UsuarioID"] != null && Convert.ToInt32(session["RolID"]) == 1)
                return Convert.ToInt32(session["UsuarioID"]);

            var identity = HttpContext.Current == null || HttpContext.Current.User == null ? null : HttpContext.Current.User.Identity;
            if (identity == null || !identity.IsAuthenticated || string.IsNullOrWhiteSpace(identity.Name)) return null;

            using (var cn = new SqlConnection(ConnectionString()))
            {
                cn.Open();
                using (var cmd = new SqlCommand("SELECT id_usuario FROM Usuarios WHERE email=@email AND id_rol=1", cn))
                {
                    cmd.Parameters.AddWithValue("@email", identity.Name);
                    var value = cmd.ExecuteScalar();
                    return value == null || value == DBNull.Value ? (int?)null : Convert.ToInt32(value);
                }
            }
        }

        private int? CurrentUserId()
        {
            return AuthenticatedJefeId();
        }

        [HttpGet, Route("")]
        public IHttpActionResult GetPrograma()
        {
            try
            {
                using (var cn = new SqlConnection(ConnectionString()))
                {
                    cn.Open();
                    var state = ReadState(cn, null);
                    if (state == null) return BadRequest("El módulo RA no está inicializado. Ejecute MigracionResultadosAprendizaje.sql.");
                    return Ok(state);
                }
            }
            catch (SqlException ex) { return BadRequest("No se pudo leer el módulo RA. Verifique la migración: " + ex.Message); }
        }

        [HttpGet, Route("competencias")]
        public IHttpActionResult GetCompetencias()
        {
            var state = GetCurrentState();
            if (state == null) return BadRequest("El módulo RA no está inicializado. Ejecute MigracionResultadosAprendizaje.sql.");
            return Ok(state.Competencias);
        }

        [HttpGet, Route("competencias/{competenciaId:int}/resultados")]
        public IHttpActionResult GetResultados(int competenciaId)
        {
            var state = GetCurrentState();
            if (state == null) return BadRequest("El módulo RA no está inicializado. Ejecute MigracionResultadosAprendizaje.sql.");
            var competencia = state.Competencias.FirstOrDefault(c => c.Id == competenciaId);
            return competencia == null ? (IHttpActionResult)NotFound() : Ok(competencia.Resultados);
        }

        [HttpGet, Route("resultados/{resultadoId:int}/momentos")]
        public IHttpActionResult GetMomentos(int resultadoId)
        {
            var state = GetCurrentState();
            if (state == null) return BadRequest("El módulo RA no está inicializado. Ejecute MigracionResultadosAprendizaje.sql.");
            var result = state.Competencias.SelectMany(c => c.Resultados).FirstOrDefault(r => r.Id == resultadoId);
            return result == null ? (IHttpActionResult)NotFound() : Ok(result.Momentos);
        }

        [HttpPut, Route("perfil")]
        public IHttpActionResult UpdatePerfil(PerfilProgramaDTO input)
        {
            if (!CanEdit()) return Unauthorized();
            if (input == null || !ValidText(input.PerfilEgreso, 8000) || !ValidText(input.PerfilOcupacional, 16000) || !ValidText(input.TituloCompetencias, 500))
                return BadRequest("Perfil de egreso, ocupacional y título son obligatorios y exceden la longitud permitida.");
            return Change("Actualización de perfiles y título", (cn, tx, programId) =>
            {
                Execute(cn, tx, "UPDATE RA_Programa SET PerfilEgreso=@e, PerfilOcupacional=@o, TituloCompetencias=@t, ActualizadoEn=GETDATE() WHERE Id=@id",
                    P("@e", input.PerfilEgreso.Trim()), P("@o", input.PerfilOcupacional.Trim()), P("@t", input.TituloCompetencias.Trim()), P("@id", programId));
            });
        }

        [HttpPost, Route("competencias")]
        public IHttpActionResult CreateCompetencia(CompetenciaProgramaDTO input)
        {
            if (!CanEdit()) return Unauthorized();
            if (!ValidItem(input)) return BadRequest("Código y descripción son obligatorios (código máximo 50, descripción máxima 8000). ");
            return Change("Creación de competencia", (cn, tx, programId) =>
            {
                var order = input.Orden > 0 ? input.Orden : NextOrder(cn, tx, "RA_Competencia", "ProgramaId", programId);
                Execute(cn, tx, "INSERT INTO RA_Competencia(ProgramaId,Codigo,Descripcion,Orden,Activo) VALUES(@p,@c,@d,@o,1)", P("@p", programId), P("@c", input.Codigo.Trim()), P("@d", input.Descripcion.Trim()), P("@o", order));
            });
        }

        [HttpPut, Route("competencias/{id:int}")]
        public IHttpActionResult UpdateCompetencia(int id, CompetenciaProgramaDTO input)
        {
            if (!CanEdit()) return Unauthorized();
            if (id <= 0 || !ValidItem(input)) return BadRequest("Datos de competencia inválidos.");
            return Change("Edición de competencia", (cn, tx, programId) =>
            {
                AssertOwned(cn, tx, "RA_Competencia", id, "ProgramaId", programId);
                Execute(cn, tx, "UPDATE RA_Competencia SET Codigo=@c,Descripcion=@d,Orden=@o,ActualizadoEn=GETDATE() WHERE Id=@id", P("@c", input.Codigo.Trim()), P("@d", input.Descripcion.Trim()), P("@o", Math.Max(1, input.Orden)), P("@id", id));
            });
        }

        [HttpDelete, Route("competencias/{id:int}")]
        public IHttpActionResult DeleteCompetencia(int id)
        {
            if (!CanEdit()) return Unauthorized();
            return Change("Desactivación de competencia", (cn, tx, programId) =>
            {
                AssertOwned(cn, tx, "RA_Competencia", id, "ProgramaId", programId);
                Execute(cn, tx, "UPDATE RA_Momento SET Activo=0,ActualizadoEn=GETDATE() WHERE ResultadoId IN (SELECT Id FROM RA_Resultado WHERE CompetenciaId=@id)", P("@id", id));
                Execute(cn, tx, "UPDATE RA_Resultado SET Activo=0,ActualizadoEn=GETDATE() WHERE CompetenciaId=@id", P("@id", id));
                Execute(cn, tx, "UPDATE RA_Competencia SET Activo=0,ActualizadoEn=GETDATE() WHERE Id=@id", P("@id", id));
            });
        }

        [HttpPost, Route("resultados")]
        public IHttpActionResult CreateResultado(ResultadoAprendizajeDTO input)
        {
            if (!CanEdit()) return Unauthorized();
            if (input == null || input.CompetenciaId <= 0 || !ValidItem(input)) return BadRequest("Datos de RA inválidos.");
            return Change("Creación de resultado de aprendizaje", (cn, tx, programId) =>
            {
                AssertOwned(cn, tx, "RA_Competencia", input.CompetenciaId, "ProgramaId", programId);
                var order = input.Orden > 0 ? input.Orden : NextOrder(cn, tx, "RA_Resultado", "CompetenciaId", input.CompetenciaId);
                Execute(cn, tx, "INSERT INTO RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden,Activo) VALUES(@c,@co,@d,@o,1)", P("@c", input.CompetenciaId), P("@co", input.Codigo.Trim()), P("@d", input.Descripcion.Trim()), P("@o", order));
            });
        }

        [HttpPut, Route("resultados/{id:int}")]
        public IHttpActionResult UpdateResultado(int id, ResultadoAprendizajeDTO input)
        {
            if (!CanEdit()) return Unauthorized();
            if (id <= 0 || input == null || input.CompetenciaId <= 0 || !ValidItem(input)) return BadRequest("Datos de RA inválidos.");
            return Change("Edición de resultado de aprendizaje", (cn, tx, programId) =>
            {
                AssertOwned(cn, tx, "RA_Competencia", input.CompetenciaId, "ProgramaId", programId);
                AssertResultOwned(cn, tx, id, programId);
                Execute(cn, tx, "UPDATE RA_Resultado SET CompetenciaId=@c,Codigo=@co,Descripcion=@d,Orden=@o,ActualizadoEn=GETDATE() WHERE Id=@id", P("@c", input.CompetenciaId), P("@co", input.Codigo.Trim()), P("@d", input.Descripcion.Trim()), P("@o", Math.Max(1, input.Orden)), P("@id", id));
            });
        }

        [HttpDelete, Route("resultados/{id:int}")]
        public IHttpActionResult DeleteResultado(int id)
        {
            if (!CanEdit()) return Unauthorized();
            return Change("Desactivación de resultado de aprendizaje", (cn, tx, programId) =>
            {
                AssertResultOwned(cn, tx, id, programId);
                Execute(cn, tx, "UPDATE RA_Momento SET Activo=0,ActualizadoEn=GETDATE() WHERE ResultadoId=@id", P("@id", id));
                Execute(cn, tx, "UPDATE RA_Resultado SET Activo=0,ActualizadoEn=GETDATE() WHERE Id=@id", P("@id", id));
            });
        }

        [HttpPost, Route("momentos")]
        public IHttpActionResult CreateMomento(MomentoEvaluacionDTO input)
        {
            if (!CanEdit()) return Unauthorized();
            if (input == null || input.ResultadoId <= 0 || !ValidItem(input)) return BadRequest("Datos de momento inválidos.");
            return Change("Creación de momento de evaluación", (cn, tx, programId) =>
            {
                AssertResultOwned(cn, tx, input.ResultadoId, programId);
                var order = input.Orden > 0 ? input.Orden : NextOrder(cn, tx, "RA_Momento", "ResultadoId", input.ResultadoId);
                Execute(cn, tx, "INSERT INTO RA_Momento(ResultadoId,Codigo,Descripcion,Orden,Activo) VALUES(@r,@c,@d,@o,1)", P("@r", input.ResultadoId), P("@c", input.Codigo.Trim()), P("@d", input.Descripcion.Trim()), P("@o", order));
            });
        }

        [HttpPut, Route("momentos/{id:int}")]
        public IHttpActionResult UpdateMomento(int id, MomentoEvaluacionDTO input)
        {
            if (!CanEdit()) return Unauthorized();
            if (id <= 0 || input == null || input.ResultadoId <= 0 || !ValidItem(input)) return BadRequest("Datos de momento inválidos.");
            return Change("Edición de momento de evaluación", (cn, tx, programId) =>
            {
                AssertResultOwned(cn, tx, input.ResultadoId, programId);
                AssertMomentoOwned(cn, tx, id, programId);
                Execute(cn, tx, "UPDATE RA_Momento SET ResultadoId=@r,Codigo=@c,Descripcion=@d,Orden=@o,ActualizadoEn=GETDATE() WHERE Id=@id", P("@r", input.ResultadoId), P("@c", input.Codigo.Trim()), P("@d", input.Descripcion.Trim()), P("@o", Math.Max(1, input.Orden)), P("@id", id));
            });
        }

        [HttpDelete, Route("momentos/{id:int}")]
        public IHttpActionResult DeleteMomento(int id)
        {
            if (!CanEdit()) return Unauthorized();
            return Change("Desactivación de momento de evaluación", (cn, tx, programId) => { AssertMomentoOwned(cn, tx, id, programId); Execute(cn, tx, "UPDATE RA_Momento SET Activo=0,ActualizadoEn=GETDATE() WHERE Id=@id", P("@id", id)); });
        }

        [HttpPut, Route("competencias/orden")]
        public IHttpActionResult OrderCompetencias(OrdenarDTO body) { return Reorder(body, "RA_Competencia", "ProgramaId", 0, "Reordenamiento de competencias"); }
        [HttpPut, Route("resultados/{competenciaId:int}/orden")]
        public IHttpActionResult OrderResultados(int competenciaId, OrdenarDTO body) { return Reorder(body, "RA_Resultado", "CompetenciaId", competenciaId, "Reordenamiento de resultados"); }
        [HttpPut, Route("momentos/{resultadoId:int}/orden")]
        public IHttpActionResult OrderMomentos(int resultadoId, OrdenarDTO body) { return Reorder(body, "RA_Momento", "ResultadoId", resultadoId, "Reordenamiento de momentos"); }

        [HttpGet, Route("historial")]
        public IHttpActionResult History()
        {
            try { using (var cn = new SqlConnection(ConnectionString())) { cn.Open(); var cmd = new SqlCommand("SELECT Version,FechaCambio,UsuarioId,Accion,VersionOrigen FROM RA_Version WHERE ProgramaId=(SELECT Id FROM RA_Programa WHERE Codigo=@c) ORDER BY Version DESC", cn); cmd.Parameters.AddWithValue("@c", ProgramaCodigo); var rows = new List<object>(); using (var r = cmd.ExecuteReader()) while (r.Read()) rows.Add(new { version = r.GetInt32(0), fecha = r.GetDateTime(1), usuarioId = r.IsDBNull(2) ? (int?)null : r.GetInt32(2), accion = r.GetString(3), versionOrigen = r.IsDBNull(4) ? (int?)null : r.GetInt32(4) }); return Ok(rows); } }
            catch (SqlException ex) { return BadRequest("No se pudo leer historial: " + ex.Message); }
        }

        [HttpGet, Route("historial/{version:int}")]
        public IHttpActionResult GetVersion(int version)
        {
            try { using (var cn = new SqlConnection(ConnectionString())) { cn.Open(); var cmd = new SqlCommand("SELECT SnapshotJson FROM RA_Version WHERE ProgramaId=(SELECT Id FROM RA_Programa WHERE Codigo=@c) AND Version=@v", cn); cmd.Parameters.AddWithValue("@c", ProgramaCodigo); cmd.Parameters.AddWithValue("@v", version); var json = cmd.ExecuteScalar() as string; if (json == null) return NotFound(); return Ok(JsonConvert.DeserializeObject<ProgramaRaStateDTO>(json)); } }
            catch (SqlException ex) { return BadRequest("No se pudo consultar versión: " + ex.Message); }
        }

        [HttpPost, Route("historial/{version:int}/restaurar")]
        public IHttpActionResult Restore(int version)
        {
            if (!CanEdit()) return Unauthorized();
            try
            {
                using (var cn = new SqlConnection(ConnectionString()))
                {
                    cn.Open(); using (var tx = cn.BeginTransaction())
                    {
                        var programId = ProgramId(cn, tx);
                        var cmd = new SqlCommand("SELECT SnapshotJson FROM RA_Version WHERE ProgramaId=@p AND Version=@v", cn, tx); cmd.Parameters.AddWithValue("@p", programId); cmd.Parameters.AddWithValue("@v", version);
                        var json = cmd.ExecuteScalar() as string; if (json == null) return NotFound();
                        var snapshot = JsonConvert.DeserializeObject<ProgramaRaStateDTO>(json);
                        Execute(cn, tx, "UPDATE RA_Momento SET Activo=0 WHERE ResultadoId IN (SELECT r.Id FROM RA_Resultado r INNER JOIN RA_Competencia c ON c.Id=r.CompetenciaId WHERE c.ProgramaId=@p)", P("@p", programId));
                        Execute(cn, tx, "UPDATE RA_Resultado SET Activo=0 WHERE CompetenciaId IN (SELECT Id FROM RA_Competencia WHERE ProgramaId=@p)", P("@p", programId));
                        Execute(cn, tx, "UPDATE RA_Competencia SET Activo=0 WHERE ProgramaId=@p", P("@p", programId));
                        Execute(cn, tx, "UPDATE RA_Programa SET PerfilEgreso=@e,PerfilOcupacional=@o,TituloCompetencias=@t,ActualizadoEn=GETDATE() WHERE Id=@p", P("@e", snapshot.Perfil.PerfilEgreso), P("@o", snapshot.Perfil.PerfilOcupacional), P("@t", snapshot.Perfil.TituloCompetencias), P("@p", programId));
                        var compMap = new Dictionary<int, int>(); var resultMap = new Dictionary<int, int>();
                        foreach (var c in snapshot.Competencias) { var id = InsertId(cn, tx, "INSERT INTO RA_Competencia(ProgramaId,Codigo,Descripcion,Orden,Activo) OUTPUT INSERTED.Id VALUES(@p,@c,@d,@o,1)", P("@p", programId), P("@c", c.Codigo), P("@d", c.Descripcion), P("@o", c.Orden)); compMap[c.Id] = id; }
                        foreach (var c in snapshot.Competencias) foreach (var r in c.Resultados) { var id = InsertId(cn, tx, "INSERT INTO RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden,Activo) OUTPUT INSERTED.Id VALUES(@p,@c,@d,@o,1)", P("@p", compMap[c.Id]), P("@c", r.Codigo), P("@d", r.Descripcion), P("@o", r.Orden)); resultMap[r.Id] = id; }
                        foreach (var c in snapshot.Competencias) foreach (var r in c.Resultados) foreach (var m in r.Momentos) InsertId(cn, tx, "INSERT INTO RA_Momento(ResultadoId,Codigo,Descripcion,Orden,Activo) OUTPUT INSERTED.Id VALUES(@p,@c,@d,@o,1)", P("@p", resultMap[r.Id]), P("@c", m.Codigo), P("@d", m.Descripcion), P("@o", m.Orden));
                        WriteVersion(cn, tx, programId, "Restauración de versión " + version, version); tx.Commit(); return Ok(new { message = "Versión restaurada como una nueva versión.", versionOrigen = version });
                    }
                }
            }
            catch (Exception ex) { return BadRequest("No se pudo restaurar: " + ex.Message); }
        }

        private IHttpActionResult Reorder(OrdenarDTO body, string table, string parentColumn, int parentId, string action)
        {
            if (!CanEdit()) return Unauthorized();
            if (body == null || body.Ids == null || body.Ids.Count == 0 || body.Ids.Distinct().Count() != body.Ids.Count || body.Ids.Any(id => id <= 0)) return BadRequest("El orden enviado no es válido.");
            return Change(action, (cn, tx, programId) =>
            {
                if (parentId > 0)
                {
                    if (table == "RA_Resultado") AssertOwned(cn, tx, "RA_Competencia", parentId, "ProgramaId", programId); else AssertResultOwned(cn, tx, parentId, programId);
                }
                var expected = new List<int>(); var sql = parentId == 0 ? "SELECT Id FROM RA_Competencia WHERE ProgramaId=@p AND Activo=1" : "SELECT Id FROM " + table + " WHERE " + parentColumn + "=@p AND Activo=1";
                using (var cmd = new SqlCommand(sql, cn, tx)) { cmd.Parameters.AddWithValue("@p", parentId == 0 ? programId : parentId); using (var rd = cmd.ExecuteReader()) while (rd.Read()) expected.Add(rd.GetInt32(0)); }
                if (!expected.OrderBy(x => x).SequenceEqual(body.Ids.OrderBy(x => x))) throw new InvalidOperationException("La lista debe contener exactamente los elementos activos del grupo.");
                for (int i = 0; i < body.Ids.Count; i++) Execute(cn, tx, "UPDATE " + table + " SET Orden=@o,ActualizadoEn=GETDATE() WHERE Id=@id", P("@o", i + 1), P("@id", body.Ids[i]));
            });
        }

        private IHttpActionResult Change(string action, Action<SqlConnection, SqlTransaction, int> work)
        {
            try { using (var cn = new SqlConnection(ConnectionString())) { cn.Open(); using (var tx = cn.BeginTransaction()) { var id = ProgramId(cn, tx); EnsureFirstVersion(cn, tx, id); work(cn, tx, id); WriteVersion(cn, tx, id, action, null); tx.Commit(); return Ok(ReadState(cn, null)); } } }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
            catch (SqlException ex) { return BadRequest("No se pudo guardar. Verifique códigos duplicados e integridad: " + ex.Message); }
        }

        private ProgramaRaStateDTO GetCurrentState()
        {
            try { using (var cn = new SqlConnection(ConnectionString())) { cn.Open(); return ReadState(cn, null); } }
            catch (SqlException) { return null; }
        }

        private ProgramaRaStateDTO ReadState(SqlConnection cn, SqlTransaction tx)
        {
            var state = new ProgramaRaStateDTO(); int programId;
            using (var cmd = new SqlCommand("SELECT Id,PerfilEgreso,PerfilOcupacional,TituloCompetencias FROM RA_Programa WHERE Codigo=@c AND Activo=1", cn, tx)) { cmd.Parameters.AddWithValue("@c", ProgramaCodigo); using (var r = cmd.ExecuteReader()) { if (!r.Read()) return null; programId = r.GetInt32(0); state.Perfil = new PerfilProgramaDTO { Id = programId, PerfilEgreso = r.GetString(1), PerfilOcupacional = r.GetString(2), TituloCompetencias = r.GetString(3) }; } }
            var comps = new Dictionary<int, CompetenciaProgramaDTO>(); var results = new Dictionary<int, ResultadoAprendizajeDTO>();
            using (var cmd = new SqlCommand("SELECT Id,Codigo,Descripcion,Orden FROM RA_Competencia WHERE ProgramaId=@p AND Activo=1 ORDER BY Orden,Id", cn, tx)) { cmd.Parameters.AddWithValue("@p", programId); using (var r = cmd.ExecuteReader()) while (r.Read()) { var c = new CompetenciaProgramaDTO { Id = r.GetInt32(0), Codigo = r.GetString(1), Descripcion = r.GetString(2), Orden = r.GetInt32(3) }; comps[c.Id] = c; state.Competencias.Add(c); } }
            using (var cmd = new SqlCommand("SELECT r.Id,r.CompetenciaId,r.Codigo,r.Descripcion,r.Orden FROM RA_Resultado r INNER JOIN RA_Competencia c ON c.Id=r.CompetenciaId WHERE c.ProgramaId=@p AND r.Activo=1 AND c.Activo=1 ORDER BY r.Orden,r.Id", cn, tx)) { cmd.Parameters.AddWithValue("@p", programId); using (var r = cmd.ExecuteReader()) while (r.Read()) { var x = new ResultadoAprendizajeDTO { Id = r.GetInt32(0), CompetenciaId = r.GetInt32(1), Codigo = r.GetString(2), Descripcion = r.GetString(3), Orden = r.GetInt32(4) }; results[x.Id] = x; comps[x.CompetenciaId].Resultados.Add(x); } }
            using (var cmd = new SqlCommand("SELECT m.Id,m.ResultadoId,m.Codigo,m.Descripcion,m.Orden FROM RA_Momento m INNER JOIN RA_Resultado r ON r.Id=m.ResultadoId INNER JOIN RA_Competencia c ON c.Id=r.CompetenciaId WHERE c.ProgramaId=@p AND m.Activo=1 AND r.Activo=1 AND c.Activo=1 ORDER BY m.Orden,m.Id", cn, tx)) { cmd.Parameters.AddWithValue("@p", programId); using (var r = cmd.ExecuteReader()) while (r.Read()) results[r.GetInt32(1)].Momentos.Add(new MomentoEvaluacionDTO { Id = r.GetInt32(0), ResultadoId = r.GetInt32(1), Codigo = r.GetString(2), Descripcion = r.GetString(3), Orden = r.GetInt32(4) }); }
            return state;
        }

        private int ProgramId(SqlConnection cn, SqlTransaction tx) { var cmd = new SqlCommand("SELECT Id FROM RA_Programa WHERE Codigo=@c AND Activo=1", cn, tx); cmd.Parameters.AddWithValue("@c", ProgramaCodigo); var value = cmd.ExecuteScalar(); if (value == null) throw new InvalidOperationException("El programa no existe; ejecute MigracionResultadosAprendizaje.sql."); return Convert.ToInt32(value); }
        private void EnsureFirstVersion(SqlConnection cn, SqlTransaction tx, int programId) { var cmd = new SqlCommand("SELECT COUNT(1) FROM RA_Version WHERE ProgramaId=@p", cn, tx); cmd.Parameters.AddWithValue("@p", programId); if (Convert.ToInt32(cmd.ExecuteScalar()) == 0) WriteVersion(cn, tx, programId, "Estado inicial", null); }
        private void WriteVersion(SqlConnection cn, SqlTransaction tx, int programId, string action, int? source) { var snapshot = JsonConvert.SerializeObject(ReadState(cn, tx)); Execute(cn, tx, "INSERT INTO RA_Version(ProgramaId,Version,FechaCambio,UsuarioId,Accion,VersionOrigen,SnapshotJson) VALUES(@p,(SELECT ISNULL(MAX(Version),0)+1 FROM RA_Version WHERE ProgramaId=@p),GETDATE(),@u,@a,@s,@j)", P("@p", programId), P("@u", (object)CurrentUserId() ?? DBNull.Value), P("@a", action), P("@s", (object)source ?? DBNull.Value), P("@j", snapshot)); }
        private static bool ValidText(string text, int max) { return !string.IsNullOrWhiteSpace(text) && text.Trim().Length <= max; }
        private static bool ValidItem(CompetenciaProgramaDTO x) { return x != null && ValidText(x.Codigo, 50) && ValidText(x.Descripcion, 8000); }
        private static bool ValidItem(ResultadoAprendizajeDTO x) { return x != null && ValidText(x.Codigo, 50) && ValidText(x.Descripcion, 8000); }
        private static bool ValidItem(MomentoEvaluacionDTO x) { return x != null && ValidText(x.Codigo, 50) && ValidText(x.Descripcion, 8000); }
        private static int NextOrder(SqlConnection cn, SqlTransaction tx, string table, string parentColumn, int parentId) { var cmd = new SqlCommand("SELECT ISNULL(MAX(Orden),0)+1 FROM " + table + " WHERE " + parentColumn + "=@p AND Activo=1", cn, tx); cmd.Parameters.AddWithValue("@p", parentId); return Convert.ToInt32(cmd.ExecuteScalar()); }
        private static SqlParameter P(string name, object value) { return new SqlParameter(name, value ?? DBNull.Value); }
        private static int Execute(SqlConnection cn, SqlTransaction tx, string sql, params SqlParameter[] ps) { using (var cmd = new SqlCommand(sql, cn, tx)) { cmd.Parameters.AddRange(ps); return cmd.ExecuteNonQuery(); } }
        private static int InsertId(SqlConnection cn, SqlTransaction tx, string sql, params SqlParameter[] ps) { using (var cmd = new SqlCommand(sql, cn, tx)) { cmd.Parameters.AddRange(ps); return Convert.ToInt32(cmd.ExecuteScalar()); } }
        private static void AssertOwned(SqlConnection cn, SqlTransaction tx, string table, int id, string parentColumn, int parentId) { var cmd = new SqlCommand("SELECT COUNT(1) FROM " + table + " WHERE Id=@id AND " + parentColumn + "=@p AND Activo=1", cn, tx); cmd.Parameters.AddWithValue("@id", id); cmd.Parameters.AddWithValue("@p", parentId); if (Convert.ToInt32(cmd.ExecuteScalar()) != 1) throw new InvalidOperationException("El elemento no existe o no pertenece al programa."); }
        private static void AssertResultOwned(SqlConnection cn, SqlTransaction tx, int id, int programId) { var cmd = new SqlCommand("SELECT COUNT(1) FROM RA_Resultado r INNER JOIN RA_Competencia c ON c.Id=r.CompetenciaId WHERE r.Id=@id AND c.ProgramaId=@p AND r.Activo=1 AND c.Activo=1", cn, tx); cmd.Parameters.AddWithValue("@id", id); cmd.Parameters.AddWithValue("@p", programId); if (Convert.ToInt32(cmd.ExecuteScalar()) != 1) throw new InvalidOperationException("El RA no existe o no pertenece al programa."); }
        private static void AssertMomentoOwned(SqlConnection cn, SqlTransaction tx, int id, int programId) { var cmd = new SqlCommand("SELECT COUNT(1) FROM RA_Momento m INNER JOIN RA_Resultado r ON r.Id=m.ResultadoId INNER JOIN RA_Competencia c ON c.Id=r.CompetenciaId WHERE m.Id=@id AND c.ProgramaId=@p AND m.Activo=1 AND r.Activo=1 AND c.Activo=1", cn, tx); cmd.Parameters.AddWithValue("@id", id); cmd.Parameters.AddWithValue("@p", programId); if (Convert.ToInt32(cmd.ExecuteScalar()) != 1) throw new InvalidOperationException("El momento no existe o no pertenece al programa."); }
    }
}
