using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;

namespace MallaCurricular.Core.Domain.Interfaces
{
    public interface IMallaCursoRepositorio
    {
        IEnumerable<MallaCurso> GetByMallaId(int mallaId);
        void AddRange(IEnumerable<MallaCurso> mallaCursos);
    }
}


