using System;
using System.Linq;
using System.Data.Entity; // Necesario para el .Include()
using MallaCurricular.Models;

namespace MallaCurricular.Repositorios
{
    public class UsuarioRepositorio
    {
        private MallaDBEntities db = new MallaDBEntities();

        public Usuario ValidarUsuario(string email, string password)
        {
            using (MallaDBEntities db = new MallaDBEntities())
            {
                // Usamos los campos: email y contrasena
                return db.Usuarios
                         .FirstOrDefault(u => u.email == email && u.contrasena == password);
            }
    }
}
}