import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  completeTaskLog,
  createTask as createTaskApi,
  fetchDashboard,
  fetchProgression,
  fetchTasks,
} from "../lib/api";
import type {
  CreateTaskRequest,
  DashboardResponse,
  ProgressionResponse,
  TaskListResponse,
  UserSummary,
} from "../types/api";
import { useAuth } from "./AuthContext";

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
  createTask: (payload: CreateTaskRequest) => Promise<void>;
  isRefreshing: boolean;
};

const HabitDataContext = createContext<HabitDataContextValue | undefined>(undefined);

export function HabitDataProvider({ children }: { children: React.ReactNode }) {
  const {
    state: { status: authStatus, user: authUser },
  } = useAuth();
  const [state, setState] = useState<HabitDataState>({
    status: "idle",
    user: null,
    dashboard: null,
    tasks: null,
    progression: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!authUser) {
      setState({
        status: "idle",
        user: null,
        dashboard: null,
        tasks: null,
        progression: null,
        errorMessage: undefined,
      });
      return;
    }

    setState((previous) => ({
      ...previous,
      status: "loading",
      errorMessage: undefined,
      user: authUser,
    }));

    try {
      const [dashboard, tasks, progression] = await Promise.all([
        fetchDashboard(authUser.id),
        fetchTasks(authUser.id),
        fetchProgression(authUser.id),
      ]);

      setState({
        status: "ready",
        errorMessage: undefined,
        user: authUser,
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
        user: authUser,
      }));
    }
  }, [authUser]);

  useEffect(() => {
    if (authStatus === "authenticated" && authUser) {
      void loadData();
    } else {
      setState({
        status: "idle",
        user: null,
        dashboard: null,
        tasks: null,
        progression: null,
        errorMessage: undefined,
      });
    }
  }, [authStatus, authUser, loadData]);

  const refresh = useCallback(async () => {
    if (!authUser) {
      return;
    }
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [authUser, loadData]);

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

  const createTask = useCallback(
    async (payload: CreateTaskRequest) => {
      if (!state.user) {
        throw new Error("Utilisateur non chargé");
      }
      await createTaskApi(state.user.id, payload);
      await refresh();
    },
    [refresh, state.user],
  );

  const value = useMemo<HabitDataContextValue>(
    () => ({
      state,
      refresh,
      completeTask,
      createTask,
      isRefreshing,
    }),
    [state, refresh, completeTask, createTask, isRefreshing],
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
