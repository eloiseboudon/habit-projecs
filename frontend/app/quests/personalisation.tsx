import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItemInfo,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../../components/BottomNav";
import { useHabitData } from "../../context/HabitDataContext";
import { CATEGORIES, CATEGORY_OPTIONS, type CategoryKey } from "../../constants/categories";
import type { TaskFrequency, TaskListItem } from "../../types/api";
import {
  FREQUENCY_CHOICES,
  PERIOD_HELPER_BY_SCHEDULE,
  SCHEDULE_PERIOD_BY_FREQUENCY,
  buildDomainKeyOverrides,
} from "./utils";

export default function PersonalisationScreen() {
  const router = useRouter();
  const {
    state: { tasks, status, errorMessage, dashboard },
    updateTaskVisibility,
    updateTask,
    deleteTask,
    refresh,
    isRefreshing,
  } = useHabitData();

  const allTasks = useMemo(() => tasks?.tasks ?? [], [tasks]);

  const personalQuests = useMemo<TaskListItem[]>(
    () => allTasks.filter((task) => task.is_custom),
    [allTasks],
  );

  const defaultCategory = useMemo(
    () => (CATEGORY_OPTIONS[0] ?? "health") as CategoryKey,
    [],
  );

  const domainKeyOverrides = useMemo(
    () => buildDomainKeyOverrides(allTasks, dashboard ?? null),
    [allTasks, dashboard],
  );

  const defaultCustomXp = 10;

  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorCategory, setEditorCategory] = useState<CategoryKey>(defaultCategory);
  const [editorFrequency, setEditorFrequency] = useState<TaskFrequency>("daily");
  const [editorOccurrences, setEditorOccurrences] = useState("1");
  const [editorXp, setEditorXp] = useState(defaultCustomXp);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = useCallback(
    async (task: TaskListItem, nextValue: boolean) => {
      if (pendingTaskId || deletingTaskId) {
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
    [deletingTaskId, pendingTaskId, updateTaskVisibility],
  );

  const normalizeText = useCallback((value: string | null | undefined) => {
    if (!value) {
      return "";
    }
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }, []);

  const resolveCategoryForTask = useCallback(
    (task: TaskListItem): CategoryKey => {
      for (const [categoryKey, domainKey] of domainKeyOverrides.entries()) {
        if (domainKey === task.domain_key) {
          return categoryKey;
        }
      }

      if (CATEGORY_OPTIONS.includes(task.domain_key as CategoryKey)) {
        return task.domain_key as CategoryKey;
      }

      const normalizedDomainName = normalizeText(task.domain_name);
      if (normalizedDomainName) {
        const match = CATEGORY_OPTIONS.find((categoryKey) => {
          const category = CATEGORIES[categoryKey];
          return normalizeText(category.label) === normalizedDomainName;
        });
        if (match) {
          return match;
        }
      }

      return defaultCategory;
    },
    [defaultCategory, domainKeyOverrides, normalizeText],
  );

  const resetEditor = useCallback(() => {
    setEditingTask(null);
    setEditorTitle("");
    setEditorCategory(defaultCategory);
    setEditorFrequency("daily");
    setEditorOccurrences("1");
    setEditorXp(defaultCustomXp);
  }, [defaultCategory, defaultCustomXp]);

  const handleCloseEditor = useCallback(() => {
    if (isSaving) {
      return;
    }
    setIsEditorVisible(false);
    resetEditor();
  }, [isSaving, resetEditor]);

  const handleEditPress = useCallback(
    (task: TaskListItem) => {
      const category = resolveCategoryForTask(task);
      setEditingTask(task);
      setEditorTitle(task.title);
      setEditorCategory(category);
      setEditorFrequency(task.frequency_type as TaskFrequency);
      setEditorOccurrences(String(task.target_occurrences));
      setEditorXp(task.xp ?? defaultCustomXp);
      setIsEditorVisible(true);
    },
    [defaultCustomXp, resolveCategoryForTask],
  );

  const handleEditorTitleChange = useCallback((value: string) => {
    setEditorTitle(value);
  }, []);

  const handleEditorSelectCategory = useCallback((category: CategoryKey) => {
    setEditorCategory(category);
  }, []);

  const handleEditorSelectFrequency = useCallback((value: TaskFrequency) => {
    setEditorFrequency(value);
    setEditorOccurrences((previous) => {
      const parsed = Number.parseInt(previous, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return "1";
      }
      return previous;
    });
  }, []);

  const handleEditorOccurrencesChange = useCallback((value: string) => {
    setEditorOccurrences(value.replace(/[^0-9]/g, ""));
  }, []);

  const editorOccurrencesHelper = useMemo(() => {
    const period = SCHEDULE_PERIOD_BY_FREQUENCY[editorFrequency];
    return PERIOD_HELPER_BY_SCHEDULE[period] ?? "par période";
  }, [editorFrequency]);

  const handleSaveEditor = useCallback(async () => {
    if (!editingTask) {
      return;
    }

    const title = editorTitle.trim();
    if (!title) {
      Alert.alert("Titre requis", "Veuillez saisir un titre pour votre quête.");
      return;
    }

    const parsedOccurrences = Number.parseInt(editorOccurrences, 10);
    if (Number.isNaN(parsedOccurrences) || parsedOccurrences < 1) {
      Alert.alert(
        "Fréquence invalide",
        "Veuillez indiquer un nombre de répétitions supérieur ou égal à 1.",
      );
      return;
    }

    try {
      setIsSaving(true);
      const frequency = editorFrequency;
      const domainKeyToSend = domainKeyOverrides.get(editorCategory) ?? editorCategory;
      await updateTask(editingTask.id, {
        title,
        domain_key: domainKeyToSend,
        xp: editorXp,
        frequency_type: frequency,
        schedule_period: SCHEDULE_PERIOD_BY_FREQUENCY[frequency],
        schedule_interval: 1,
        target_occurrences: parsedOccurrences,
      });
      setIsEditorVisible(false);
      resetEditor();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour cette quête.";
      Alert.alert("Erreur", message);
    } finally {
      setIsSaving(false);
    }
  }, [
    domainKeyOverrides,
    editorCategory,
    editorFrequency,
    editorOccurrences,
    editorTitle,
    editorXp,
    editingTask,
    resetEditor,
    updateTask,
  ]);

  const confirmDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        setDeletingTaskId(taskId);
        await deleteTask(taskId);
        if (editingTask && editingTask.id === taskId) {
          setIsEditorVisible(false);
          resetEditor();
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de supprimer cette quête.";
        Alert.alert("Erreur", message);
      } finally {
        setDeletingTaskId(null);
      }
    },
    [deleteTask, editingTask, resetEditor],
  );

  const handleDeletePress = useCallback(
    (task: TaskListItem) => {
      if (deletingTaskId) {
        return;
      }

      Alert.alert(
        "Supprimer cette quête ?",
        `Voulez-vous supprimer la quête "${task.title}" ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: () => {
              void confirmDeleteTask(task.id);
            },
          },
        ],
      );
    },
    [confirmDeleteTask, deletingTaskId],
  );

  const renderAddQuestButton = useCallback(
    () => (
      <Pressable
        style={({ pressed }) => [
          styles.addQuestButton,
          pressed && styles.addQuestButtonPressed,
        ]}
        onPress={() => router.push("/quests")}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une quête personnalisée"
      >
        <LinearGradient
          colors={["#7c3aed", "#ec4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addQuestButtonGradient}
        >
          <Feather name="plus" size={16} color="#f8fafc" />
          <Text style={styles.addQuestButtonLabel}>Ajouter une quête personnalisée</Text>
        </LinearGradient>
      </Pressable>
    ),
    [router],
  );

  const listHeaderComponent = useMemo(() => {
    if (personalQuests.length === 0) {
      return null;
    }
    return <View style={styles.listHeader}>{renderAddQuestButton()}</View>;
  }, [personalQuests, renderAddQuestButton]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TaskListItem>) => {
      const icon = item.icon ?? "⭐";
      const isBusy = pendingTaskId === item.id;
      const isDeleting = deletingTaskId === item.id;
      const isActionDisabled = isBusy || isDeleting || isSaving;
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
          <View style={styles.questControls}>
            {isDeleting ? (
              <ActivityIndicator
                size="small"
                color="#f87171"
                style={styles.questActionSpinner}
              />
            ) : (
              <View style={styles.questActionButtons}>
                <Pressable
                  onPress={() => handleEditPress(item)}
                  style={({ pressed }) => [
                    styles.questActionButton,
                    pressed && styles.questActionButtonPressed,
                    isActionDisabled && styles.questActionButtonDisabled,
                  ]}
                  disabled={isActionDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier ${item.title}`}
                >
                  <Feather name="edit-2" size={16} color="#f8fafc" />
                </Pressable>
                <Pressable
                  onPress={() => handleDeletePress(item)}
                  style={({ pressed }) => [
                    styles.questActionButton,
                    pressed && styles.questActionButtonPressed,
                    isActionDisabled && styles.questActionButtonDisabled,
                  ]}
                  disabled={isActionDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${item.title}`}
                >
                  <Feather name="trash-2" size={16} color="#f87171" />
                </Pressable>
              </View>
            )}
            {isBusy ? (
              <ActivityIndicator size="small" color="#818cf8" />
            ) : (
              <Switch
                value={item.show_in_global}
                onValueChange={(value) => handleToggle(item, value)}
                trackColor={{ false: "#475569", true: "#7c3aed" }}
                thumbColor={item.show_in_global ? "#f8fafc" : "#cbd5f5"}
                disabled={isDeleting || isSaving}
              />
            )}
          </View>
        </View>
      );
    },
    [deletingTaskId, handleDeletePress, handleEditPress, handleToggle, isSaving, pendingTaskId],
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
          Il n’y a pas de quêtes personnalisées.
        </Text>
        {renderAddQuestButton()}
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
            ListHeaderComponent={listHeaderComponent}
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
          <Modal
            visible={isEditorVisible}
            transparent
            animationType="slide"
            onRequestClose={handleCloseEditor}
          >
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.modalContainer}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Modifier la quête</Text>
                    <Pressable
                      onPress={handleCloseEditor}
                      disabled={isSaving}
                      accessibilityRole="button"
                      accessibilityLabel="Fermer la modification"
                      style={({ pressed }) => [
                        styles.modalCloseButton,
                        pressed && styles.modalCloseButtonPressed,
                        isSaving && styles.modalCloseButtonDisabled,
                      ]}
                    >
                      <Feather name="x" size={18} color="#f8fafc" />
                    </Pressable>
                  </View>
                  <ScrollView
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.modalSectionLabel}>Catégorie</Text>
                    <View style={styles.modalCategoryOptions}>
                      {CATEGORY_OPTIONS.map((categoryKey) => {
                        const category = CATEGORIES[categoryKey];
                        const isSelected = editorCategory === categoryKey;
                        return (
                          <Pressable
                            key={categoryKey}
                            style={({ pressed }) => [
                              styles.modalCategoryOption,
                              isSelected && styles.modalCategoryOptionSelected,
                              pressed && styles.modalCategoryOptionPressed,
                            ]}
                            onPress={() => handleEditorSelectCategory(categoryKey)}
                            disabled={isSaving}
                            accessibilityRole="button"
                            accessibilityLabel={`Sélectionner ${category.label}`}
                          >
                            <Text
                              style={[
                                styles.modalCategoryOptionLabel,
                                isSelected && styles.modalCategoryOptionLabelSelected,
                              ]}
                            >
                              {category.icon} {category.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={styles.modalSectionLabel}>Action</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ex: Méditer 10 minutes"
                      placeholderTextColor="#64748b"
                      value={editorTitle}
                      onChangeText={handleEditorTitleChange}
                      editable={!isSaving}
                    />

                    <Text style={styles.modalSectionLabel}>Fréquence</Text>
                    <View style={styles.modalFrequencyOptions}>
                      {FREQUENCY_CHOICES.map((option) => {
                        const isSelected = editorFrequency === option.value;
                        return (
                          <Pressable
                            key={option.value}
                            style={({ pressed }) => [
                              styles.modalFrequencyOption,
                              isSelected && styles.modalFrequencyOptionSelected,
                              pressed && styles.modalFrequencyOptionPressed,
                            ]}
                            onPress={() => handleEditorSelectFrequency(option.value)}
                            disabled={isSaving}
                            accessibilityRole="button"
                            accessibilityLabel={`Utiliser la fréquence ${option.label}`}
                          >
                            <Text
                              style={[
                                styles.modalFrequencyLabel,
                                isSelected && styles.modalFrequencyLabelSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Text style={styles.modalFrequencyHelper}>
                              {option.periodLabel}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={styles.modalSectionLabel}>Objectif</Text>
                    <Text style={styles.modalHelperText}>
                      Nombre de fois {editorOccurrencesHelper}
                    </Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder={editorFrequency === "weekly" ? "2" : "1"}
                      placeholderTextColor="#64748b"
                      value={editorOccurrences}
                      onChangeText={handleEditorOccurrencesChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      editable={!isSaving}
                    />
                  </ScrollView>
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={handleCloseEditor}
                      disabled={isSaving}
                      style={[
                        styles.modalSecondaryButton,
                        isSaving && styles.modalSecondaryButtonDisabled,
                      ]}
                    >
                      <Text style={styles.modalSecondaryButtonLabel}>Annuler</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveEditor}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.modalPrimaryButton,
                        pressed && styles.modalPrimaryButtonPressed,
                        isSaving && styles.modalPrimaryButtonDisabled,
                      ]}
                    >
                      <LinearGradient
                        colors={["#7c3aed", "#ec4899"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modalPrimaryGradient}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#f8fafc" />
                        ) : (
                          <Text style={styles.modalPrimaryButtonLabel}>Enregistrer</Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
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
    paddingBottom: 160,
    gap: 12,
  },
  listHeader: {
    marginBottom: 12,
  },
  addQuestButton: {
    borderRadius: 16,
    overflow: "hidden",
    alignSelf: "center",
  },
  addQuestButtonPressed: {
    opacity: 0.9,
  },
  addQuestButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 220,
  },
  addQuestButtonLabel: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: 14,
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
  questControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  questActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questActionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(79, 70, 229, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  questActionButtonPressed: {
    opacity: 0.85,
  },
  questActionButtonDisabled: {
    opacity: 0.5,
  },
  questActionSpinner: {
    marginRight: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 24,
    justifyContent: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "rgba(30, 41, 59, 0.98)",
    borderRadius: 24,
    padding: 20,
    gap: 16,
    maxHeight: 620,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(71, 85, 105, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseButtonPressed: {
    opacity: 0.8,
  },
  modalCloseButtonDisabled: {
    opacity: 0.4,
  },
  modalScrollContent: {
    gap: 16,
    paddingBottom: 8,
  },
  modalSectionLabel: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: 14,
  },
  modalCategoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalCategoryOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalCategoryOptionSelected: {
    borderColor: "rgba(129, 140, 248, 0.9)",
    backgroundColor: "rgba(129, 140, 248, 0.25)",
  },
  modalCategoryOptionPressed: {
    opacity: 0.85,
  },
  modalCategoryOptionLabel: {
    color: "#cbd5f5",
    fontSize: 13,
    fontWeight: "600",
  },
  modalCategoryOptionLabelSelected: {
    color: "#f8fafc",
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 14,
  },
  modalFrequencyOptions: {
    gap: 8,
  },
  modalFrequencyOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  modalFrequencyOptionSelected: {
    borderColor: "rgba(236, 72, 153, 0.9)",
    backgroundColor: "rgba(236, 72, 153, 0.25)",
  },
  modalFrequencyOptionPressed: {
    opacity: 0.85,
  },
  modalFrequencyLabel: {
    color: "#cbd5f5",
    fontWeight: "600",
    fontSize: 14,
  },
  modalFrequencyLabelSelected: {
    color: "#f8fafc",
  },
  modalFrequencyHelper: {
    color: "#94a3b8",
    fontSize: 12,
  },
  modalHelperText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  modalSecondaryButtonDisabled: {
    opacity: 0.5,
  },
  modalSecondaryButtonLabel: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: 14,
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  modalPrimaryButtonPressed: {
    opacity: 0.9,
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  modalPrimaryGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButtonLabel: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 14,
  },
});
