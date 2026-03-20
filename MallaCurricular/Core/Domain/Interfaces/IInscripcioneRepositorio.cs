using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;

namespace MallaCurricular.Core.Domain.Interfaces
{
    public interface IInscripcioneRepositorio
    {
        IEnumerable<Inscripcione> GetAll();
        Inscripcione GetById(int id);
        IEnumerable<Inscripcione> GetByGrupoId(int grupoId);
        IEnumerable<Inscripcione> GetByEstudianteId(int estudianteId);
        void Add(Inscripcione inscripcion);
        void Delete(Inscripcione inscripcion);
    }
}
