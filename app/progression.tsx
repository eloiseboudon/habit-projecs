import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import BottomNav from "../components/BottomNav";
import { useHabitData } from "../context/HabitDataContext";
import { CATEGORIES, type CategoryKey } from "../constants/categories";

function formatHistoryDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const todayLabel = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const dateLabel = date.toDateString();

  if (dateLabel === todayLabel) {
    return `Aujourd’hui • ${formatter.format(date)}`;
  }
  if (dateLabel === yesterday.toDateString()) {
    return `Hier • ${formatter.format(date)}`;
  }
  return `${date.toLocaleDateString("fr-FR")} • ${formatter.format(date)}`;
}

export default function ProgressionScreen() {
  const router = useRouter();
  const {
    state: { status, progression, errorMessage },
    refresh,
    isRefreshing,
  } = useHabitData();

  const historyItems = useMemo(() => progression?.recent_history ?? [], [progression]);
  const weeklyStats = useMemo(() => progression?.weekly_stats ?? [], [progression]);
  const badges = useMemo(() => progression?.badges ?? [], [progression]);

  if ((status === "loading" || status === "idle") && !progression) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.screen, styles.centered]}>
          <ActivityIndicator size="large" color="#58a6ff" />
          <Text style={styles.loadingLabel}>Chargement de votre progression…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === "error" && !progression) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.screen, styles.centered]}>
          <Text style={styles.errorLabel}>{errorMessage ?? "Impossible de charger la progression."}</Text>
          <Pressable style={styles.retryButton} onPress={() => refresh()}>
            <Text style={styles.retryButtonLabel}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <FlatList
          data={[]}
          keyExtractor={(_, index) => index.toString()}
          renderItem={() => null}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => refresh()} tintColor="#58a6ff" />
          }
          ListHeaderComponent={
            <>
              <View style={styles.headerRow}>
                <Pressable accessibilityRole="button" onPress={() => router.push("/")} style={styles.backButton}>
                  <Feather name="chevron-left" size={22} color="#e5e7eb" />
                </Pressable>
                <Text style={styles.headerTitle}>Ma Progression</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Suivez l’impact de vos habitudes et découvrez les récompenses débloquées.
              </Text>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Historique récent</Text>
                {historyItems.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun log enregistré récemment.</Text>
                ) : (
                  historyItems.map((item) => {
                    const category = CATEGORIES[item.domain_key as CategoryKey] ?? null;
                    const icon = item.icon ?? category?.icon ?? "⭐";
                    return (
                      <View key={item.id} style={styles.historyItem}>
                        <Text style={styles.historyIcon}>{icon}</Text>
                        <View style={styles.historyContent}>
                          <Text style={styles.historyAction}>{item.title}</Text>
                          <Text style={styles.historyDate}>{formatHistoryDate(item.occurred_at)}</Text>
                        </View>
                        <Text style={styles.historyXp}>+{item.xp_awarded} XP</Text>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Statistiques hebdo</Text>
                {weeklyStats.length === 0 ? (
                  <Text style={styles.emptyText}>Aucune donnée pour cette semaine.</Text>
                ) : (
                  <View style={styles.statsGrid}>
                    {weeklyStats.map((stat) => {
                      const category = CATEGORIES[stat.domain_key as CategoryKey] ?? null;
                      const icon = stat.icon ?? category?.icon ?? "📈";
                      const label = category?.label ?? stat.domain_name;
                      return (
                        <View key={stat.domain_id} style={styles.statCard}>
                          <Text style={styles.statIcon}>{icon}</Text>
                          <Text style={styles.statLabel}>{label}</Text>
                          <Text style={styles.statHighlight}>+{stat.weekly_xp} XP</Text>
                          <Text style={styles.statSubHighlight}>{stat.weekly_points} pts</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.badgeCard}>
                <Text style={styles.badgeCardTitle}>Badges débloqués</Text>
                {badges.length === 0 ? (
                  <Text style={styles.emptyText}>Continuez à progresser pour débloquer vos premiers badges !</Text>
                ) : (
                  badges.map((badge) => (
                    <View key={badge.id} style={styles.badgeRow}>
                      <Text style={styles.badgeIcon}>🏆</Text>
                      <View style={styles.badgeContent}>
                        <Text style={styles.badgeTitle}>{badge.title}</Text>
                        <Text style={styles.badgeSubtitle}>{badge.subtitle}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
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
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  headerTitle: {
    color: "#e2e8f0",
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 15,
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.65)",
    borderColor: "rgba(75, 85, 99, 0.45)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    color: "#e2e8f0",
    fontSize: 18,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "48%",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    padding: 16,
    gap: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  statLabel: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "600",
  },
  statHighlight: {
    color: "#34d399",
    fontSize: 15,
    fontWeight: "600",
  },
  statSubHighlight: {
    color: "#94a3b8",
    fontSize: 13,
  },
  badgeCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  badgeCardTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeContent: {
    flex: 1,
    gap: 4,
  },
  badgeTitle: {
    color: "#f9fafb",
    fontSize: 16,
    fontWeight: "600",
  },
  badgeSubtitle: {
    color: "#cbd5f5",
    fontSize: 14,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.35)",
    borderRadius: 20,
    padding: 18,
  },
  historyIcon: {
    fontSize: 24,
  },
  historyContent: {
    flex: 1,
    gap: 4,
  },
  historyAction: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },
  historyDate: {
    color: "#94a3b8",
    fontSize: 13,
  },
  historyXp: {
    color: "#facc15",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#cbd5f5",
    fontSize: 15,
    textAlign: "center",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingLabel: {
    color: "#cbd5f5",
    fontSize: 16,
    textAlign: "center",
  },
  errorLabel: {
    color: "#f87171",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 12,
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
