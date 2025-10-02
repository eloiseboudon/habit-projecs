import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import BottomNav from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import { useHabitData } from "../context/HabitDataContext";
import { CATEGORIES, type CategoryKey } from "../constants/categories";

export default function QuestsScreen() {
  const router = useRouter();
  const {
    state: authState,
  } = useAuth();
  const {
    state: { status, tasks, errorMessage },
    refresh,
    isRefreshing,
    completeTask,
  } = useHabitData();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (authState.status !== "authenticated") {
      router.replace("/login");
    }
  }, [authState.status, router]);

  const questItems = useMemo(() => tasks?.tasks ?? [], [tasks]);
  const isInitialLoading =
    (status === "loading" || status === "idle") && questItems.length === 0;

  const handleToggleTask = async (taskId: string, alreadyCompleted: boolean) => {
    if (alreadyCompleted || completingTaskId) {
      return;
    }

    try {
      setCompletingTaskId(taskId);
      await completeTask(taskId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible d'enregistrer cette tâche.";
      Alert.alert("Erreur", message);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const renderItem = ({
    item,
  }: {
    item: (typeof questItems)[number];
  }) => {
    const category = CATEGORIES[item.domain_key as CategoryKey] ?? null;
    const icon = item.icon ?? category?.icon ?? "⭐";
    const label = category?.label ?? item.domain_name;

    const isLoading = completingTaskId === item.id;

    return (
      <Pressable
        style={[styles.taskCard, item.completed_today && styles.taskCardCompleted]}
        onPress={() => handleToggleTask(item.id, item.completed_today)}
        disabled={item.completed_today || isLoading}
      >
        <View
          style={[
            styles.checkboxButton,
            item.completed_today ? styles.checkboxButtonCompleted : styles.checkboxButtonDefault,
          ]}
        >
          {item.completed_today && <Feather name="check" size={16} color="#0f172a" />}
        </View>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, item.completed_today && styles.taskTitleCompleted]}>
            {item.title}
          </Text>
          <View style={styles.taskMetaRow}>
            <Text style={styles.taskCategory}>
              {icon} {label}
            </Text>
            <Text style={styles.taskXp}>+{item.xp} XP</Text>
          </View>
        </View>
        {isLoading && <ActivityIndicator size="small" color="#f8fafc" />}
      </Pressable>
    );
  };

  const ListEmptyComponent = () => {
    if (isInitialLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#58a6ff" />
          <Text style={styles.emptyStateLabel}>Chargement des quêtes…</Text>
        </View>
      );
    }

    if (status === "error" && questItems.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateLabel}>{errorMessage ?? "Impossible de charger vos quêtes."}</Text>
          <Pressable style={styles.retryButton} onPress={() => refresh()}>
            <Text style={styles.retryButtonLabel}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateLabel}>Aucune quête pour le moment.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <FlatList
          data={questItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => refresh()} tintColor="#58a6ff" />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Pressable accessibilityRole="button" onPress={() => router.push("/")} style={styles.backButton}>
                <Feather name="chevron-left" size={22} color="#e5e7eb" />
              </Pressable>
              <Text style={styles.title}>Mes Quêtes du jour</Text>
            </View>
          }
        />
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  screen: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
    paddingTop: 28,
    gap: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  title: {
    color: "#e2e8f0",
    fontSize: 22,
    fontWeight: "700",
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(30, 41, 59, 0.75)",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  taskCardCompleted: {
    opacity: 0.5,
  },
  checkboxButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxButtonDefault: {
    borderWidth: 2,
    borderColor: "#38bdf8",
    backgroundColor: "transparent",
  },
  checkboxButtonCompleted: {
    backgroundColor: "#38bdf8",
  },
  taskContent: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    color: "#f9fafb",
    fontSize: 16,
    fontWeight: "600",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "rgba(226, 232, 240, 0.6)",
  },
  taskMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskCategory: {
    color: "#cbd5f5",
    fontSize: 14,
  },
  taskXp: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 120,
    gap: 12,
  },
  emptyStateLabel: {
    color: "#cbd5f5",
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1f6feb",
  },
  retryButtonLabel: {
    color: "#f8fafc",
    fontWeight: "600",
  },
});
