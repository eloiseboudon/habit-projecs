import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import {
  CATEGORIES,
  CATEGORY_OPTIONS,
  type CategoryKey,
} from "../constants/categories";

type Task = {
  id: string;
  title: string;
  category: CategoryKey;
  xp: number;
  completed: boolean;
};

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    title: "Hydratation du matin",
    category: "health",
    xp: 15,
    completed: false,
  },
  {
    id: "2",
    title: "Méditation express",
    category: "wellness",
    xp: 20,
    completed: false,
  },
  {
    id: "3",
    title: "Revue budget",
    category: "finance",
    xp: 25,
    completed: true,
  },
  {
    id: "4",
    title: "Lecture pro",
    category: "work",
    xp: 18,
    completed: false,
  },
];

export default function QuestsScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState<CategoryKey>(
    CATEGORY_OPTIONS[0]
  );
  const [newTaskText, setNewTaskText] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleCloseForm = () => {
    setShowAddTask(false);
    setCategoryPickerOpen(false);
    setNewTaskText("");
  };

  const addTask = () => {
    if (!newTaskText.trim()) {
      return;
    }

    setTasks((prev) => [
      {
        id: Date.now().toString(),
        title: newTaskText.trim(),
        category: newTaskCategory,
        xp: 20,
        completed: false,
      },
      ...prev,
    ]);

    handleCloseForm();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.taskCard, item.completed && styles.taskCardCompleted]}
              onPress={() => toggleTask(item.id)}
            >
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  toggleTask(item.id);
                }}
                hitSlop={10}
                style={[
                  styles.checkboxButton,
                  item.completed
                    ? styles.checkboxButtonCompleted
                    : styles.checkboxButtonDefault,
                ]}
              >
                {item.completed && (
                  <Feather name="check" size={16} color="#0f172a" />
                )}
              </Pressable>
              <View style={styles.taskContent}>
                <Text
                  style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}
                >
                  {item.title}
                </Text>
                <View style={styles.taskMetaRow}>
                  <Text style={styles.taskCategory}>
                    {CATEGORIES[item.category].icon} {CATEGORIES[item.category].label}
                  </Text>
                  <Text style={styles.taskXp}>+{item.xp} XP</Text>
                </View>
              </View>
            </Pressable>
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/")}
                style={styles.backButton}
              >
                <Feather name="chevron-left" size={22} color="#e5e7eb" />
              </Pressable>
              <Text style={styles.title}>Mes Quêtes du jour</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footerContent}>
              {!showAddTask ? (
                <Pressable
                  style={styles.addQuickButton}
                  onPress={() => setShowAddTask(true)}
                >
                  <Feather name="plus" size={18} color="#f9fafb" />
                  <Text style={styles.addQuickLabel}>Ajouter une tâche</Text>
                </Pressable>
              ) : (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Nouvelle tâche</Text>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Catégorie</Text>
                    <Pressable
                      style={styles.selectTrigger}
                      onPress={() => setCategoryPickerOpen((prev) => !prev)}
                    >
                      <Text style={styles.selectTriggerText}>
                        {CATEGORIES[newTaskCategory].icon} {" "}
                        {CATEGORIES[newTaskCategory].label}
                      </Text>
                      <Feather
                        name={categoryPickerOpen ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#cbd5f5"
                      />
                    </Pressable>
                    {categoryPickerOpen && (
                      <View style={styles.selectOptions}>
                        {CATEGORY_OPTIONS.map((category) => (
                          <Pressable
                            key={category}
                            style={styles.selectOption}
                            onPress={() => {
                              setNewTaskCategory(category);
                              setCategoryPickerOpen(false);
                            }}
                          >
                            <Text style={styles.selectOptionText}>
                              {CATEGORIES[category].icon} {CATEGORIES[category].label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Action</Text>
                    <TextInput
                      value={newTaskText}
                      onChangeText={setNewTaskText}
                      placeholder="Ex: Méditer 10 minutes"
                      placeholderTextColor="#64748b"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.formActions}>
                    <Pressable style={styles.cancelButton} onPress={handleCloseForm}>
                      <Text style={styles.cancelLabel}>Annuler</Text>
                    </Pressable>
                    <Pressable style={styles.submitButton} onPress={addTask}>
                      <Text style={styles.submitLabel}>Valider</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          }
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 140,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 28,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.45)",
    marginBottom: 12,
  },
  taskCardCompleted: {
    borderColor: "rgba(34, 197, 94, 0.55)",
    backgroundColor: "rgba(6, 95, 70, 0.2)",
  },
  checkboxButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxButtonDefault: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderColor: "rgba(75, 85, 99, 0.6)",
  },
  checkboxButtonCompleted: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  taskContent: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#6b7280",
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  taskCategory: {
    fontSize: 12,
    color: "#94a3b8",
  },
  taskXp: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c084fc",
  },
  footerContent: {
    marginTop: 16,
  },
  addQuickButton: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#7c3aed",
    borderWidth: 1,
    borderColor: "rgba(147, 51, 234, 0.4)",
  },
  addQuickLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.45)",
    padding: 20,
    gap: 20,
  },
  formTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  fieldBlock: {
    gap: 10,
  },
  fieldLabel: {
    color: "#cbd5f5",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  selectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.6)",
  },
  selectTriggerText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
  },
  selectOptions: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.6)",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectOptionText: {
    color: "#e2e8f0",
    fontSize: 14,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.6)",
    color: "white",
    fontSize: 15,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "rgba(51, 65, 85, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
});
