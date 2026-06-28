import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Layout from "@/components/Layout";
import { useLoginAlarm } from "@/hooks/useLoginAlarm";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import UserDetail from "@/pages/UserDetail";
import Bots from "@/pages/Bots";
import Finance from "@/pages/Finance";
import Support from "@/pages/Support";
import Settings from "@/pages/Settings";
import Broadcast from "@/pages/Broadcast";
import NotFound from "@/pages/not-found";

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

function Router({ onLogout }: { onLogout: () => void }) {
  useLoginAlarm();
  return (
    <Layout onLogout={onLogout}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/users" component={Users} />
        <Route path="/users/:id" component={UserDetail} />
        <Route path="/bots" component={Bots} />
        <Route path="/finance" component={Finance} />
        <Route path="/support" component={Support} />
        <Route path="/settings" component={Settings} />
        <Route path="/broadcast" component={Broadcast} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem("qfx_admin_auth") === "1");

  useEffect(() => {
    const saved = localStorage.getItem("qfx_theme") ?? "dark";
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleLogin = () => setAuthed(true);

  const handleLogout = () => {
    localStorage.removeItem("qfx_admin_auth");
    setAuthed(false);
  };

  if (!authed) {
    return (
      <QueryClientProvider client={queryClient}>
        <Login onLogin={handleLogin} />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router onLogout={handleLogout} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
