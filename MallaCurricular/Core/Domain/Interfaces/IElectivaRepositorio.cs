using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;

namespace MallaCurricular.Core.Domain.Interfaces
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


