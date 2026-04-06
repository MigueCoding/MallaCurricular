using System;
using System.Collections.Generic;

namespace MallaCurricular.Models
{
    public class MicrodisenoDTO
    {
        public int Id { get; set; }
        public string CursoCodigo { get; set; }
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
        public string ContenidoJSON { get; set; }

    }

    public class RevisionMicrodisenoDTO
    {
        public string Observaciones { get; set; }
        public string RevisorNombre { get; set; }
    }
}
