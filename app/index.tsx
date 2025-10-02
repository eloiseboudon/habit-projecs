import { useRouter } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNav from "../components/BottomNav";

const STAT_BARS = [
  { label: "Santé", value: 0.8, color: "#10b981", icon: '⚡' },
  { label: "Énergie", value: 0.65, color: "#2ea043", icon: '🔋' },
  { label: "Discipline", value: 0.72, color: "#3b82f6", icon: '🛡️' },
  { label: "Finances", value: 0.4, color: "#f59e0b", icon: '💰' },
  { label: "Relations", value: 0.55, color: "#ec4899", icon: '👥' },
  { label: "Bien-être", value: 0.9, color: "#8b5cf6", icon: '🧘' },
];

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>JD</Text>
            </View>
            <View>
              <Text style={styles.levelLabel}>Niveau 12</Text>
              <Text style={styles.xpText}>340 XP / 500 XP</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            {STAT_BARS.map((stat) => (
              <View key={stat.label} style={styles.statRow}>
                <Text style={styles.statLabel}>{stat.icon} {stat.label}</Text>
                <Text style={styles.statValue}>
                  {Math.round(stat.value * 100)}%
                </Text>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(stat.value * 100, 100)}%`,
                        backgroundColor: stat.color,
                      },
                    ]}
                  />
                </View>

              </View>
            ))}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.primaryButton]}
              onPress={() => router.push("/quests")}
            >
              <Text style={styles.ctaLabel}>Mes Quêtes</Text>
              <Text style={styles.ctaDescription}>
                Consulte tes priorités et ajoute de nouvelles missions quotidiennes.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctaButton, styles.secondaryButton]}
              onPress={() => router.push("/progression")}
            >
              <Text style={styles.ctaLabel}>Progression</Text>
              <Text style={styles.ctaDescription}>
                Analyse ton historique et célèbre les badges débloqués.
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 120,
    gap: 32,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#161b22",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1f6feb",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
  },
  levelLabel: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  xpText: {
    color: "#8b949e",
    fontSize: 14,
  },
  statsContainer: {
    gap: 16,
  },
  sectionTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  statRow: {
    backgroundColor: "#161b22",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#30363d",
    gap: 10,
  },
  statLabel: {
    color: "#c9d1d9",
    fontSize: 16,
    fontWeight: "600",
  },
  progressBarBackground: {
    height: 12,
    borderRadius: 8,
    backgroundColor: "#21262d",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2ea043",
  },
  statValue: {
    color: "#8b949e",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
  },
  actionButtons: {
    gap: 16,
  },
  ctaButton: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: "#1f6feb",
    borderColor: "#58a6ff",
  },
  secondaryButton: {
    backgroundColor: "#161b22",
    borderColor: "#30363d",
  },
  ctaLabel: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  ctaDescription: {
    color: "#c9d1d9",
    fontSize: 14,
    lineHeight: 20,
  },
});
