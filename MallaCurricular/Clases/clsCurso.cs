using MallaCurricular.Models;
using MallaCurricular.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Services
{
    public class clsCurso
    {
        // Nota: Es mejor usar el repositorio para obtener datos, no el contexto directamente.
        // public MallaDBEntities2 db = new MallaDBEntities2(); 
        // public Curso curso = new Curso(); // Estas líneas parecen innecesarias en un servicio bien estructurado.

        private readonly ICursoRepositorio _cursoRepositorio;

        private readonly string[] coloresValidos = {
            "course-green", "course-blue", "course-purple", "course-red"
        };

        public clsCurso(ICursoRepositorio cursoRepositorio)
        {
            _cursoRepositorio = cursoRepositorio;
        }

        // Método de mapeo (Actualizado para incluir la lista de códigos de prerequisitos)
        private object MapearCurso(Curso c)
        {
            // La colección PrerequisitosQueTengo contiene los cursos que ESTE curso necesita.
            // Mapeamos esta colección para obtener solo los códigos (o las asignaturas si es necesario).
            var prerequisitos = c.PrerequisitosQueTengo
                                 .Select(p => new { p.Codigo, p.Asignatura })
                                 .ToList();

            return new
            {
                c.Codigo,
                c.Asignatura,
                // Ahora devolvemos una lista de objetos (o códigos) de prerequisitos
                Prerequisitos = prerequisitos,
                c.Color,
                c.Creditos,
                c.TIS,
                c.TPS
            };
        }

        public IEnumerable<object> ObtenerTodos()
        {
            // Podrías necesitar un método 'GetAllWithPrerequisites' en el repositorio 
            // que incluya los datos de navegación para evitar N+1 queries.
            return _cursoRepositorio.GetAll().Select(MapearCurso);
        }

        public object ObtenerPorId(string id)
        {
            // De igual forma, 'GetByIdWithPrerequisites' para cargar la colección.
            var curso = _cursoRepositorio.GetById(id);
            return curso == null ? null : MapearCurso(curso);
        }

        // Asume que el DTO de entrada tiene una propiedad List<string> PrerequisitoCodigos
        public string CrearCurso(Curso curso, List<string> prerequisitoCodigos)
        {
            if (_cursoRepositorio.GetById(curso.Codigo) != null)
                return "El código de la asignatura ya existe.";

            if (!coloresValidos.Contains(curso.Color))
                return "Color inválido.";

            // ----------------------------------------------------
            // Lógica NUEVA para la relación M:M
            // ----------------------------------------------------
            var erroresPrerequisito = ValidarYAsignarPrerequisitos(curso, prerequisitoCodigos);
            if (erroresPrerequisito != null) return erroresPrerequisito;

            // La propiedad obsoleta curso.Prerequisito ya NO se usa/asigna.
            _cursoRepositorio.Add(curso);
            return null;
        }

        // Asume que el DTO de entrada tiene una propiedad List<string> PrerequisitoCodigos
        public string ActualizarCurso(string id, Curso cursoActualizado, List<string> prerequisitoCodigos)
        {
            var cursoExistente = _cursoRepositorio.GetById(id);
            if (cursoExistente == null)
                return "Curso no encontrado.";

            if (!coloresValidos.Contains(cursoActualizado.Color))
                return "Color inválido.";

            // 1. Actualizar propiedades simples
            cursoExistente.Asignatura = cursoActualizado.Asignatura;
            cursoExistente.Color = cursoActualizado.Color;
            cursoExistente.Creditos = cursoActualizado.Creditos;
            cursoExistente.TIS = cursoActualizado.TIS;
            cursoExistente.TPS = cursoActualizado.TPS;

            // 2. Actualizar relación M:M (Prerequisitos)
            var erroresPrerequisito = ValidarYAsignarPrerequisitos(cursoExistente, prerequisitoCodigos);
            if (erroresPrerequisito != null) return erroresPrerequisito;

            // La propiedad obsoleta cursoExistente.Prerequisito ya NO se usa/asigna.
            _cursoRepositorio.Update(cursoExistente);
            return null;
        }

        public string EliminarCurso(string id)
        {
            var cursoExistente = _cursoRepositorio.GetById(id);
            if (cursoExistente == null)
                return "Curso no encontrado.";

            // Entity Framework y la configuración ON DELETE CASCADE deben manejar la limpieza
            // automática de las entradas correspondientes en MallaCursos y Prerequisitos.

            _cursoRepositorio.Delete(cursoExistente);
            return null;
        }

        // ----------------------------------------------------
        // Método de ayuda para manejar la lógica de prerequisitos
        // ----------------------------------------------------
        private string ValidarYAsignarPrerequisitos(Curso curso, List<string> prerequisitoCodigos)
        {
            if (prerequisitoCodigos == null || !prerequisitoCodigos.Any())
            {
                // Si no hay códigos, se vacía la colección (si el curso ya existía)
                curso.PrerequisitosQueTengo?.Clear();
                return null;
            }

            // Limpiar la colección existente (si es una actualización)
            curso.PrerequisitosQueTengo?.Clear();

            // Buscar y asignar los nuevos prerequisitos
            foreach (var codigo in prerequisitoCodigos.Distinct())
            {
                var prerequisito = _cursoRepositorio.GetById(codigo);
                if (prerequisito == null)
                {
                    return $"El código de prerequisito '{codigo}' no existe.";
                }

                // Asignar el curso Prerequisito al curso principal.
                // Nota: Entity Framework manejará la inserción en la tabla Prerequisitos.
                curso.PrerequisitosQueTengo.Add(prerequisito);
            }
            return null;
        }
    }
}