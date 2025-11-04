using MallaCurricular.Models;
using MallaCurricular.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Services
{
    public class clsCurso
    {
        public MallaDBEntities2 db = new MallaDBEntities2();
        public Curso curso = new Curso();

        private readonly ICursoRepositorio _cursoRepositorio;

        private readonly string[] coloresValidos = {
            "course-green", "course-blue", "course-purple", "course-red"
        };

        public clsCurso(ICursoRepositorio cursoRepositorio)
        {
            _cursoRepositorio = cursoRepositorio;
        }

        public IEnumerable<object> ObtenerTodos()
        {
            return _cursoRepositorio.GetAll().Select(MapearCurso);
        }

        public object ObtenerPorId(string id)
        {
            var curso = _cursoRepositorio.GetById(id);
            return curso == null ? null : MapearCurso(curso);
        }

        public string CrearCurso(Curso curso)
        {
            if (_cursoRepositorio.GetById(curso.Codigo) != null)
                return "El código de la asignatura ya existe.";

            if (!coloresValidos.Contains(curso.Color))
                return "Color inválido.";

            // ✅ Traducir el código del prerequisito al nombre
            if (!string.IsNullOrEmpty(curso.Prerequisito))
            {
                var cursoPrerequisito = _cursoRepositorio.GetById(curso.Prerequisito);
                if (cursoPrerequisito != null)
                {
                    curso.Prerequisito = cursoPrerequisito.Asignatura;
                }
            }

            _cursoRepositorio.Add(curso);
            return null;
        }

        private object MapearCurso(Curso c) => new
        {
            c.Codigo,
            c.Asignatura,
            c.Prerequisito,
            c.Color,
            c.Creditos,
            c.TIS,
            c.TPS
        };
    }
}
