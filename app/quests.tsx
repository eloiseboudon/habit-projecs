import { useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";

type Task = {
  id: string;
  title: string;
  category: string;
  xp: number;
  completed: boolean;
};

const FAVORITE_TASKS: Task[] = [
  {
    id: "1",
    title: "Hydratation du matin",
    category: "Santé",
    xp: 15,
    completed: false,
  },
  {
    id: "2",
    title: "Revue budget",
    category: "Finances",
    xp: 25,
    completed: false,
  },
  {
    id: "3",
    title: "Point équipe",
    category: "Travail",
    xp: 30,
    completed: false,
  },
];

const CATEGORIES = ["Santé", "Finances", "Travail", "Relations", "Bien-être"];

export default function QuestsScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState(FAVORITE_TASKS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    CATEGORIES[0]
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
            <>
              <View style={styles.header}>
                <Pressable onPress={() => router.push("/")}>
                  <Text style={styles.backLink}>← Accueil</Text>
                </Pressable>
                <Text style={styles.title}>Quêtes & Tâches</Text>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Ajouter une tâche</Text>
                <Text style={styles.sectionDescription}>
                  Choisis une catégorie, écris ta mission et gagne de l’XP en un
                  clin d’œil.
                </Text>

                <View style={styles.categoryRow}>
                  {CATEGORIES.map((category) => (
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
                        {category}
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
            </>
          }
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.taskCard, item.completed && styles.taskCardCompleted]}
              onPress={() => toggleTask(item.id)}
            >
              <View style={styles.checkbox}>
                <View style={[styles.checkboxInner, item.completed && styles.checkboxChecked]} />
              </View>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                <Text style={styles.taskMeta}>
                  {item.category} · {item.xp} XP
                </Text>
              </View>
              <Text style={styles.taskAction}>{item.completed ? "Validée" : "Valider"}</Text>
            </Pressable>
          )}
          ListFooterComponent={
            <View style={styles.footerSummary}>
              <Text style={styles.footerText}>
                XP validée aujourd’hui : <Text style={styles.footerHighlight}>{totalXp} XP</Text>
              </Text>
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
    alignItems: "center",
    gap: 16,
    backgroundColor: "#161b22",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 12,
  },
  taskCardCompleted: {
    borderColor: "#2ea043",
    backgroundColor: "#182c1f",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#58a6ff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d1117",
  },
  checkboxInner: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#58a6ff",
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
  taskMeta: {
    color: "#8b949e",
    fontSize: 13,
  },
  taskAction: {
    color: "#58a6ff",
    fontSize: 14,
    fontWeight: "600",
  },
  footerSummary: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#30363d",
    backgroundColor: "#161b22",
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
