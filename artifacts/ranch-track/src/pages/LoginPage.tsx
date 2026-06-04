import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRegisterFarm, useLoginFarm, useLoginEmployee, getGetMeQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function RanchTrackLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="18" fill="hsl(142 71% 45%)" />
      <path
        d="M18 8 C12 8 8 12 8 18 C8 22 10 25 13 27 C14 27.5 15 26.5 14.5 25.5 C13 23.5 12 21 12 18 C12 14 14.8 11 18 11 C21.2 11 24 14 24 18 C24 20.5 23 22.8 21.5 24.3 C20.7 25.1 21.3 26.5 22.5 26.5 C24 26.5 26 24 27 22 C27.7 20.7 28 19.4 28 18 C28 12 23.5 8 18 8Z"
        fill="white"
      />
      <path
        d="M18 13 C15.2 13 13 15.2 13 18 C13 19.6 13.7 21 14.8 22 C15.5 22.7 16.5 22 16.2 21 C16 20.4 15.9 19.7 15.9 19 C15.9 16.8 16.8 15 18 15 C19.2 15 20.1 16.8 20.1 19 C20.1 20.4 19.6 21.6 18.8 22.3 C18 23 18.5 24.2 19.6 24 C21.5 23.5 23 21 23 18 C23 15.2 20.8 13 18 13Z"
        fill="white"
        opacity="0.8"
      />
      <circle cx="18" cy="18" r="2" fill="white" />
    </svg>
  );
}

export default function LoginPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [farmEmail, setFarmEmail] = useState("");
  const [farmPassword, setFarmPassword] = useState("");
  const [empFarmEmail, setEmpFarmEmail] = useState("");
  const [empUsername, setEmpUsername] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [regFarmName, setRegFarmName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  function onAuthSuccess() {
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  }

  const loginFarm = useLoginFarm({
    mutation: {
      onSuccess: onAuthSuccess,
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string } })?.data?.error || "Invalid credentials";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const loginEmployee = useLoginEmployee({
    mutation: {
      onSuccess: onAuthSuccess,
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string } })?.data?.error || "Invalid credentials";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const registerFarm = useRegisterFarm({
    mutation: {
      onSuccess: onAuthSuccess,
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string } })?.data?.error || "Registration failed";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  function handleFarmLogin(e: React.FormEvent) {
    e.preventDefault();
    loginFarm.mutate({ data: { email: farmEmail, password: farmPassword } });
  }

  function handleEmployeeLogin(e: React.FormEvent) {
    e.preventDefault();
    loginEmployee.mutate({ data: { farmEmail: empFarmEmail, username: empUsername, password: empPassword } });
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    registerFarm.mutate({ data: { farmName: regFarmName, email: regEmail, password: regPassword } });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <RanchTrackLogo />
          <h1 className="mt-3 text-2xl font-bold text-foreground">RanchTrack</h1>
          <p className="text-sm text-muted-foreground">Cattle Management System</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Welcome to RanchTrack</CardTitle>
            <CardDescription>Sign in to manage your ranch</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="farm">
              <TabsList className="grid grid-cols-3 w-full mb-4">
                <TabsTrigger value="farm" data-testid="tab-farm-login">Farm Login</TabsTrigger>
                <TabsTrigger value="employee" data-testid="tab-employee">Employee</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="farm">
                <form onSubmit={handleFarmLogin} className="space-y-3">
                  <div>
                    <Label htmlFor="farm-email">Email</Label>
                    <Input
                      id="farm-email"
                      type="email"
                      placeholder="ranch@example.com"
                      value={farmEmail}
                      onChange={(e) => setFarmEmail(e.target.value)}
                      required
                      data-testid="input-farm-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="farm-password">Password</Label>
                    <Input
                      id="farm-password"
                      type="password"
                      placeholder="••••••••"
                      value={farmPassword}
                      onChange={(e) => setFarmPassword(e.target.value)}
                      required
                      data-testid="input-farm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginFarm.isPending}
                    data-testid="button-farm-login"
                  >
                    {loginFarm.isPending ? "Signing in..." : "Login"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    New farm? Use the Register tab
                  </p>
                </form>
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

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <Label htmlFor="reg-farm-name">Farm Name</Label>
                    <Input
                      id="reg-farm-name"
                      placeholder="My Ranch"
                      value={regFarmName}
                      onChange={(e) => setRegFarmName(e.target.value)}
                      required
                      data-testid="input-reg-farm-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="ranch@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      data-testid="input-reg-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      data-testid="input-reg-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerFarm.isPending}
                    data-testid="button-register"
                  >
                    {registerFarm.isPending ? "Registering..." : "Register Farm"}
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
