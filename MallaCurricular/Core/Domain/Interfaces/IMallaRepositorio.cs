using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;

namespace MallaCurricular.Core.Domain.Interfaces
{
    public interface IMallaRepositorio
    {
        IEnumerable<Malla> GetAll();
        Malla GetById(int id);
        Malla GetLatest();
        void Add(Malla malla);
    }
}


