using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Repositories
{
    public class MallaCursoRepositorio : IMallaCursoRepositorio
    {
        private readonly MallaDBEntities4 _db = new MallaDBEntities4();

        public IEnumerable<MallaCurso> GetByMallaId(int mallaId)
        {
            return _db.MallaCursos.Where(mc => mc.MallaId == mallaId).ToList();
        }

        public void AddRange(IEnumerable<MallaCurso> mallaCursos)
        {
            _db.MallaCursos.AddRange(mallaCursos);
            _db.SaveChanges();
        }
    }
}