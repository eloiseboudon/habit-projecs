import type {
  AuthResponse,
  CreateTaskRequest,
  DashboardResponse,
  ProgressionResponse,
  RegisterRequest,
  TaskListItem,
  TaskListResponse,
  UpdateUserDomainSettingsRequest,
  UpdateUserProfileRequest,
  UserDomainSetting,
  UserProfile,
  UserSummary,
} from "../types/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;

function withAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  if (!API_TOKEN) {
    return headers;
  }

  if (headers instanceof Headers) {
    const clone = new Headers(headers);
    clone.set("Authorization", `Bearer ${API_TOKEN}`);
    return clone;
  }

  if (Array.isArray(headers)) {
    return [...headers, ["Authorization", `Bearer ${API_TOKEN}`]];
  }

  return {
    ...headers,
    Authorization: `Bearer ${API_TOKEN}`,
  };
}

function buildJsonHeaders(includeContentType = false): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  return withAuthHeaders(headers);
}

async function extractErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    const text = await response.text();
    return text || "Erreur inattendue de l'API";
  }

  try {
    const data = await response.json();
    if (typeof data === "string") {
      return data;
    }
    if (typeof data?.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data?.detail)) {
      const combined = data.detail
        .map((item) => {
          if (!item) {
            return null;
          }
          if (typeof item === "string") {
            return item;
          }
          if (typeof item?.msg === "string") {
            return item.msg;
          }
          return null;
        })
        .filter((value): value is string => Boolean(value))
        .join(" \n");
      if (combined) {
        return combined;
      }
    }
    if (typeof data?.error === "string") {
      return data.error;
    }
    if (typeof data?.erreur === "string") {
      return data.erreur;
    }
  } catch (error) {
    // Ignore JSON parsing errors and fall back to text extraction below.
  }

  const text = await response.text();
  return text || "Erreur inattendue de l'API";
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Réponse inattendue du serveur");
  }

  return (await response.json()) as T;
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const response = await fetch(`${API_URL}/users`, {
    headers: buildJsonHeaders(),
  });
  return handleResponse<UserSummary[]>(response);
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: buildJsonHeaders(true),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(response);
}

export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: buildJsonHeaders(true),
    body: JSON.stringify(payload),
  });
  if (response.status === 404) {
    const legacyResponse = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: buildJsonHeaders(true),
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponse>(legacyResponse);
  }
  return handleResponse<AuthResponse>(response);
}

export async function fetchDashboard(userId: string): Promise<DashboardResponse> {
  const response = await fetch(`${API_URL}/users/${userId}/dashboard`, {
    headers: buildJsonHeaders(),
  });
  return handleResponse<DashboardResponse>(response);
}

export async function fetchTasks(userId: string): Promise<TaskListResponse> {
  const response = await fetch(`${API_URL}/users/${userId}/tasks`, {
    headers: buildJsonHeaders(),
  });
  return handleResponse<TaskListResponse>(response);
}

export async function createTask(
  userId: string,
  payload: CreateTaskRequest,
): Promise<TaskListItem> {
  const response = await fetch(`${API_URL}/users/${userId}/tasks`, {
    method: "POST",
    headers: buildJsonHeaders(true),
    body: JSON.stringify(payload),
  });
  return handleResponse<TaskListItem>(response);
}

export async function fetchProgression(
  userId: string,
): Promise<ProgressionResponse> {
  const response = await fetch(`${API_URL}/users/${userId}/progression`, {
    headers: buildJsonHeaders(),
  });
  return handleResponse<ProgressionResponse>(response);
}

export async function completeTaskLog(
  userId: string,
  userTaskId: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/task-logs`, {
    method: "POST",
    headers: buildJsonHeaders(true),
    body: JSON.stringify({
      user_id: userId,
      user_task_id: userTaskId,
    }),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message || "Impossible d'enregistrer la complétion de la tâche");
  }
}

export async function fetchDomainSettings(userId: string): Promise<UserDomainSetting[]> {
  const response = await fetch(`${API_URL}/users/${userId}/domain-settings`, {
    headers: buildJsonHeaders(),
  });
  return handleResponse<UserDomainSetting[]>(response);
}

export async function updateDomainSettings(
  userId: string,
  payload: UpdateUserDomainSettingsRequest,
): Promise<UserDomainSetting[]> {
  const response = await fetch(`${API_URL}/users/${userId}/domain-settings`, {
    method: "PUT",
    headers: buildJsonHeaders(true),
    body: JSON.stringify(payload),
  });
  return handleResponse<UserDomainSetting[]>(response);
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/users/${userId}/profile`, {
    headers: buildJsonHeaders(),
  });
  return handleResponse<UserProfile>(response);
}

export async function updateUserProfile(
  userId: string,
  payload: UpdateUserProfileRequest,
): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/users/${userId}/profile`, {
    method: "PUT",
    headers: buildJsonHeaders(true),
    body: JSON.stringify(payload),
  });
  return handleResponse<UserProfile>(response);
}
