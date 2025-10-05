import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../../components/BottomNav";
import { useHabitData } from "../../context/HabitDataContext";
import type { TaskListItem } from "../../types/api";

export default function PersonalisationScreen() {
  const router = useRouter();
  const {
    state: { tasks, status, errorMessage },
    updateTaskVisibility,
    refresh,
    isRefreshing,
  } = useHabitData();

  const personalQuests = useMemo<TaskListItem[]>(
    () => tasks?.tasks.filter((task) => task.is_custom) ?? [],
    [tasks],
  );

  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (task: TaskListItem, nextValue: boolean) => {
      if (pendingTaskId) {
        return;
      }

      setPendingTaskId(task.id);
      try {
        await updateTaskVisibility(task.id, nextValue);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour cette quête.";
        Alert.alert("Erreur", message);
      } finally {
        setPendingTaskId(null);
      }
    },
    [pendingTaskId, updateTaskVisibility],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TaskListItem>) => {
      const icon = item.icon ?? "⭐";
      const isBusy = pendingTaskId === item.id;
      return (
        <View style={styles.questRow}>
          <View style={styles.questInfo}>
            <Text style={styles.questIcon}>{icon}</Text>
            <View style={styles.questTexts}>
              <Text style={styles.questTitle}>{item.title}</Text>
              <Text style={styles.questSubtitle}>
                +{item.xp} XP • {item.domain_name}
              </Text>
            </View>
          </View>
          {isBusy ? (
            <ActivityIndicator size="small" color="#818cf8" />
          ) : (
            <Switch
              value={item.show_in_global}
              onValueChange={(value) => handleToggle(item, value)}
              trackColor={{ false: "#475569", true: "#7c3aed" }}
              thumbColor={item.show_in_global ? "#f8fafc" : "#cbd5f5"}
            />
          )}
        </View>
      );
    },
    [handleToggle, pendingTaskId],
  );

  const listEmptyComponent = () => {
    if (status === "loading" || status === "idle") {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#58a6ff" />
          <Text style={styles.emptyStateLabel}>Chargement des quêtes…</Text>
        </View>
      );
    }

    if (status === "error") {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateLabel}>
            {errorMessage ?? "Impossible de charger vos quêtes personnalisées."}
          </Text>
          <Pressable style={styles.retryButton} onPress={() => refresh()}>
            <Text style={styles.retryButtonLabel}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateLabel}>
          Vous n’avez pas encore créé de quête personnalisée.
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => router.replace("/quests")}
        >
          <Text style={styles.retryButtonLabel}>Créer une quête</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#111827", "#111827", "#1f2937"]}
      style={styles.gradientBackground}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Feather name="chevron-left" size={24} color="#f8fafc" />
            </Pressable>
            <Text style={styles.title}>Personnalisation</Text>
            <View style={styles.headerPlaceholder} />
          </View>
          <Text style={styles.subtitle}>
            Choisissez quelles quêtes personnalisées apparaissent dans la liste
            principale.
          </Text>
          <FlatList<TaskListItem>
            data={personalQuests}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={listEmptyComponent}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => refresh()}
                tintColor="#818cf8"
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
          />
          <BottomNav />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 160,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  title: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  subtitle: {
    color: "#cbd5f5",
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 40,
    gap: 12,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.5)",
  },
  questInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  questIcon: {
    fontSize: 20,
  },
  questTexts: {
    flex: 1,
    gap: 4,
  },
  questTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "600",
  },
  questSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    paddingVertical: 120,
    alignItems: "center",
    justifyContent: "center",
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
