import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useListEmployees, useGetMe,
  getListTasksQueryKey, getListEmployeesQueryKey, getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Plus, Check, Trash2, ClipboardList, Clock, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdmin = me?.role !== "employee";

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [timeToFinish, setTimeToFinish] = useState("");

  const { data: pending = [], isLoading: loadingPending } = useListTasks(
    { status: "pending" },
    { query: { queryKey: getListTasksQueryKey({ status: "pending" }) } }
  );
  const { data: completed = [], isLoading: loadingCompleted } = useListTasks(
    { status: "completed" },
    { query: { queryKey: getListTasksQueryKey({ status: "completed" }) } }
  );
  const { data: employees = [] } = useListEmployees({
    query: { queryKey: getListEmployeesQueryKey() },
  });

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setShowModal(false);
        resetForm();
        toast({ title: "Task created" });
      },
      onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
    },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
    },
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: "Task deleted" });
      },
    },
  });

  function resetForm() {
    setTitle(""); setDescription(""); setAssignedToId(""); setDueDate(""); setTimeToFinish("");
  }

  function handleSubmit() {
    if (!title) return;
    createTask.mutate({
      data: {
        title,
        description: description || undefined,
        assignedToId: assignedToId ? parseInt(assignedToId, 10) : undefined,
        dueDate: dueDate || undefined,
        timeToFinish: timeToFinish || undefined,
      },
    });
  }

  function markComplete(id: number) {
    updateTask.mutate({ id, data: { status: "completed" } });
  }

  function markPending(id: number) {
    updateTask.mutate({ id, data: { status: "pending" } });
  }

  function renderTask(task: {
    id: number;
    title: string;
    description?: string | null;
    assignedToName?: string | null;
    dueDate?: string | null;
    timeToFinish?: string | null;
    status: string;
    completedAt?: string | null;
  }, completed = false) {
    return (
      <Card key={task.id} data-testid={`task-card-${task.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`font-medium text-sm ${completed ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                <Badge variant={completed ? "secondary" : "default"} className="text-xs">
                  {completed ? "DONE" : "PENDING"}
                </Badge>
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {task.assignedToName && (
                  <span className="flex items-center gap-1">
                    <User size={11} /> {task.assignedToName}
                  </span>
                )}
                {task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {task.dueDate}
                  </span>
                )}
                {task.timeToFinish && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {task.timeToFinish}
                  </span>
                )}
                {task.completedAt && (
                  <span className="text-green-600">
                    Completed {new Date(task.completedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!completed ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => markComplete(task.id)}
                  data-testid={`button-complete-${task.id}`}
                >
                  <Check size={12} className="mr-1" />
                  Done
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => markPending(task.id)}
                  data-testid={`button-reopen-${task.id}`}
                >
                  Reopen
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteTask.mutate({ id: task.id })}
                  data-testid={`button-delete-task-${task.id}`}
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Farm Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage jobs and assignments</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)} data-testid="button-post-job">
            <Plus size={15} className="mr-1.5" />
            Post Job
          </Button>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending
            <Badge variant="secondary" className="ml-2 text-xs">{pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed
            <Badge variant="secondary" className="ml-2 text-xs">{completed.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {loadingPending ? (
            <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No pending tasks</p>
            </div>
          ) : (
            pending.map(t => renderTask(t, false))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {loadingCompleted ? (
            <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : completed.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No completed tasks</p>
            </div>
          ) : (
            completed.map(t => renderTask(t, true))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post New Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Vaccinate herd" data-testid="input-task-title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={2} data-testid="input-task-description" />
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger data-testid="select-assign-to">
                  <SelectValue placeholder="Select employee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-due-date" />
              </div>
              <div>
                <Label>Time to Finish</Label>
                <Input value={timeToFinish} onChange={e => setTimeToFinish(e.target.value)} placeholder="e.g. 2 hours" data-testid="input-time-to-finish" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createTask.isPending || !title} data-testid="button-submit-task">
              {createTask.isPending ? "Posting..." : "Post Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
