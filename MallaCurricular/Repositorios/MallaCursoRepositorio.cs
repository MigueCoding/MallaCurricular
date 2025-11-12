using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Repositories
{
    public class MallaCursoRepositorio : IMallaCursoRepositorio
    {
        // 1. Ahora el campo es de solo lectura y recibe la instancia del contexto.
        private readonly MallaDBEntities4 _db;

        // 2. CONSTRUCTOR CORREGIDO: Acepta MallaDBEntities4 como argumento.
        public MallaCursoRepositorio(MallaDBEntities4 dbContext)
        {
            _db = dbContext;
        }

        public IEnumerable<MallaCurso> GetByMallaId(int mallaId)
        {
            return _db.MallaCursos.Where(mc => mc.MallaId == mallaId).ToList();
        }

        public void AddRange(IEnumerable<MallaCurso> mallaCursos)
        {
            _db.MallaCursos.AddRange(mallaCursos);
            _db.SaveChanges();
        }

        // Si tu interfaz IMallaCursoRepositorio define métodos CRUD individuales
        // (Add, Delete, Update), estos deberían implementarse aquí usando _db.
    }
}