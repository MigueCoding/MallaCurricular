using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;

namespace MallaCurricular.Core.Domain.Interfaces
{
    public interface IOptativaRepositorio
    {
        IEnumerable<Optativa> GetAll();

        Optativa GetById(string codigo);

        void Add(Optativa optativa);
        void Update(Optativa optativa);
        void Delete(Optativa optativa);
    }
}


