using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using System.Web.Http.Cors;

namespace MallaCurricular
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // Habilitar CORS
            var cors = new EnableCorsAttribute("*", "*", "*"); // Permitir todos los orígenes (ajusta en producción)
            config.EnableCors(cors);

            // Habilitar rutas basadas en atributos
            config.MapHttpAttributeRoutes();

            // Ruta predeterminada
            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );
        }
    }
}
