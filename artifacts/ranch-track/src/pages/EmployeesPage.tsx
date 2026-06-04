import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees, useCreateEmployee, useDeleteEmployee,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import { Plus, Users, Trash2, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("employee");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");

  const { data: employees = [], isLoading } = useListEmployees({
    query: { queryKey: getListEmployeesQueryKey() },
  });

  const createEmployee = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        setShowModal(false);
        resetForm();
        toast({ title: "Staff member added" });
      },
      onError: () => toast({ title: "Failed to add staff member", variant: "destructive" }),
    },
  });

  const deleteEmployee = useDeleteEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        toast({ title: "Staff member removed" });
      },
    },
  });

  function resetForm() {
    setFullName(""); setUsername(""); setPassword(""); setRole("employee"); setPosition(""); setPhone("");
  }

  function handleSubmit() {
    if (!fullName || !username || !password) {
      toast({ title: "Full name, username, and password are required", variant: "destructive" });
      return;
    }
    createEmployee.mutate({
      data: {
        fullName,
        username,
        password,
        role: role as "employer" | "employee",
        position: position || undefined,
        phone: phone || undefined,
      },
    });
  }

  const totalStaff = employees.length;
  const employers = employees.filter(e => e.role === "employer").length;
  const employeeCount = employees.filter(e => e.role === "employee").length;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Profiles</h1>
          <p className="text-sm text-muted-foreground">Manage your farm staff</p>
        </div>
        <Button onClick={() => setShowModal(true)} data-testid="button-add-staff">
          <Plus size={15} className="mr-1.5" />
          Add Staff Member
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Staff", value: totalStaff, icon: Users, color: "border-green-500" },
          { label: "Employers", value: employers, icon: Shield, color: "border-blue-500" },
          { label: "Employees", value: employeeCount, icon: User, color: "border-teal-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden" data-testid={`employee-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-0">
              <div className={`flex items-center gap-3 p-4 border-l-4 ${color}`}>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon size={18} className="text-muted-foreground ml-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No staff members added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => (
            <Card key={emp.id} data-testid={`employee-card-${emp.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" data-testid={`employee-name-${emp.id}`}>{emp.fullName}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${emp.role === "employer" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
                          {emp.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>@{emp.username}</span>
                        {emp.position && <span>{emp.position}</span>}
                        {emp.phone && <span>{emp.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteEmployee.mutate({ id: emp.id })}
                    data-testid={`button-delete-employee-${emp.id}`}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" data-testid="input-full-name" />
              </div>
              <div>
                <Label>Username *</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe" data-testid="input-username" />
              </div>
            </div>
            <div>
              <Label>Password *</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" data-testid="input-employee-password" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Position</Label>
                <Input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Ranch Hand" data-testid="input-position" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-0100" data-testid="input-phone" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createEmployee.isPending} data-testid="button-submit-employee">
              {createEmployee.isPending ? "Adding..." : "Add Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
