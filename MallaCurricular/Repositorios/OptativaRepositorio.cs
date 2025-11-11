using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;
using System.Data.Entity; // Necesario para EntityState

namespace MallaCurricular.Repositories
{
    public class OptativaRepositorio : IOptativaRepositorio
    {
        private readonly MallaDBEntities4 _db;

        // Inyección de dependencias a través del constructor
        public OptativaRepositorio(MallaDBEntities4 dbContext)
        {
            _db = dbContext;
        }

        public IEnumerable<Optativa> GetAll()
        {
            return _db.Optativas.ToList();
        }

        public Optativa GetById(string codigo)
        {
            // Busca por Codigo (string)
            return _db.Optativas.FirstOrDefault(o => o.Codigo == codigo);
        }

        public void Add(Optativa optativa)
        {
            _db.Optativas.Add(optativa);
            _db.SaveChanges();
        }

        public void AddRange(IEnumerable<Optativa> optativas)
        {
            _db.Optativas.AddRange(optativas);
            _db.SaveChanges();
        }

        public void Update(Optativa optativa)
        {
            var existingOptativa = _db.Optativas.FirstOrDefault(o => o.Codigo == optativa.Codigo);

            if (existingOptativa != null)
            {
                // Actualizar todas las propiedades
                existingOptativa.Asignatura = optativa.Asignatura;
                existingOptativa.Color = optativa.Color;
                existingOptativa.Creditos = optativa.Creditos;
                existingOptativa.Tipo = optativa.Tipo;
                existingOptativa.TPS = optativa.TPS;
                existingOptativa.TIS = optativa.TIS;

                // Alternativamente, podrías usar: _db.Entry(optativa).State = EntityState.Modified;
                // si la entidad 'optativa' no viene del contexto.

                _db.SaveChanges();
            }
        }

        public void Delete(Optativa optativa)
        {
            // Busca la entidad por el Codigo para asegurar que se está rastreando correctamente.
            var existingOptativa = _db.Optativas.FirstOrDefault(o => o.Codigo == optativa.Codigo);

            if (existingOptativa != null)
            {
                _db.Optativas.Remove(existingOptativa);
                _db.SaveChanges();
            }
        }
    }
}