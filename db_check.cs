using System;
using System.Data.SqlClient;

namespace DBCheck
{
    class Program
    {
        static void Main()
        {
            try
            {
                var connectionString = "data source=localhost;initial catalog=MallaDB;integrated security=True;";
                using (var conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    var cmd = new SqlCommand("SELECT Asignatura FROM Cursos WHERE Codigo = 'MAT103'", conn);
                    var result = cmd.ExecuteScalar();
                    if (result != null)
                        Console.WriteLine("MAT103 existe: " + result);
                    else
                        Console.WriteLine("MAT103 NO existe en la tabla Cursos.");
                    
                    var cmd2 = new SqlCommand("SELECT TOP 1 Asignatura FROM Grupos WHERE CursoCodigo = 'MAT103'", conn);
                    var result2 = cmd2.ExecuteScalar();
                    if (result2 != null)
                        Console.WriteLine("MAT103 existe en Grupos: " + result2);
                }
            }
            catch (Exception ex) { Console.WriteLine("Error: " + ex.Message); }
        }
    }
}
