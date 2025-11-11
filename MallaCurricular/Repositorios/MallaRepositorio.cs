using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Repositories
{
    public class MallaRepositorio : IMallaRepositorio
    {
        // 1. Ahora es de solo lectura y recibe la instancia del contexto por inyección.
        private readonly MallaDBEntities4 _db;

        // 2. CONSTRUCTOR CORREGIDO: Acepta MallaDBEntities4 como argumento.
        public MallaRepositorio(MallaDBEntities4 dbContext)
        {
            _db = dbContext;
        }

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
            // Usar FirstOrDefault() después de OrderByDescending para obtener la última
            return _db.Mallas.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
        }

        public void Add(Malla malla)
        {
            _db.Mallas.Add(malla);
            _db.SaveChanges();
        }

        // Se recomienda también añadir los métodos Update y Delete si son necesarios para la interfaz IMallaRepositorio.
    }
}