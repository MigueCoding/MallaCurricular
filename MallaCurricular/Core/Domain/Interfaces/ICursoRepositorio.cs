using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;

namespace MallaCurricular.Core.Domain.Interfaces
{
    public interface ICursoRepositorio
    {
        IEnumerable<Curso> GetAll();
        Curso GetById(string id);
        void Add(Curso curso);
        void Update(Curso curso);
        void Delete(Curso cursoExistente);
    }
}


