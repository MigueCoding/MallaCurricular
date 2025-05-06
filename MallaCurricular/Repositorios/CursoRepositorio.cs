using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Repositories
{
    public class CursoRepositorio : ICursoRepositorio
    {
        private readonly MallaDBEntities _db;

        public CursoRepositorio()
        {
            _db = new MallaDBEntities();
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