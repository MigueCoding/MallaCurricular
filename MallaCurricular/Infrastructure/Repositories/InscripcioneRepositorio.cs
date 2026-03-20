using MallaCurricular.Core.Domain.Interfaces;
using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;
using System.Linq;
using System.Data.Entity;

namespace MallaCurricular.Infrastructure.Repositories
{
    public class InscripcioneRepositorio : IInscripcioneRepositorio
    {
        private readonly MallaDBEntities _context;

        public InscripcioneRepositorio(MallaDBEntities context)
        {
            _context = context;
        }

        public InscripcioneRepositorio()
        {
            _context = new MallaDBEntities();
        }

        public IEnumerable<Inscripcione> GetAll()
        {
            return _context.Inscripciones
                .Include(i => i.Grupos)
                .Include(i => i.Usuario)
                .ToList();
        }

        public Inscripcione GetById(int id)
        {
            return _context.Inscripciones
                .Include(i => i.Grupos)
                .Include(i => i.Usuario)
                .FirstOrDefault(i => i.Id == id);
        }

        public IEnumerable<Inscripcione> GetByGrupoId(int grupoId)
        {
            return _context.Inscripciones
                .Include(i => i.Grupos)
                .Include(i => i.Usuario)
                .Where(i => i.GrupoId == grupoId)
                .ToList();
        }

        public IEnumerable<Inscripcione> GetByEstudianteId(int estudianteId)
        {
            return _context.Inscripciones
                .Include(i => i.Grupos)
                .Include(i => i.Grupos.Curso)   // Para poder mostrar el curso al estudiante
                .Include(i => i.Usuario)
                .Where(i => i.EstudianteId == estudianteId)
                .ToList();
        }

        public void Add(Inscripcione inscripcion)
        {
            _context.Inscripciones.Add(inscripcion);
            _context.SaveChanges();
        }

        public void Delete(Inscripcione inscripcion)
        {
            _context.Inscripciones.Remove(inscripcion);
            _context.SaveChanges();
        }
    }
}
