using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Repositories
{
    public class CursoRepositorio : ICursoRepositorio
    {
        private readonly MallaDBEntities2 _db;

        public CursoRepositorio()
        {
            _db = new MallaDBEntities2();
        }

        public IEnumerable<Curso> GetAll()
        {
            return _db.Cursos.ToList();
        }

        public Curso GetById(string id)
        {
            return _db.Cursos.FirstOrDefault(c => c.Codigo == id);
        }

        public void Add(Curso curso)
        {
            _db.Cursos.Add(curso);
            _db.SaveChanges();
        }
    }
}