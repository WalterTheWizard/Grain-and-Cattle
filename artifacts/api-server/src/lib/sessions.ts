export interface SessionData {
  farmId: number;
  farmName: string;
  email: string;
  role: "owner" | "employer" | "employee";
  employeeId?: number | null;
  employeeName?: string | null;
}

export const sessions = new Map<string, SessionData>();
