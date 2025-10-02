import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  completeTaskLog,
  fetchDashboard,
  fetchProgression,
  fetchTasks,
  fetchUsers,
} from "../lib/api";
import type {
  DashboardResponse,
  ProgressionResponse,
  TaskListResponse,
  UserSummary,
} from "../types/api";

type HabitDataState = {
  status: "idle" | "loading" | "ready" | "error";
  errorMessage?: string;
  user: UserSummary | null;
  dashboard: DashboardResponse | null;
  tasks: TaskListResponse | null;
  progression: ProgressionResponse | null;
};

type HabitDataContextValue = {
  state: HabitDataState;
  refresh: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  isRefreshing: boolean;
};

const HabitDataContext = createContext<HabitDataContextValue | undefined>(undefined);

export function HabitDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HabitDataState>({
    status: "idle",
    user: null,
    dashboard: null,
    tasks: null,
    progression: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setState((previous) => ({ ...previous, status: "loading", errorMessage: undefined }));
    try {
      const users = await fetchUsers();
      if (!users.length) {
        throw new Error("Aucun utilisateur disponible dans la base de données.");
      }

      const user = users[0];
      const [dashboard, tasks, progression] = await Promise.all([
        fetchDashboard(user.id),
        fetchTasks(user.id),
        fetchProgression(user.id),
      ]);

      setState({
        status: "ready",
        errorMessage: undefined,
        user,
        dashboard,
        tasks,
        progression,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de charger les données distantes.";
      setState((previous) => ({
        ...previous,
        status: "error",
        errorMessage: message,
      }));
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const completeTask = useCallback(
    async (taskId: string) => {
      if (!state.user) {
        throw new Error("Utilisateur non chargé");
      }
      await completeTaskLog(state.user.id, taskId);
      await refresh();
    },
    [refresh, state.user],
  );

  const value = useMemo<HabitDataContextValue>(
    () => ({
      state,
      refresh,
      completeTask,
      isRefreshing,
    }),
    [state, refresh, completeTask, isRefreshing],
  );

  return <HabitDataContext.Provider value={value}>{children}</HabitDataContext.Provider>;
}

export function useHabitData(): HabitDataContextValue {
  const context = useContext(HabitDataContext);
  if (!context) {
    throw new Error("useHabitData doit être utilisé à l'intérieur d'un HabitDataProvider");
  }
  return context;
}
