using MallaCurricular.Models;
using System.Collections.Generic;

namespace MallaCurricular.Repositories
{
    public interface ICursoRepositorio
    {
        IEnumerable<Curso> GetAll();
        Curso GetById(string id);
        void Add(Curso curso);
    }
}