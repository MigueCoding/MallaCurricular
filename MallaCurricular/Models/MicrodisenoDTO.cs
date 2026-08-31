using System;
using System.Collections.Generic;

namespace MallaCurricular.Models
{
    public class MicrodisenoDTO
    {
        public int Id { get; set; }
        public string CursoCodigo { get; set; }
        public string Asignatura { get; set; }
        public string Semestre { get; set; }
        public string Facultad { get; set; }
        public string Modalidad { get; set; }
        public string TipoCredito { get; set; }
        public string TipoAsignatura { get; set; }
        public string Version { get; set; }
        public string Estado { get; set; }
        public string ObservacionesRechazo { get; set; }
        public string ElaboradoPor { get; set; }
        public string RevisadoPor { get; set; }
        public string AprobadoPor { get; set; }
        public DateTime? FechaCreacion { get; set; }
        public DateTime? FechaAprobacion { get; set; }
        public DateTime? FechaEnvio { get; set; }
        public DateTime? FechaAval { get; set; }
        public string ContenidoJSON { get; set; }
        public bool VisibleParaTodos { get; set; }
        
        public int? CreadorId { get; set; }
        public string CreadorNombre { get; set; }
        public int? AvalId { get; set; }
        public string AvalNombre { get; set; }
    }

    public class RevisionMicrodisenoDTO
    {
        public string Observaciones { get; set; }
        public string RevisorNombre { get; set; }
        public int? ComiteNumero { get; set; }
        public string ComiteFecha { get; set; }
    }

    public class MicrodisenoRolesDTO
    {
        public string CursoCodigo { get; set; }
        public int CreadorId { get; set; }
        public int AvalId { get; set; }
    }

    public class DocenteMateriaDTO
    {
        public int ProfesorId { get; set; }
        public string ProfesorNombre { get; set; }
        public string CursoCodigo { get; set; }
        public string Asignatura { get; set; }
    }
}
