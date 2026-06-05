import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
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
import TimeCardPage from "@/pages/TimeCardPage";
import CropsPage from "@/pages/CropsPage";
import StoragePage from "@/pages/StoragePage";
import EquipmentPage from "@/pages/EquipmentPage";
import InputsPage from "@/pages/InputsPage";
import NotFound from "@/pages/not-found";
import type { AuthResponse } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev, auto-set in prod. Do NOT gate on PROD.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(142 71% 45%)",
    colorForeground: "hsl(240 10% 12%)",
    colorMutedForeground: "hsl(240 4% 46%)",
    colorDanger: "hsl(0 72% 51%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(240 10% 12%)",
    colorNeutral: "hsl(240 6% 84%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.65rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[400px] max-w-full overflow-hidden border border-[hsl(240_6%_90%)] shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(240_10%_12%)] font-bold",
    headerSubtitle: "text-[hsl(240_4%_46%)]",
    socialButtonsBlockButton: "border border-[hsl(240_6%_84%)] hover:bg-[hsl(240_5%_96%)]",
    socialButtonsBlockButtonText: "text-[hsl(240_10%_12%)] font-medium",
    dividerText: "text-[hsl(240_4%_46%)]",
    dividerLine: "bg-[hsl(240_6%_90%)]",
    formFieldLabel: "text-[hsl(240_10%_12%)] font-medium",
    formFieldInput: "bg-white border border-[hsl(240_6%_84%)] text-[hsl(240_10%_12%)]",
    formButtonPrimary: "bg-[hsl(142_71%_45%)] hover:bg-[hsl(142_71%_40%)] text-white",
    footerActionText: "text-[hsl(240_4%_46%)]",
    footerActionLink: "text-[hsl(142_71%_38%)] hover:text-[hsl(142_71%_32%)] font-medium",
    identityPreviewEditButton: "text-[hsl(142_71%_38%)]",
    formFieldSuccessText: "text-[hsl(142_71%_38%)]",
    otpCodeFieldInput: "border border-[hsl(240_6%_84%)] text-[hsl(240_10%_12%)]",
    logoBox: "h-12 flex items-center justify-center",
    logoImage: "h-12 w-12",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// Keeps the cache fresh when the signed-in Clerk user changes.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthenticatedApp() {
  // Wait for Clerk so the owner's session cookie is established before /auth/me.
  const { isLoaded } = useAuth();
  const { data: user, isLoading } = useGetMe({
    query: { retry: false, enabled: isLoaded, queryKey: getGetMeQueryKey() },
  });

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!user) {
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
        <Route path="/time-cards" component={TimeCardPage} />
        <Route path="/crops" component={CropsPage} />
        <Route path="/storage" component={StoragePage} />
        <Route path="/equipment" component={EquipmentPage} />
        <Route path="/inputs" component={InputsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to RanchTrack",
            subtitle: "Sign in to manage your ranch",
          },
        },
        signUp: {
          start: {
            title: "Create your RanchTrack account",
            subtitle: "Start managing your ranch today",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={AuthenticatedApp} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
