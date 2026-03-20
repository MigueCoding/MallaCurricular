using MallaCurricular.Core.Domain.Interfaces;
using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;
using System.Linq;
using System.Data.Entity;

namespace MallaCurricular.Infrastructure.Repositories
{
    public class GruposRepositorio : IGruposRepositorio
    {
        private readonly MallaDBEntities _context;

        public GruposRepositorio(MallaDBEntities context)
        {
            _context = context;
        }

        public GruposRepositorio()
        {
            _context = new MallaDBEntities();
        }

        public IEnumerable<Grupos> GetAll()
        {
            return _context.Grupos
                .Include(g => g.Curso)
                .Include(g => g.Usuario) // Profesor
                .ToList();
        }

        public Grupos GetById(int id)
        {
            return _context.Grupos
                .Include(g => g.Curso)
                .Include(g => g.Usuario)
                .FirstOrDefault(g => g.Id == id);
        }

        public IEnumerable<Grupos> GetByProfesorId(int profesorId)
        {
            return _context.Grupos
                .Include(g => g.Curso)
                .Include(g => g.Usuario)
                .Where(g => g.ProfesorId == profesorId)
                .ToList();
        }

        public IEnumerable<Grupos> GetByCursoCodigo(string cursoCodigo)
        {
            return _context.Grupos
                .Include(g => g.Curso)
                .Include(g => g.Usuario)
                .Where(g => g.CursoCodigo == cursoCodigo)
                .ToList();
        }

        public void Add(Grupos grupo)
        {
            _context.Grupos.Add(grupo);
            _context.SaveChanges();
        }

        public void Update(Grupos grupo)
        {
            _context.Entry(grupo).State = EntityState.Modified;
            _context.SaveChanges();
        }

        public void Delete(Grupos grupo)
        {
            _context.Grupos.Remove(grupo);
            _context.SaveChanges();
        }
    }
}
