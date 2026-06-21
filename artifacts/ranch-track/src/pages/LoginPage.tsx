import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useClerk } from "@clerk/react";
import { useLoginEmployee, getGetMeQueryKey, setAuthTokenGetter } from "@workspace/api-client-react";
import { Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function FarmerProLogo() {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="FarmerPro logo"
      width={120}
      height={120}
      className="rounded-3xl shadow-md"
    />
  );
}

export default function LoginPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { signOut } = useClerk();

  const [empFarmEmail, setEmpFarmEmail] = useState("");
  const [empUsername, setEmpUsername] = useState("");
  const [empPassword, setEmpPassword] = useState("");

  const loginEmployee = useLoginEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/dashboard");
      },
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string } })?.data?.error || "Invalid credentials";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  function handleEmployeeLogin(e: React.FormEvent) {
    e.preventDefault();
    loginEmployee.mutate({ data: { farmEmail: empFarmEmail, username: empUsername, password: empPassword } });
  }

  function handleDemo() {
    loginEmployee.mutate({
      data: { farmEmail: "demo@ranchtrack.com", username: "jdoe", password: "demo" },
    });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <FarmerProLogo />
          <h1 className="mt-3 text-2xl font-bold text-foreground">FarmerPro</h1>
          <p className="text-sm text-muted-foreground">Manage. Grow. Succeed.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Welcome to FarmerPro</CardTitle>
            <CardDescription>Sign in to manage your ranch</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="farm">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="farm" data-testid="tab-farm-login">Farm Owner</TabsTrigger>
                <TabsTrigger value="employee" data-testid="tab-employee">Employee</TabsTrigger>
              </TabsList>

              <TabsContent value="farm">
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
                    onClick={handleDemo}
                    data-testid="button-demo"
                  >
                    <Eye className="mr-2 h-4 w-4" /> View Demo Farm
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">or sign in</span>
                    </div>
                  </div>
                  {isSignedIn ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        You already have a session but your farm could not be found.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => signOut({ redirectUrl: basePath || "/" })}
                        data-testid="button-farm-signout"
                      >
                        Sign Out and Start Over
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Sign in with Google or your email to access your ranch.
                      </p>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => setLocation("/sign-in")}
                        data-testid="button-farm-signin"
                      >
                        Sign In
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation("/sign-up")}
                        data-testid="button-farm-register"
                      >
                        Register a New Farm
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="employee">
                <form onSubmit={handleEmployeeLogin} className="space-y-3">
                  <div>
                    <Label htmlFor="emp-farm-email">Farm Email</Label>
                    <Input
                      id="emp-farm-email"
                      type="email"
                      placeholder="ranch@example.com"
                      value={empFarmEmail}
                      onChange={(e) => setEmpFarmEmail(e.target.value)}
                      required
                      data-testid="input-emp-farm-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emp-username">Username</Label>
                    <Input
                      id="emp-username"
                      placeholder="username"
                      value={empUsername}
                      onChange={(e) => setEmpUsername(e.target.value)}
                      required
                      data-testid="input-emp-username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emp-password">Password</Label>
                    <Input
                      id="emp-password"
                      type="password"
                      placeholder="••••••••"
                      value={empPassword}
                      onChange={(e) => setEmpPassword(e.target.value)}
                      required
                      data-testid="input-emp-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginEmployee.isPending}
                    data-testid="button-employee-login"
                  >
                    {loginEmployee.isPending ? "Signing in..." : "Login As Employee"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
