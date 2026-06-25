import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import UserDetail from "@/pages/UserDetail";
import Bots from "@/pages/Bots";
import Finance from "@/pages/Finance";
import Support from "@/pages/Support";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

// Initialize API client.
// VITE_ADMIN_API_BASE is set at build time by Render (see render.yaml).
// In dev it is unset: requests stay same-origin and the shared proxy routes /api to the API server.
setBaseUrl(import.meta.env.VITE_ADMIN_API_BASE || null);
setAuthTokenGetter(() => import.meta.env.VITE_ADMIN_API_KEY || "");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/users" component={Users} />
        <Route path="/users/:id" component={UserDetail} />
        <Route path="/bots" component={Bots} />
        <Route path="/finance" component={Finance} />
        <Route path="/support" component={Support} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
