import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRootNavigationState, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../../components/BottomNav";
import { CATEGORIES, CATEGORY_OPTIONS, type CategoryKey } from "../../constants/categories";
import { useAuth } from "../../context/AuthContext";
import { useHabitData } from "../../context/HabitDataContext";
import type { SnapshotPeriod, TaskFrequency, TaskListItem } from "../../types/api";

const FREQUENCY_CHOICES: { value: TaskFrequency; label: string; periodLabel: string }[] = [
  { value: "daily", label: "Quotidienne", periodLabel: "aujourd’hui" },
  { value: "weekly", label: "Hebdomadaire", periodLabel: "cette semaine" },
  { value: "monthly", label: "Mensuelle", periodLabel: "ce mois-ci" },
];

const SCHEDULE_PERIOD_BY_FREQUENCY: Record<TaskFrequency, SnapshotPeriod> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

const PERIOD_HELPER_BY_SCHEDULE: Record<SnapshotPeriod, string> = {
  day: "par jour",
  week: "par semaine",
  month: "par mois",
};

function formatScheduleLabel(period: SnapshotPeriod, interval: number): string {
  if (interval <= 1) {
    switch (period) {
      case "day":
        return "aujourd’hui";
      case "week":
        return "cette semaine";
      case "month":
        return "ce mois-ci";
      default:
        return "cette période";
    }
  }

  const pluralInterval = `${interval}`;
  switch (period) {
    case "day":
      return `ces ${pluralInterval} jours`;
    case "week":
      return `ces ${pluralInterval} semaines`;
    case "month":
      return `ces ${pluralInterval} mois`;
    default:
      return "cette période";
  }
}

type QuestListItemProps = {
  item: TaskListItem;
  onToggle: (task: TaskListItem) => void;
  isLoading: boolean;
};

const areQuestItemsEqual = (prevItem: TaskListItem, nextItem: TaskListItem) =>
  prevItem.id === nextItem.id &&
  prevItem.title === nextItem.title &&
  prevItem.domain_key === nextItem.domain_key &&
  prevItem.domain_name === nextItem.domain_name &&
  prevItem.icon === nextItem.icon &&
  prevItem.xp === nextItem.xp &&
  prevItem.schedule_period === nextItem.schedule_period &&
  prevItem.schedule_interval === nextItem.schedule_interval &&
  prevItem.frequency_type === nextItem.frequency_type &&
  prevItem.target_occurrences === nextItem.target_occurrences &&
  prevItem.occurrences_completed === nextItem.occurrences_completed &&
  prevItem.occurrences_remaining === nextItem.occurrences_remaining &&
  prevItem.completed_today === nextItem.completed_today;

const QuestListItem = memo(({ item, onToggle, isLoading }: QuestListItemProps) => {
  const category = CATEGORIES[item.domain_key as CategoryKey] ?? null;
  const icon = item.icon ?? category?.icon ?? "⭐";
  const label = category?.label ?? item.domain_name;
  const isCompleted = item.completed_today;
  const periodLabel = formatScheduleLabel(item.schedule_period, item.schedule_interval);
  const occurrencesRemaining = item.occurrences_remaining;
  const fractionLabel = `${item.occurrences_completed}/${item.target_occurrences}`;
  const progressLabel = isCompleted
    ? `Objectif atteint ${periodLabel} (${fractionLabel})`
    : `Encore ${occurrencesRemaining} fois ${periodLabel} (${fractionLabel})`;
  const showProgress =
    item.target_occurrences > 1 ||
    item.schedule_interval > 1 ||
    item.frequency_type !== "daily";

  return (
    <Pressable
      style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
      onPress={() => onToggle(item)}
      disabled={isCompleted || isLoading}
    >
      <View
        style={[
          styles.checkboxButton,
          isCompleted ? styles.checkboxButtonCompleted : styles.checkboxButtonDefault,
        ]}
      >
        {isCompleted && <Feather name="check" size={16} color="#0f172a" />}
      </View>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
          {item.title}
        </Text>
        <View style={styles.taskMetaRow}>
          <Text style={styles.taskCategory}>
            {icon} {label}
          </Text>
          <Text style={styles.taskXp}>+{item.xp} XP</Text>
        </View>
        {showProgress && (
          <Text style={[styles.taskProgress, isCompleted && styles.taskProgressCompleted]}>
            {progressLabel}
          </Text>
        )}
      </View>
      {isLoading && <ActivityIndicator size="small" color="#f8fafc" />}
    </Pressable>
  );
}, (prev, next) => areQuestItemsEqual(prev.item, next.item) && prev.isLoading === next.isLoading);

