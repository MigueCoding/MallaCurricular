using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;
using System.Data.Entity; // Necesario para usar .Include()

namespace MallaCurricular.Repositories
{
    public class CursoRepositorio : ICursoRepositorio
    {
        private readonly MallaDBEntities4 _db;

        public CursoRepositorio(MallaDBEntities4 dbContext)
        {
            _db = new MallaDBEntities4();
        }

        /// <summary>
        /// Obtiene todos los cursos, cargando explícitamente la colección de prerequisitos.
        /// </summary>
        public IEnumerable<Curso> GetAll()
        {
            return _db.Cursos
                        .Include(c => c.PrerequisitosQueTengo) // Carga la colección M:M
                        .ToList();
        }

        /// <summary>
        /// Obtiene un curso por ID, cargando explícitamente la colección de prerrequisitos.
        /// </summary>
        public Curso GetById(string id)
        {
            return _db.Cursos
                        .Include(c => c.PrerequisitosQueTengo) // Carga la colección M:M
                        .FirstOrDefault(c => c.Codigo == id);
        }

        /// <summary>
        /// Obtiene un curso por ID sin cargar colecciones de navegación.
        /// Útil para referenciar entidades (prerrequisitos) en el servicio.
        /// </summary>
        public Curso GetByIdSimple(string id)
        {
            // No incluye colecciones, solo el curso base.
            return _db.Cursos.FirstOrDefault(c => c.Codigo == id);
        }

        public void Add(Curso curso)
        {
            // Nota: Al agregar el curso, Entity Framework manejará la inserción
            // en la tabla Prerequisitos basándose en la colección curso.PrerequisitosQueTengo.
            _db.Cursos.Add(curso);
            _db.SaveChanges();
        }

        public void Update(Curso curso)
        {
            // 🚨 CORRECCIÓN COMPLETA: Usamos Attach y State para decirle a EF que la entidad
            // que viene del Servicio ya está lista y rastreada, o necesita ser rastreada.

            // 1. Marcar la entidad principal como modificada.
            // Usamos el código Find para buscar la entidad en el contexto local (si ya la cargó el GetById)
            var entry = _db.Entry(curso);

            // 2. Si la entidad no está rastreada, la adjuntamos. Si lo está, esto no hace nada.
            if (entry.State == EntityState.Detached)
            {
                _db.Cursos.Attach(curso);
            }

            // 3. Establecer el estado de la entidad principal a Modified para actualizar las propiedades simples.
            // Nota: El servicio debe haber cargado el objeto para que esto funcione correctamente.
            entry.State = EntityState.Modified;

            // 4. Los cambios en la colección M:M (PrerequisitosQueTengo) ya fueron manejados
            // por la Capa de Servicio, que limpió y rellenó la colección del objeto 'curso'.
            // EF detectará estos cambios automáticamente al guardar.

            _db.SaveChanges();
        }

        public void Delete(Curso cursoExistente)
        {
            _db.Cursos.Remove(cursoExistente);
            _db.SaveChanges();
        }
    }
}