using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;
using System.Web.SessionState;

namespace MallaCurricular
{
    public class WebApiApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            GlobalConfiguration.Configure(WebApiConfig.Register);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);
        }

        // Web API does not request ASP.NET session state by default.  Login
        // stores UsuarioID/RolID in that session, so API authorization must
        // explicitly opt in before AcquireRequestState runs.
        protected void Application_PostAuthorizeRequest()
        {
            var context = HttpContext.Current;
            if (context == null || context.Request == null) return;

            var path = context.Request.AppRelativeCurrentExecutionFilePath ?? string.Empty;
            if (path.StartsWith("~/api/", StringComparison.OrdinalIgnoreCase))
            {
                context.SetSessionStateBehavior(SessionStateBehavior.Required);
            }
        }
    }
}
