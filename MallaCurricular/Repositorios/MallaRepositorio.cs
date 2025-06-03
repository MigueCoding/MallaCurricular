using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Repositories
{
    public class MallaRepositorio : IMallaRepositorio
    {
        private readonly MallaDBEntities2 _db = new MallaDBEntities2();

        public IEnumerable<Malla> GetAll()
        {
            return _db.Mallas.ToList();
        }

        public Malla GetById(int id)
        {
            return _db.Mallas.FirstOrDefault(m => m.Id == id);
        }

        public Malla GetLatest()
        {
            return _db.Mallas.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
        }

        public void Add(Malla malla)
        {
            _db.Mallas.Add(malla);
            _db.SaveChanges();
        }
    }
}