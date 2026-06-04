import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import LoginPage from "@/pages/LoginPage";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import CattlePage from "@/pages/CattlePage";
import CattleDetailPage from "@/pages/CattleDetailPage";
import TasksPage from "@/pages/TasksPage";
import FieldsPage from "@/pages/FieldsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";
import type { AuthResponse } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

function AuthenticatedApp() {
  const { data: user, isLoading, isError } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (isError || !user) {
    return <LoginPage />;
  }

  return (
    <Layout user={user as AuthResponse}>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/cattle" component={CattlePage} />
        <Route path="/cattle/:id" component={CattleDetailPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/fields" component={FieldsPage} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthenticatedApp />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
