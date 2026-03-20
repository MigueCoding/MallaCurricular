using System;
using MallaCurricular.Core.Domain.Interfaces;
using System.Linq;
using System.Data.Entity; // Necesario para el .Include()
using MallaCurricular.Infrastructure.Data;

namespace MallaCurricular.Infrastructure.Repositories
{
    public class UsuarioRepositorio
    {
        private MallaDBEntities db = new MallaDBEntities();

        public Usuario ValidarUsuario(string email, string password)
        {
            using (MallaDBEntities db = new MallaDBEntities())
            {
                return db.Usuarios
                         .FirstOrDefault(u => u.email == email && u.contrasena == password);
            }
        }

        public System.Collections.Generic.IEnumerable<Usuario> ObtenerProfesores()
        {
            using (MallaDBEntities db = new MallaDBEntities())
            {
                return db.Usuarios.Where(u => u.id_rol == 2).ToList();
            }
        }

        public System.Collections.Generic.IEnumerable<Usuario> ObtenerEstudiantes()
        {
            using (MallaDBEntities db = new MallaDBEntities())
            {
                return db.Usuarios.Where(u => u.id_rol == 3).ToList();
            }
        }
    }
}

