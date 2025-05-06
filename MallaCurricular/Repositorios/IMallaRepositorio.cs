using MallaCurricular.Models;
using System.Collections.Generic;

namespace MallaCurricular.Repositories
{
    public interface IMallaRepositorio
    {
        IEnumerable<Malla> GetAll();
        Malla GetById(int id);
        Malla GetLatest();
        void Add(Malla malla);
    }
}