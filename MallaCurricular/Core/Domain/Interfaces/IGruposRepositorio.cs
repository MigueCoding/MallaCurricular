using MallaCurricular.Infrastructure.Data;
using System.Collections.Generic;

namespace MallaCurricular.Core.Domain.Interfaces
{
    public interface IGruposRepositorio
    {
        IEnumerable<Grupos> GetAll();
        Grupos GetById(int id);
        IEnumerable<Grupos> GetByProfesorId(int profesorId);
        IEnumerable<Grupos> GetByCursoCodigo(string cursoCodigo);
        void Add(Grupos grupo);
        void Update(Grupos grupo);
        void Delete(Grupos grupo);
    }
}
