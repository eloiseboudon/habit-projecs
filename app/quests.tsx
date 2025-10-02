import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

const CATEGORY_MAP = {
  health: { label: "Santé", icon: "🩺" },
  finance: { label: "Finances", icon: "💰" },
  work: { label: "Travail", icon: "🧠" },
  relations: { label: "Relations", icon: "🤝" },
  wellness: { label: "Bien-être", icon: "🧘" },
} as const;

type CategoryKey = keyof typeof CATEGORY_MAP;

type Task = {
  id: string;
  title: string;
  category: CategoryKey;
  xp: number;
  completed: boolean;
};

const FAVORITE_TASKS: Task[] = [
  {
    id: "1",
    title: "Hydratation du matin",
    category: "health",
    xp: 15,
    completed: false,
  },
  {
    id: "2",
    title: "Revue budget",
    category: "finance",
    xp: 25,
    completed: false,
  },
  {
    id: "3",
    title: "Point équipe",
    category: "work",
    xp: 30,
    completed: false,
  },
];
const CATEGORY_OPTIONS = Object.keys(CATEGORY_MAP) as CategoryKey[];

export default function QuestsScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState(FAVORITE_TASKS);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(
    CATEGORY_OPTIONS[0]
  );
  const [taskTitle, setTaskTitle] = useState("");
  const [xp, setXp] = useState(20);

  const totalXp = useMemo(
    () => tasks.reduce((acc, task) => acc + (task.completed ? task.xp : 0), 0),
    [tasks]
  );

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const addTask = () => {
    if (!taskTitle.trim() || !selectedCategory) {
      return;
    }

    setTasks((prev) => [
      {
        id: Date.now().toString(),
        title: taskTitle.trim(),
        category: selectedCategory,
        xp,
        completed: false,
      },
      ...prev,
    ]);

    setTaskTitle("");
    setXp(20);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <FlatList
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Pressable onPress={() => router.push("/")}>
                <Text style={styles.backLink}>← Accueil</Text>
              </Pressable>
              <Text style={styles.title}>Mes Quêtes</Text>
            </View>
          }
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
                  <Feather name="check" size={16} color="#0d1117" />
                )}
              </Pressable>
              <View style={styles.taskContent}>
                <Text
                  style={[
                    styles.taskTitle,
                    item.completed && styles.taskTitleCompleted,
                  ]}
                >
                  {item.title}
                </Text>
                <View style={styles.taskMetaRow}>
                  <Text style={styles.taskCategory}>
                    {CATEGORY_MAP[item.category].icon} {CATEGORY_MAP[item.category].label}
                  </Text>
                  <Text style={styles.taskXp}>+{item.xp} XP</Text>
                </View>
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            <View style={styles.footerContent}>
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Ajouter une tâche</Text>
                <Text style={styles.sectionDescription}>
                  Choisis une catégorie, écris ta mission et gagne de l’XP en un
                  clin d’œil.
                </Text>

                <View style={styles.categoryRow}>
                  {CATEGORY_OPTIONS.map((category) => (
                    <Pressable
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.categoryLabel,
                          selectedCategory === category && styles.categoryLabelActive,
                        ]}
                      >
                        {CATEGORY_MAP[category].label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="Saisie rapide..."
                  placeholderTextColor="#6e7681"
                  style={styles.input}
                />

                <View style={styles.xpRow}>
                  <Text style={styles.xpLabel}>Gain XP</Text>
                  <View style={styles.xpAdjusters}>
                    {[10, 20, 40].map((value) => (
                      <Pressable
                        key={value}
                        style={[styles.xpButton, xp === value && styles.xpButtonActive]}
                        onPress={() => setXp(value)}
                      >
                        <Text
                          style={[
                            styles.xpButtonLabel,
                            xp === value && styles.xpButtonLabelActive,
                          ]}
                        >
                          +{value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable style={styles.addTaskButton} onPress={addTask}>
                    <Text style={styles.addTaskLabel}>+ Ajouter</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.footerSummary}>
                <Text style={styles.footerText}>
                  XP validée aujourd’hui : <Text style={styles.footerHighlight}>{totalXp} XP</Text>
                </Text>
              </View>
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
    backgroundColor: "#0d1117",
  },
  screen: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
    backgroundColor: "#0d1117",
  },
  backLink: {
    color: "#58a6ff",
    fontSize: 16,
    marginBottom: 12,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  formCard: {
    backgroundColor: "#161b22",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 24,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionDescription: {
    color: "#8b949e",
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#21262d",
  },
  categoryChipActive: {
    backgroundColor: "#1f6feb",
  },
  categoryLabel: {
    color: "#8b949e",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryLabelActive: {
    color: "white",
  },
  input: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#30363d",
    color: "white",
    fontSize: 16,
  },
  xpRow: {
    marginTop: 20,
    gap: 12,
  },
  xpLabel: {
    color: "#c9d1d9",
    fontSize: 16,
    fontWeight: "600",
  },
  xpAdjusters: {
    flexDirection: "row",
    gap: 12,
  },
  xpButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    backgroundColor: "#161b22",
  },
  xpButtonActive: {
    backgroundColor: "#2ea043",
    borderColor: "#3fb950",
  },
  xpButtonLabel: {
    color: "#8b949e",
    fontSize: 15,
    fontWeight: "600",
  },
  xpButtonLabelActive: {
    color: "white",
  },
  addTaskButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#1f6feb",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addTaskLabel: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(22, 27, 34, 0.7)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(48, 54, 61, 0.6)",
    marginBottom: 12,
  },
  taskCardCompleted: {
    borderColor: "rgba(34, 197, 94, 0.6)",
    backgroundColor: "rgba(20, 83, 45, 0.2)",
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
    backgroundColor: "rgba(13, 17, 23, 0.9)",
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
    color: "#9ca3af",
  },
  taskXp: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a855f7",
  },
  footerSummary: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#30363d",
    backgroundColor: "#161b22",
  },
  footerContent: {
    gap: 20,
  },
  footerText: {
    color: "#8b949e",
    fontSize: 15,
  },
  footerHighlight: {
    color: "#2ea043",
    fontWeight: "700",
  },
});
