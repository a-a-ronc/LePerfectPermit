import { Switch, Route, useLocation } from "wouter";
import { ReactNode, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// Pages
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import DashboardPage from "@/pages/dashboard-page";
import ProjectPage from "@/pages/project-page";
import ProjectDetailsPage from "@/pages/project-details-page";
import DocumentsPage from "@/pages/documents-page";
import StakeholderPage from "@/pages/stakeholder-page";
import SettingsPage from "@/pages/settings-page";
import NotFound from "@/pages/not-found";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

// Landing Page
function LandingPage() {
  const [, navigate] = useLocation();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo size="lg" />
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            <span>PainlessPermit</span><sup className="text-gray-900">TM</sup>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Streamlined High-Piled Storage Permit Management
          </p>
          <p className="text-xs text-gray-500 mt-1">
            by Intralog
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="bg-white p-6 shadow rounded-lg">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Welcome to PainlessPermit<sup className="text-gray-900">TM</sup>
            </h2>
            <p className="text-gray-600 mb-4">
              Simplify your high-piled storage permit process with our comprehensive management solution.
            </p>
            <p className="text-gray-600 mb-4">
              Our permit specialists augmented by AI-powered workflows create a permit acquisition experience that is truly Painless.
            </p>
            <div className="mt-6">
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Continue to Application
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// We use a simple authentication state in the app itself
function App() {
  // Simple auth state for page routing
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  // Simplified login/logout methods
  const handleLogin = () => {
    setLoggedIn(true);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    setLoggedIn(false);
    // Clear any cached queries
    queryClient.clear();
    navigate("/");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="app">
          <Switch>
            <Route path="/">
              <LandingPage />
            </Route>
            <Route path="/auth">
              <AuthPage onLoginSuccess={handleLogin} />
            </Route>
            <Route path="/forgot-password">
              <ForgotPasswordPage />
            </Route>
            <Route path="/reset-password">
              <ResetPasswordPage />
            </Route>
            
            {/* Use ProtectedRoute for authenticated routes */}
            <Route path="/dashboard">
              <ProtectedRoute component={() => <DashboardPage onLogout={handleLogout} />} />
            </Route>
            <Route path="/projects">
              <ProtectedRoute component={() => <ProjectPage />} />
            </Route>
            <Route path="/projects/new">
              <ProtectedRoute component={() => <ProjectPage />} />
            </Route>
            <Route path="/project/:id">
              <ProtectedRoute component={() => <ProjectDetailsPage />} />
            </Route>
            <Route path="/documents">
              <ProtectedRoute component={() => <DocumentsPage />} />
            </Route>
            <Route path="/stakeholders">
              <ProtectedRoute component={() => <StakeholderPage />} />
            </Route>
            <Route path="/settings">
              <ProtectedRoute component={() => <SettingsPage />} />
            </Route>
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
