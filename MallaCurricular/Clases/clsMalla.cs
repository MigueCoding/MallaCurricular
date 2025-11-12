using MallaCurricular.Models;
using MallaCurricular.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Data.Entity; 

namespace MallaCurricular.Services
{
    public class clsMalla
    {
        private readonly IMallaRepositorio _mallaRepositorio;
        private readonly IMallaCursoRepositorio _mallaCursoRepositorio;
        private readonly IElectivaRepositorio _electivaRepositorio; 
        private readonly IOptativaRepositorio _optativaRepositorio; 

        public clsMalla(IMallaRepositorio mallaRepositorio,
                        IMallaCursoRepositorio mallaCursoRepositorio,
                        IElectivaRepositorio electivaRepositorio,
                        IOptativaRepositorio optativaRepositorio)
        {
            _mallaRepositorio = mallaRepositorio;
            _mallaCursoRepositorio = mallaCursoRepositorio;
            _electivaRepositorio = electivaRepositorio;
            _optativaRepositorio = optativaRepositorio;
        }

        // MÉTODOS EXISTENTES

        public IEnumerable<object> ObtenerTodos()
        {
            return _mallaRepositorio.GetAll().Select(MapearMalla);
        }

        public Malla ObtenerUltimaMalla()
        {
            return _mallaRepositorio.GetLatest();
        }

        public Malla ObtenerMallaPorId(int id)
        {
            return _mallaRepositorio.GetById(id);
        }

        public IEnumerable<object> ObtenerCursosPorMalla(int mallaId)
        {
            var mallaCursos = _mallaCursoRepositorio.GetByMallaId(mallaId);

            // Se usa el contexto directamente (asumiendo que MallaDBEntities4 existe y es accesible)
            using (var db = new MallaDBEntities4())
            {
                var cursosConPrerequisitos = db.Cursos
                    .Include(c => c.PrerequisitosQueTengo) // Cargar la colección de navegación M:M
                    .ToList();

                // Realizar el JOIN
                return mallaCursos
                    .Join(cursosConPrerequisitos,
                        mc => mc.CursoCodigo,
                        c => c.Codigo,
                        (mc, c) => new
                        {
                            c.Codigo,
                            c.Asignatura,
                            Prerequisito = string.Join(",", c.PrerequisitosQueTengo.Select(p => p.Codigo)),
                            c.Color,
                            Semestre = mc.Semestre,
                            c.Creditos,
                            c.TPS,
                            c.TIS
                        })
                    .ToList();
            } // Fin del using
        }

        public string CrearMalla(Malla malla, List<MallaCurso> mallaCursos)
        {
            // Validar que los cursos existan y los semestres sean válidos
            var db = new MallaDBEntities4();
            foreach (var mc in mallaCursos)
            {
                if (db.Cursos.FirstOrDefault(c => c.Codigo == mc.CursoCodigo) == null)
                    return $"El curso con código {mc.CursoCodigo} no existe.";
                if (mc.Semestre < 1 || mc.Semestre > 11)
                    return $"El semestre {mc.Semestre} debe estar entre 1 y 11.";
            }

            // Guardar la malla
            malla.CreatedAt = DateTime.Now;
            malla.UpdatedAt = DateTime.Now;
            _mallaRepositorio.Add(malla);

            // Asociar los cursos a la malla
            foreach (var mc in mallaCursos)
            {
                mc.MallaId = malla.Id;
            }
            _mallaCursoRepositorio.AddRange(mallaCursos);

            return null;
        }

        /// Obtiene la lista completa de Electivas disponibles.
        public IEnumerable<object> ObtenerCatalogoElectivas()
        {
            // Mapeo simple de las propiedades necesarias para el catálogo de la vista.
            return _electivaRepositorio.GetAll().Select(e => new
            {
                e.Codigo,
                e.Asignatura,
                e.Color,
                e.Creditos,
                e.TIS,
                e.TPS
            }).ToList();
        }

        public IEnumerable<object> ObtenerCatalogoOptativas()
        {
            // Mapeo simple de las propiedades necesarias para el catálogo de la vista.
            return _optativaRepositorio.GetAll().Select(o => new
            {
                o.Codigo,
                o.Asignatura,
                o.Color,
                o.Creditos,
                o.TIS,
                o.TPS
            }).ToList();
        }

        // --------------------------------------------------
        // MÉTODO DE MAPEO
        // --------------------------------------------------

        private object MapearMalla(Malla m) => new
        {
            m.Id,
            m.Nombre,
            m.CreatedAt,
            m.UpdatedAt
        };
    }
}