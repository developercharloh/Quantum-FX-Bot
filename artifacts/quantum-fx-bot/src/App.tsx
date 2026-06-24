import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";

// Pages
import Landing from "@/pages/Landing";
import Splash from "@/pages/Splash";
import Onboarding from "@/pages/Onboarding";
import About from "@/pages/legal/About";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";
import Risk from "@/pages/legal/Risk";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Bots from "@/pages/bots/Bots";
import BotDetail from "@/pages/bots/BotDetail";
import Cashier from "@/pages/cashier/Cashier";
import Deposit from "@/pages/cashier/Deposit";
import Withdraw from "@/pages/cashier/Withdraw";
import Transactions from "@/pages/cashier/Transactions";
import PaymentMethods from "@/pages/cashier/PaymentMethods";
import Trade from "@/pages/Trade";
import Profile from "@/pages/profile/Profile";
import PersonalInfo from "@/pages/profile/PersonalInfo";
import Security from "@/pages/profile/Security";
import KYC from "@/pages/profile/KYC";
import Notifications from "@/pages/profile/Notifications";
import Support from "@/pages/support/Support";
import SupportTicket from "@/pages/support/SupportTicket";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/splash" component={Splash} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/about" component={About} />
      <Route path="/legal/terms" component={Terms} />
      <Route path="/legal/privacy" component={Privacy} />
      <Route path="/legal/risk" component={Risk} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Authenticated Routes */}
      <Route path="/dashboard">
        <AuthGuard><Dashboard /></AuthGuard>
      </Route>
      <Route path="/bots">
        <AuthGuard><Bots /></AuthGuard>
      </Route>
      <Route path="/bots/:id">
        <AuthGuard><BotDetail /></AuthGuard>
      </Route>
      <Route path="/cashier">
        <AuthGuard><Cashier /></AuthGuard>
      </Route>
      <Route path="/cashier/deposit">
        <AuthGuard><Deposit /></AuthGuard>
      </Route>
      <Route path="/cashier/withdraw">
        <AuthGuard><Withdraw /></AuthGuard>
      </Route>
      <Route path="/cashier/transactions">
        <AuthGuard><Transactions /></AuthGuard>
      </Route>
      <Route path="/cashier/payment-methods">
        <AuthGuard><PaymentMethods /></AuthGuard>
      </Route>
      <Route path="/trade">
        <AuthGuard><Trade /></AuthGuard>
      </Route>
      <Route path="/profile">
        <AuthGuard><Profile /></AuthGuard>
      </Route>
      <Route path="/profile/personal-info">
        <AuthGuard><PersonalInfo /></AuthGuard>
      </Route>
      <Route path="/profile/security">
        <AuthGuard><Security /></AuthGuard>
      </Route>
      <Route path="/profile/kyc">
        <AuthGuard><KYC /></AuthGuard>
      </Route>
      <Route path="/profile/notifications">
        <AuthGuard><Notifications /></AuthGuard>
      </Route>
      <Route path="/support">
        <AuthGuard><Support /></AuthGuard>
      </Route>
      <Route path="/support/ticket">
        <AuthGuard><SupportTicket /></AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <div className="max-w-[430px] mx-auto min-h-screen bg-background relative overflow-x-hidden shadow-2xl">
              <Router />
            </div>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
