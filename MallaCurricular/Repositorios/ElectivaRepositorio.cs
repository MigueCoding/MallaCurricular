using MallaCurricular.Models;
using System.Collections.Generic;
using System.Linq;
using System.Data.Entity; // Necesario para EntityState

namespace MallaCurricular.Repositories
{
    // Asumo que IElectivaRepositorio requiere un string para GetById.
    public class ElectivaRepositorio : IElectivaRepositorio
    {
        // El contexto se debe inyectar, no crear aquí
        private readonly MallaDBEntities4 _db;

        // 1. Inyección de dependencias a través del constructor
        public ElectivaRepositorio(MallaDBEntities4 dbContext)
        {
            _db = dbContext;
        }

        public IEnumerable<Electiva> GetAll()
        {
            return _db.Electivas.ToList();
        }

        // 2. Usar 'Codigo' (string) como clave, no 'Id' (int)
        public Electiva GetById(string codigo)
        {
            return _db.Electivas.FirstOrDefault(o => o.Codigo == codigo);
        }

        // 3. Método Add (correcto, solo se añade la inyección)
        public void Add(Electiva Electiva)
        {
            _db.Electivas.Add(Electiva);
            _db.SaveChanges();
        }

        public void Update(Electiva Electiva)
        {
            // 4. Buscar por Codigo, no por Id
            var existingElectiva = _db.Electivas.FirstOrDefault(o => o.Codigo == Electiva.Codigo);

            if (existingElectiva != null)
            {
                // 5. Actualizar solo las propiedades que existen en el modelo
                existingElectiva.Asignatura = Electiva.Asignatura;
                existingElectiva.Color = Electiva.Color;
                existingElectiva.Creditos = Electiva.Creditos;
                existingElectiva.Tipo = Electiva.Tipo;
                existingElectiva.TPS = Electiva.TPS;
                existingElectiva.TIS = Electiva.TIS;

                // Opción alternativa: Marcar la entidad como modificada
                // _db.Entry(Electiva).State = EntityState.Modified; 

                _db.SaveChanges();
            }
        }

        // El parámetro de entrada debe ser la entidad completa o el código
        public void Delete(Electiva Electiva)
        {
            // Opcional: Buscar para asegurar que la entidad esté siendo rastreada por el contexto
            // Si la entidad 'Electiva' ya viene del contexto, esto es innecesario.
            var existingElectiva = _db.Electivas.FirstOrDefault(o => o.Codigo == Electiva.Codigo);

            if (existingElectiva != null)
            {
                _db.Electivas.Remove(existingElectiva);
                _db.SaveChanges();
            }
        }
    }
}