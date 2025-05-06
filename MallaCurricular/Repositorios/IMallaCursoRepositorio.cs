using MallaCurricular.Models;
using System.Collections.Generic;

namespace MallaCurricular.Repositories
{
    public interface IMallaCursoRepositorio
    {
        IEnumerable<MallaCurso> GetByMallaId(int mallaId);
        void AddRange(IEnumerable<MallaCurso> mallaCursos);
    }
}