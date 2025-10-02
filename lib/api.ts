import type {
  DashboardResponse,
  ProgressionResponse,
  TaskListResponse,
  UserSummary,
} from "../types/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Erreur inattendue de l'API");
  }
  return (await response.json()) as T;
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const response = await fetch(`${API_URL}/users`);
  return handleResponse<UserSummary[]>(response);
}

export async function fetchDashboard(userId: string): Promise<DashboardResponse> {
  const response = await fetch(`${API_URL}/users/${userId}/dashboard`);
  return handleResponse<DashboardResponse>(response);
}

export async function fetchTasks(userId: string): Promise<TaskListResponse> {
  const response = await fetch(`${API_URL}/users/${userId}/tasks`);
  return handleResponse<TaskListResponse>(response);
}

export async function fetchProgression(
  userId: string,
): Promise<ProgressionResponse> {
  const response = await fetch(`${API_URL}/users/${userId}/progression`);
  return handleResponse<ProgressionResponse>(response);
}

export async function completeTaskLog(
  userId: string,
  userTaskId: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/task-logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      user_task_id: userTaskId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Impossible d'enregistrer la complétion de la tâche");
  }
}
