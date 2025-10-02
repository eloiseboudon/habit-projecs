import { Feather } from "@expo/vector-icons";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";
import { CATEGORIES, CATEGORY_OPTIONS, type CategoryKey } from "../constants/categories";
import { useAuth } from "../context/AuthContext";
import { useHabitData } from "../context/HabitDataContext";

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
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>(defaultCategory);
  const [newQuestXp, setNewQuestXp] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (authState.status !== "authenticated") {
      router.replace("/login");
    }
  }, [authState.status, navigationState?.key, router]);

  const questItems = useMemo(() => tasks?.tasks ?? [], [tasks]);
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
    setNewQuestXp("10");
    setSelectedCategory(defaultCategory);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsAddModalVisible(false);
      resetForm();
    }
  };

  const handleCreateTaskSubmit = async () => {
    const title = newQuestTitle.trim();
    if (!title) {
      Alert.alert("Titre requis", "Veuillez saisir un titre pour votre quête.");
      return;
    }

    const xpValue = Number.parseInt(newQuestXp, 10);
    if (Number.isNaN(xpValue) || xpValue < 0) {
      Alert.alert(
        "Récompense invalide",
        "Veuillez indiquer un nombre de points d'expérience positif.",
      );
      return;
    }

    if (xpValue > 10000) {
      Alert.alert(
        "Récompense trop élevée",
        "Veuillez choisir une récompense inférieure ou égale à 10 000 XP.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const domainKeyToSend = domainKeyOverrides.get(selectedCategory) ?? selectedCategory;
      await createTask({
        title,
        domain_key: domainKeyToSend,
        xp: xpValue,
      });
      resetForm();
      setIsAddModalVisible(false);
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
        <Pressable
          style={[
            styles.primaryButton,
            styles.emptyStateButton,
            isSubmitting && styles.primaryButtonDisabled,
          ]}
          onPress={() => {
            resetForm();
            setIsAddModalVisible(true);
          }}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonLabel}>Ajouter une quête</Text>
        </Pressable>
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
            <View style={styles.headerContainer}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerTitleRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/")}
                    style={styles.backButton}
                  >
                    <Feather name="chevron-left" size={22} color="#e5e7eb" />
                  </Pressable>
                  <Text style={styles.title}>Mes Quêtes du jour</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={styles.addButton}
                  onPress={() => {
                    resetForm();
                    setIsAddModalVisible(true);
                  }}
                >
                  <Feather name="plus" size={20} color="#0f172a" />
                </Pressable>
              </View>
              <Text style={styles.headerSubtitle}>
                Ajoutez de nouvelles quêtes pour continuer à progresser !
              </Text>
            </View>
          }
        />
        <Modal
          visible={isAddModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalOverlay} onPress={handleCloseModal} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nouvelle quête</Text>

              <Text style={styles.modalLabel}>Titre</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Courir 5 km"
                placeholderTextColor="#94a3b8"
                value={newQuestTitle}
                onChangeText={setNewQuestTitle}
                editable={!isSubmitting}
              />

              <Text style={styles.modalLabel}>Catégorie</Text>
              <View style={styles.categoryOptions}>
                {CATEGORY_OPTIONS.map((key) => {
                  const category = CATEGORIES[key];
                  const isSelected = selectedCategory === key;
                  return (
                    <Pressable
                      key={key}
                      style={[
                        styles.categoryOption,
                        isSelected && styles.categoryOptionSelected,
                      ]}
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

              <Text style={styles.modalLabel}>Récompense (XP)</Text>
              <TextInput
                style={styles.input}
                value={newQuestXp}
                onChangeText={setNewQuestXp}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor="#94a3b8"
                editable={!isSubmitting}
                maxLength={5}
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleCloseModal}
                  disabled={isSubmitting}
                >
                  <Text style={styles.secondaryButtonLabel}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                  onPress={handleCreateTaskSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={styles.primaryButtonLabel}>Ajouter</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  headerContainer: {
    gap: 12,
    marginBottom: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#e2e8f0",
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 14,
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
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateButton: {
    minWidth: 200,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonLabel: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    gap: 12,
    width: "100%",
    maxWidth: 420,
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalLabel: {
    color: "#cbd5f5",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  input: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    color: "#f8fafc",
    marginTop: 6,
  },
  categoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
  },
  categoryOptionSelected: {
    backgroundColor: "#38bdf8",
    borderColor: "#38bdf8",
  },
  categoryOptionLabel: {
    color: "#cbd5f5",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryOptionLabelSelected: {
    color: "#0f172a",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "transparent",
  },
  secondaryButtonLabel: {
    color: "#cbd5f5",
    fontWeight: "600",
  },
});