QuestListItem.displayName = "QuestListItem";

export default function QuestsScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const {
    state: authState,
  } = useAuth();
  const {
    state: { status, tasks, errorMessage, dashboard },
    refresh,
    isRefreshing,
    completeTask,
    createTask,
  } = useHabitData();
  const defaultCategory = (CATEGORY_OPTIONS[0] ?? "health") as CategoryKey;
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>(defaultCategory);
  const [selectedFrequency, setSelectedFrequency] = useState<TaskFrequency>("daily");
  const [occurrenceCount, setOccurrenceCount] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultXpReward = 10;
  const occurrencesHelperLabel = useMemo(() => {
    const period = SCHEDULE_PERIOD_BY_FREQUENCY[selectedFrequency];
    return PERIOD_HELPER_BY_SCHEDULE[period] ?? "par période";
  }, [selectedFrequency]);

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (authState.status !== "authenticated") {
      router.replace("/login");
    }
  }, [authState.status, navigationState?.key, router]);

  const questItems = useMemo<TaskListItem[]>(() => tasks?.tasks ?? [], [tasks]);
  const domainKeyOverrides = useMemo(() => {
    const overrides = new Map<CategoryKey, string>();

    const normalizeText = (value: string | null | undefined) =>
      value
        ? value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
        : "";

    const candidates: { key: string; name: string }[] = [];

    if (dashboard) {
      for (const stat of dashboard.domain_stats) {
        candidates.push({ key: stat.domain_key, name: stat.domain_name });
      }
    }

    for (const task of questItems) {
      candidates.push({ key: task.domain_key, name: task.domain_name });
    }

    if (candidates.length === 0) {
      return overrides;
    }

    for (const categoryKey of CATEGORY_OPTIONS) {
      const category = CATEGORIES[categoryKey];
      const normalizedKey = normalizeText(categoryKey);
      const normalizedLabel = normalizeText(category.label);

      const match = candidates.find((candidate) => {
        if (normalizeText(candidate.key) === normalizedKey) {
          return true;
        }
        if (candidate.name) {
          return normalizeText(candidate.name) === normalizedLabel;
        }
        return false;
      });

      if (match) {
        overrides.set(categoryKey, match.key);
      }
    }

    return overrides;
  }, [dashboard, questItems]);
  const isInitialLoading =
    (status === "loading" || status === "idle") && questItems.length === 0;

  const resetForm = () => {
    setNewQuestTitle("");
    setSelectedCategory(defaultCategory);
    setSelectedFrequency("daily");
    setOccurrenceCount("1");
  };

  const handleSelectFrequency = (value: TaskFrequency) => {
    setSelectedFrequency(value);
    setOccurrenceCount((previous) => {
      const parsed = Number.parseInt(previous, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return "1";
      }
      return previous;
    });
  };

  const handleCreateTaskSubmit = async () => {
    const title = newQuestTitle.trim();
    if (!title) {
      Alert.alert("Titre requis", "Veuillez saisir un titre pour votre quête.");
      return;
    }

    const parsedOccurrences = Number.parseInt(occurrenceCount, 10);
    if (Number.isNaN(parsedOccurrences) || parsedOccurrences < 1) {
      Alert.alert(
        "Fréquence invalide",
        "Veuillez indiquer un nombre de répétitions supérieur ou égal à 1.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const domainKeyToSend = domainKeyOverrides.get(selectedCategory) ?? selectedCategory;
      await createTask({
        title,
        domain_key: domainKeyToSend,
        xp: defaultXpReward,
        frequency_type: selectedFrequency,
        schedule_period: SCHEDULE_PERIOD_BY_FREQUENCY[selectedFrequency],
        schedule_interval: 1,
        target_occurrences: parsedOccurrences,
      });
      resetForm();
      setShowAddTask(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter cette quête pour le moment.";
      Alert.alert("Erreur", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = useCallback(
    async (task: TaskListItem) => {
      if (task.completed_today || completingTaskId) {
        return;
      }

      try {
        setCompletingTaskId(task.id);
        await completeTask(task.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible d'enregistrer cette tâche.";
        Alert.alert("Erreur", message);
      } finally {
        setCompletingTaskId(null);
      }
    },
    [completeTask, completingTaskId],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TaskListItem>) => (
      <QuestListItem
        item={item}
        onToggle={handleToggleTask}
        isLoading={completingTaskId === item.id}
      />
    ),
    [handleToggleTask, completingTaskId],
  );

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
        <Pressable
          style={[
            styles.addTaskButton,
            isSubmitting && styles.addTaskButtonDisabled,
          ]}
          onPress={() => {
            resetForm();
            setShowAddTask(true);
          }}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={["#7c3aed", "#ec4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addTaskGradient}
          >
            <Feather name="plus" size={20} color="#f8fafc" />
            <Text style={styles.addTaskButtonLabel}>Ajouter une quête</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  const renderAddSection = () => (
    <View style={styles.addSection}>
      {!showAddTask ? (
        <Pressable
          style={({ pressed }) => [
            styles.addTaskButton,
            pressed && styles.addTaskButtonPressed,
          ]}
          onPress={() => {
            resetForm();
            setShowAddTask(true);
          }}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={["#7c3aed", "#ec4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addTaskGradient}
          >
            <Feather name="plus" size={20} color="#f8fafc" />
            <Text style={styles.addTaskButtonLabel}>Ajouter une quête</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <View style={styles.addFormCard}>
          <Text style={styles.addFormTitle}>Nouvelle quête</Text>

          <Text style={styles.formLabel}>Catégorie</Text>
          <View style={styles.categoryOptions}>
            {CATEGORY_OPTIONS.map((key) => {
              const category = CATEGORIES[key];
              const isSelected = selectedCategory === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.categoryOption, isSelected && styles.categoryOptionSelected]}
                  onPress={() => setSelectedCategory(key)}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.categoryOptionLabel,
                      isSelected && styles.categoryOptionLabelSelected,
                    ]}
                  >
                    {category.icon} {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Action</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Méditer 10 minutes"
            placeholderTextColor="#64748b"
            value={newQuestTitle}
            onChangeText={setNewQuestTitle}
            editable={!isSubmitting}
          />

          <Text style={styles.formLabel}>Fréquence</Text>
          <View style={styles.frequencyOptions}>
            {FREQUENCY_CHOICES.map((option) => {
              const isSelected = selectedFrequency === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.frequencyOption,
                    isSelected && styles.frequencyOptionSelected,
                  ]}
                  onPress={() => handleSelectFrequency(option.value)}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.frequencyOptionLabel,
                      isSelected && styles.frequencyOptionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.frequencyOptionHelper}>{option.periodLabel}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Objectif</Text>
          <Text style={styles.formHelper}>Nombre de fois {occurrencesHelperLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={selectedFrequency === "weekly" ? "2" : "1"}
            placeholderTextColor="#64748b"
            value={occurrenceCount}
            onChangeText={(value) => setOccurrenceCount(value.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={3}
            editable={!isSubmitting}
          />

          <View style={styles.addFormActions}>
            <Pressable
              style={[styles.secondaryButton, isSubmitting && styles.secondaryButtonDisabled]}
              onPress={() => {
                if (!isSubmitting) {
                  setShowAddTask(false);
                  resetForm();
                }
              }}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonLabel}>Annuler</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.confirmButtonPressed,
                isSubmitting && styles.confirmButtonDisabled,
              ]}
              onPress={handleCreateTaskSubmit}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={["#7c3aed", "#ec4899"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#f8fafc" />
                ) : (
                  <Text style={styles.confirmButtonLabel}>Valider</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#111827", "#111827", "#1f2937"]}
      style={styles.gradientBackground}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          <FlatList<TaskListItem>
            data={questItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={ListEmptyComponent}
            ListFooterComponent={renderAddSection}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => refresh()} tintColor="#818cf8" />
            }
            ListHeaderComponent={
              <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/")}
                    style={styles.backButton}
                  >
                    <Feather name="chevron-left" size={24} color="#f8fafc" />
                  </Pressable>
                  <Text style={styles.title}>Mes Quêtes</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/quests/catalogue")}
                    style={({ pressed }) => [
                      styles.catalogueButton,
                      pressed && styles.catalogueButtonPressed,
                    ]}
                  >
                    <Feather name="book-open" size={16} color="#f8fafc" />
                    <Text style={styles.catalogueButtonLabel}>Catalogue</Text>
                  </Pressable>
                </View>
              </View>
            }
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
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 160,
    gap: 16,
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerTopRow: {
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
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  catalogueButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(79, 70, 229, 0.3)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.4)",
  },
  catalogueButtonPressed: {
    backgroundColor: "rgba(79, 70, 229, 0.45)",
  },
  catalogueButtonLabel: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(31, 41, 55, 0.7)",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.6)",
  },
  taskCardCompleted: {
    borderColor: "rgba(34, 197, 94, 0.4)",
    backgroundColor: "rgba(22, 101, 52, 0.2)",
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
    borderColor: "rgba(148, 163, 184, 0.5)",
    backgroundColor: "transparent",
  },
  checkboxButtonCompleted: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  taskContent: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    color: "#f8fafc",
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
    color: "#94a3b8",
    fontSize: 12,
  },
  taskXp: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "700",
  },
  taskProgress: {
    color: "#e2e8f0",
    fontSize: 12,
    marginTop: 4,
  },
  taskProgressCompleted: {
    color: "rgba(226, 232, 240, 0.7)",
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
  input: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.4)",
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    color: "#f8fafc",
    marginTop: 8,
  },
  categoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.6)",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
  },
  categoryOptionSelected: {
    borderColor: "#7c3aed",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
  },
  categoryOptionLabel: {
    color: "#cbd5f5",
    fontSize: 13,
    fontWeight: "600",
  },
  categoryOptionLabelSelected: {
    color: "#c4b5fd",
  },
  frequencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  frequencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.6)",
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    flexGrow: 1,
    minWidth: "30%",
    gap: 4,
    alignItems: "flex-start",
  },
  frequencyOptionSelected: {
    borderColor: "#ec4899",
    backgroundColor: "rgba(236, 72, 153, 0.25)",
  },
  frequencyOptionLabel: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
  },
  frequencyOptionLabelSelected: {
    color: "#f5d0fe",
  },
  frequencyOptionHelper: {
    color: "#cbd5f5",
    fontSize: 11,
  },
  addSection: {
    marginTop: 8,
    gap: 16,
  },
  addTaskButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  addTaskGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  addTaskButtonLabel: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },
  addTaskButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  addTaskButtonDisabled: {
    opacity: 0.6,
  },
  addFormCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.5)",
    padding: 20,
    gap: 12,
  },
  addFormTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  formLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  formHelper: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  addFormActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#374151",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonLabel: {
    color: "#e2e8f0",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  confirmGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonLabel: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 15,
  },
  confirmButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
});
