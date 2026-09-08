using System;
using System.Collections.Generic;

namespace MallaCurricular.Models
{
    // DTOs are deliberately independent from the EDMX model.  The RA module is
    // normalized in SQL and can evolve without regenerating the legacy EDMX.
    public class ProgramaRaStateDTO
    {
        public PerfilProgramaDTO Perfil { get; set; }
        public List<CompetenciaProgramaDTO> Competencias { get; set; }
        public ProgramaRaStateDTO() { Perfil = new PerfilProgramaDTO(); Competencias = new List<CompetenciaProgramaDTO>(); }
    }

    public class PerfilProgramaDTO
    {
        public int Id { get; set; }
        public string PerfilEgreso { get; set; }
        public string PerfilOcupacional { get; set; }
        public string TituloCompetencias { get; set; }
    }

    public class CompetenciaProgramaDTO
    {
        public int Id { get; set; }
        public string Codigo { get; set; }
        public string Descripcion { get; set; }
        public int Orden { get; set; }
        public List<ResultadoAprendizajeDTO> Resultados { get; set; }
        public CompetenciaProgramaDTO() { Resultados = new List<ResultadoAprendizajeDTO>(); }
    }

    public class ResultadoAprendizajeDTO
    {
        public int Id { get; set; }
        public int CompetenciaId { get; set; }
        public string Codigo { get; set; }
        public string Descripcion { get; set; }
        public int Orden { get; set; }
        public List<MomentoEvaluacionDTO> Momentos { get; set; }
        public ResultadoAprendizajeDTO() { Momentos = new List<MomentoEvaluacionDTO>(); }
    }

    public class MomentoEvaluacionDTO
    {
        public int Id { get; set; }
        public int ResultadoId { get; set; }
        public string Codigo { get; set; }
        public string Descripcion { get; set; }
        public int Orden { get; set; }
    }

    public class OrdenarDTO { public List<int> Ids { get; set; } public OrdenarDTO() { Ids = new List<int>(); } }
    public class RestaurarVersionDTO { public int Version { get; set; } }
}
