using MallaCurricular.Models;
using MallaCurricular.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;

namespace MallaCurricular.Services
{
    public class clsMalla
    {
        private readonly IMallaRepositorio _mallaRepositorio;
        private readonly IMallaCursoRepositorio _mallaCursoRepositorio;

        public clsMalla(IMallaRepositorio mallaRepositorio, IMallaCursoRepositorio mallaCursoRepositorio)
        {
            _mallaRepositorio = mallaRepositorio;
            _mallaCursoRepositorio = mallaCursoRepositorio;
        }

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
            var cursos = new MallaDBEntities().Cursos.ToList(); // Acceso directo para mapear

            return mallaCursos
                .Join(cursos,
                    mc => mc.CursoCodigo,
                    c => c.Codigo,
                    (mc, c) => new
                    {
                        c.Codigo,
                        c.Asignatura,
                        c.Prerequisito,
                        c.Color,
                        Semestre = mc.Semestre, // Usar el semestre de la malla
                        c.Creditos
                    })
                .ToList();
        }

        public string CrearMalla(Malla malla, List<MallaCurso> mallaCursos)
        {
            // Validar que los cursos existan y los semestres sean válidos
            var db = new MallaDBEntities();
            foreach (var mc in mallaCursos)
            {
                if (db.Cursos.FirstOrDefault(c => c.Codigo == mc.CursoCodigo) == null)
                    return $"El curso con código {mc.CursoCodigo} no existe.";
                if (mc.Semestre < 1 || mc.Semestre > 10)
                    return $"El semestre {mc.Semestre} debe estar entre 1 y 10.";
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

        private object MapearMalla(Malla m) => new
        {
            m.Id,
            m.Nombre,
            m.CreatedAt,
            m.UpdatedAt
        };
    }
}