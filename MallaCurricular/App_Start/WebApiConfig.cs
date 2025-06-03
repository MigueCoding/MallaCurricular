using System.Web.Http;
using System.Web.Http.Cors; // Añade esto para CORS

namespace MallaCurricular
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // Habilitar CORS
            var cors = new EnableCorsAttribute("*", "*", "*"); // Permitir todos los orígenes, encabezados y métodos
            config.EnableCors(cors);

            // Configuración y servicios de Web API

            // Rutas de Web API
            config.MapHttpAttributeRoutes();

            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );
        }
    }
}