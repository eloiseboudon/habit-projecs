import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BottomNav from "../components/BottomNav";

const HISTORY = [
  {
    id: "h1",
    date: "Aujourd&apos;hui",
    items: [
      { label: "Hydratation du matin", xp: 15 },
      { label: "Méditation express", xp: 20 },
    ],
  },
  {
    id: "h2",
    date: "Hier",
    items: [
      { label: "Revue budget", xp: 25 },
      { label: "Sortie avec un ami", xp: 18 },
      { label: "Lecture professionnelle", xp: 30 },
    ],
  },
];

const BADGES = [
  { id: "b1", title: "Routine de Fer", description: "5 jours consécutifs" },
  { id: "b2", title: "Maître des finances", description: "Budget hebdo validé" },
  { id: "b3", title: "Zen absolu", description: "3 séances bien-être" },
];

export default function ProgressionScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <FlatList
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Progression</Text>
                <Text style={styles.subtitle}>
                  Suis ton évolution et découvre les récompenses débloquées.
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Historique des actions</Text>
                {HISTORY.map((day) => (
                  <View key={day.id} style={styles.historySection}>
                    <Text style={styles.historyDate}>{day.date}</Text>
                    {day.items.map((item, index) => (
                      <View key={index} style={styles.historyItem}>
                        <Text style={styles.historyLabel}>{item.label}</Text>
                        <Text style={styles.historyXp}>+{item.xp} XP</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Stats hebdo / mensuelles</Text>
                <View style={styles.statRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>12</Text>
                    <Text style={styles.statLabel}>Tâches validées</Text>
                    <Text style={styles.statDelta}>+4 vs semaine passée</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>420 XP</Text>
                    <Text style={styles.statLabel}>Cette semaine</Text>
                    <Text style={styles.statDeltaPositive}>+12%</Text>
                  </View>
                </View>
                <View style={styles.statRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>38</Text>
                    <Text style={styles.statLabel}>Actions ce mois</Text>
                    <Text style={styles.statDelta}>Objectif 45</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>3</Text>
                    <Text style={styles.statLabel}>Jours à 100%</Text>
                    <Text style={styles.statDelta}>Encore 2 pour un badge</Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Badges débloqués</Text>
                <View style={styles.badgeGrid}>
                  {BADGES.map((badge) => (
                    <View key={badge.id} style={styles.badge}>
                      <View style={styles.badgeIcon}>
                        <Text style={styles.badgeIconText}>🏅</Text>
                      </View>
                      <Text style={styles.badgeTitle}>{badge.title}</Text>
                      <Text style={styles.badgeDescription}>{badge.description}</Text>
                    </View>
                  ))}
                </View>
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
    backgroundColor: "#0d1117",
  },
  screen: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#161b22",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  historySection: {
    marginBottom: 20,
  },
  historyDate: {
    color: "#c9d1d9",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0d1117",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#21262d",
    padding: 12,
    marginBottom: 10,
  },
  historyLabel: {
    color: "white",
    fontSize: 15,
  },
  historyXp: {
    color: "#2ea043",
    fontSize: 15,
    fontWeight: "600",
  },
  statRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  statBlock: {
    flex: 1,
    backgroundColor: "#0d1117",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#21262d",
    padding: 16,
    gap: 6,
  },
  statValue: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    color: "#8b949e",
    fontSize: 14,
  },
  statDelta: {
    color: "#c9d1d9",
    fontSize: 12,
  },
  statDeltaPositive: {
    color: "#2ea043",
    fontSize: 12,
    fontWeight: "600",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  badge: {
    width: "30%",
    minWidth: 110,
    backgroundColor: "#0d1117",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#21262d",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1f6feb",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIconText: {
    fontSize: 26,
  },
  badgeTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  badgeDescription: {
    color: "#8b949e",
    fontSize: 12,
    textAlign: "center",
  },
});
