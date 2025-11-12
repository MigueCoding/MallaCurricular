using MallaCurricular.Models;
using System.Collections.Generic;

namespace MallaCurricular.Repositories
{
    public interface IElectivaRepositorio
    {
        IEnumerable<Electiva> GetAll();

        Electiva GetById(string codigo);

        void Add(Electiva Electiva);
        void Update(Electiva Electiva);
        void Delete(Electiva Electiva);
    }
}