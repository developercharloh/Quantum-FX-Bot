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

// In dev (localhost) requests stay same-origin — the shared proxy routes /api to Express.
// In production the admin app is on a different origin, so point directly at the API domain.
setBaseUrl(
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://quantum-fx-bot.site"
    : null
);

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
    const saved = localStorage.getItem("qfx_theme") ?? "dark";
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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
