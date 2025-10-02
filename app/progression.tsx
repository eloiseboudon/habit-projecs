import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BottomNav from "../components/BottomNav";
import { CATEGORIES, type CategoryKey } from "../constants/categories";

type HistoryItem = {
  id: string;
  action: string;
  date: string;
  xp: number;
  category: CategoryKey;
};

const RECENT_HISTORY: HistoryItem[] = [
  {
    id: "h1",
    action: "Hydratation du matin",
    date: "Aujourd’hui • 08:30",
    xp: 15,
    category: "health",
  },
  {
    id: "h2",
    action: "Méditation express",
    date: "Aujourd’hui • 07:10",
    xp: 20,
    category: "wellness",
  },
  {
    id: "h3",
    action: "Revue budget",
    date: "Hier • 19:45",
    xp: 25,
    category: "finance",
  },
  {
    id: "h4",
    action: "Lecture pro",
    date: "Hier • 15:20",
    xp: 18,
    category: "work",
  },
];

const WEEKLY_STATS = [
  {
    id: "health",
    icon: "⚡",
    label: "Santé",
    highlight: "+35 XP",
    highlightColor: "#34d399",
  },
  {
    id: "finance",
    icon: "💰",
    label: "Finances",
    highlight: "+20 XP",
    highlightColor: "#facc15",
  },
  {
    id: "work",
    icon: "📚",
    label: "Travail",
    highlight: "+15 XP",
    highlightColor: "#60a5fa",
  },
  {
    id: "relations",
    icon: "❤️",
    label: "Relations",
    highlight: "+6 XP",
    highlightColor: "#f472b6",
  },
];

const UNLOCKED_BADGES = [
  {
    id: "b1",
    icon: "🏆",
    title: "3 jours consécutifs",
    subtitle: "Continue comme ça !",
  },
];

export default function ProgressionScreen() {
  const router = useRouter();


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <FlatList
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              <View style={styles.headerRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/")}
                  style={styles.backButton}
                >
                  <Feather name="chevron-left" size={22} color="#e5e7eb" />
                </Pressable>
                <Text style={styles.headerTitle}>Ma Progression</Text>
              </View>

              <Text style={styles.headerSubtitle}>
                Suis ton évolution et découvre les récompenses débloquées.
              </Text>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Historique récent</Text>
                <View>
                  {RECENT_HISTORY.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.historyItem,
                        index !== RECENT_HISTORY.length - 1 && styles.historyItemSpacing,
                      ]}
                    >
                      <Text style={styles.historyIcon}>
                        {CATEGORIES[item.category].icon}
                      </Text>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyAction}>{item.action}</Text>
                        <Text style={styles.historyDate}>{item.date}</Text>
                      </View>
                      <Text style={styles.historyXp}>+{item.xp} XP</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Statistiques hebdo</Text>
                <View style={styles.statsGrid}>
                  {WEEKLY_STATS.map((stat) => (
                    <View key={stat.id} style={styles.statCard}>
                      <Text style={styles.statIcon}>{stat.icon}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                      <Text
                        style={[styles.statHighlight, { color: stat.highlightColor }]}
                      >
                        {stat.highlight}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.badgeCard}>
                <Text style={styles.badgeCardTitle}>Badges débloqués</Text>
                {UNLOCKED_BADGES.map((badge) => (
                  <View key={badge.id} style={styles.badgeRow}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <View style={styles.badgeContent}>
                      <Text style={styles.badgeTitle}>{badge.title}</Text>
                      <Text style={styles.badgeSubtitle}>{badge.subtitle}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          }
          data={[]}
          keyExtractor={(_, index) => index.toString()}
          renderItem={() => null}
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
    paddingBottom: 140,
    paddingTop: 28,
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.65)",
    borderColor: "rgba(75, 85, 99, 0.45)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 26,
  },
  cardTitle: {
    color: "#c4b5fd",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerTitle: {
    color: "#f9fafb",
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#9ca3af",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  historyItem: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  historyItemSpacing: {
    marginBottom: 12,
  },
  historyIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyAction: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  historyDate: {
    color: "#6b7280",
    fontSize: 12,
  },
  historyXp: {
    color: "#c4b5fd",
    fontSize: 14,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 6,
  },
  statHighlight: {
    fontSize: 16,
    fontWeight: "700",
  },
  badgeCard: {
    backgroundColor: "rgba(202, 138, 4, 0.16)",
    borderColor: "rgba(234, 179, 8, 0.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    marginBottom: 40,
  },
  badgeCardTitle: {
    color: "#facc15",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 18,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  badgeIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  badgeContent: {
    flex: 1,
  },
  badgeTitle: {
    color: "#fbbf24",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  badgeSubtitle: {
    color: "#f3f4f6",
    fontSize: 12,
  },
});
