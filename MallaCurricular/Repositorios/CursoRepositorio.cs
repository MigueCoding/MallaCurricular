using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;
using System.Data.Entity; // Necesario para usar .Include()

namespace MallaCurricular.Repositories
{
    public class CursoRepositorio : ICursoRepositorio
    {
        private readonly MallaDBEntities4 _db;

        public CursoRepositorio()
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
        /// Obtiene un curso por ID, cargando explícitamente la colección de prerequisitos.
        /// </summary>
        public Curso GetById(string id)
        {
            return _db.Cursos
                      .Include(c => c.PrerequisitosQueTengo) // Carga la colección M:M
                      .FirstOrDefault(c => c.Codigo == id);
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
            // El curso que llega aquí ya debe tener la colección PrerequisitosQueTengo actualizada por clsCurso.
            // Para actualizar una relación M:M en EF Database First:
            // 1. Necesitas adjuntar la entidad 'curso' al contexto.
            // 2. Necesitas asegurarte de que EF sepa qué cambios hubo en la colección M:M.

            // Método simple (Asumiendo que el curso tiene solo los cambios simples en propiedades):
            var existingCurso = GetById(curso.Codigo);
            if (existingCurso != null)
            {
                // Actualizar propiedades simples:
                existingCurso.Asignatura = curso.Asignatura;
                existingCurso.Creditos = curso.Creditos;
                existingCurso.TIS = curso.TIS;
                existingCurso.TPS = curso.TPS;
                // existingCurso.Prerequisito = curso.Prerequisito; <-- ELIMINADO: Ya no existe
                existingCurso.Color = curso.Color;

                // Para actualizar la relación M:M (PrerequisitosQueTengo), la lógica debe manejar:
                // 1. Limpiar la colección existente.
                // 2. Asignar los nuevos cursos de la colección 'curso.PrerequisitosQueTengo'.
                // Esta lógica se implementó correctamente en clsCurso.cs antes de llamar a Update.

                // Si la instancia 'curso' que entra ya es la que se modificó y tiene los nuevos
                // PrerequisitosQueTengo, adjuntamos y marcamos como modificado.
                // Si usamos el patrón Unit of Work o si clsCurso modifica la entidad cargada, esto es suficiente.

                // Si se sigue el patrón de modificar el existente (como abajo) y clsCurso hizo el trabajo de
                // actualizar la colección 'PrerequisitosQueTengo' del objeto 'existingCurso', solo guardamos:
                _db.SaveChanges();
            }
        }

        public void Delete(Curso cursoExistente)
        {
            _db.Cursos.Remove(cursoExistente);
            _db.SaveChanges();
        }
    }
}