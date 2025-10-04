import { Feather } from "@expo/vector-icons";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import BottomNav from "../components/BottomNav";
import { CATEGORIES, type CategoryKey } from "../constants/categories";
import { useAuth } from "../context/AuthContext";
import { useHabitData } from "../context/HabitDataContext";

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
  const navigationState = useRootNavigationState();
  const {
    state: authState,
  } = useAuth();
  const {
    state: { status, progression, errorMessage },
    refresh,
    isRefreshing,
  } = useHabitData();

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (authState.status !== "authenticated") {
      router.replace("/login");
    }
  }, [authState.status, navigationState?.key, router]);

  const historyItems = useMemo(() => progression?.recent_history ?? [], [progression]);
  const weeklyStats = useMemo(() => progression?.weekly_stats ?? [], [progression]);
  const weeklyStatRows = useMemo(() => {
    const rows: typeof weeklyStats[] = [];
    for (let index = 0; index < weeklyStats.length; index += 2) {
      rows.push(weeklyStats.slice(index, index + 2));
    }
    return rows;
  }, [weeklyStats]);
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
    <LinearGradient colors={["#111827", "#111827", "#1f2937"]} style={styles.gradient}>
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
                  Suivez l’impact de vos habitudes et découvrez les récompenses débloquées.
                </Text>

                <View style={[styles.card, styles.blockSpacing]}>
                  <Text style={styles.cardTitle}>Statistiques hebdo</Text>
                  {weeklyStats.length === 0 ? (
                    <Text style={styles.emptyText}>Aucune donnée pour cette semaine.</Text>
                  ) : (
                    <View style={styles.statsGrid}>
                      {weeklyStatRows.map((row, rowIndex) => (
                        <View key={`weekly-row-${rowIndex}`} style={styles.statRow}>
                          {row.map((stat) => {
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
                          {row.length === 1 ? <View style={styles.statCardPlaceholder} /> : null}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={[styles.badgeCard, styles.blockSpacing]}>
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

                <View style={[styles.card, styles.blockSpacing]}>
                  <Text style={styles.cardTitle}>Historique récent</Text>
                  {historyItems.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun log enregistré récemment.</Text>
                  ) : (
                    historyItems.map((item) => {
                      const category = CATEGORIES[item.domain_key as CategoryKey] ?? null;
                      const icon = item.icon ?? category?.icon ?? "⭐";
                      return (
                        <View key={item.id} style={styles.historyItem}>
                          <View style={styles.historyIconWrapper}>
                            <Text style={styles.historyIcon}>{icon}</Text>
                          </View>
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
              </>
            }
          />
          <BottomNav />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  screen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
    paddingTop: 28,
    gap: 24,
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
    color: "#f3f4f6",
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#9ca3af",
    fontSize: 15,
    marginTop: 8,
  },
  card: {
    backgroundColor: "rgba(31, 41, 55, 0.7)",
    borderColor: "rgba(75, 85, 99, 0.35)",
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 18,
  },
  blockSpacing: {
    marginBottom: 24,
  },
  cardTitle: {
    color: "#c4b5fd",
    fontSize: 18,
    fontWeight: "700",
  },
  statsGrid: {
    gap: 14,
  },
  statRow: {
    flexDirection: "row",
    gap: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.2)",
    padding: 16,
    gap: 6,
  },
  statCardPlaceholder: {
    flex: 1,
    opacity: 0,
  },
  statIcon: {
    fontSize: 26,
  },
  statLabel: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
  },
  statHighlight: {
    color: "#34d399",
    fontSize: 16,
    fontWeight: "700",
  },
  statSubHighlight: {
    color: "#94a3b8",
    fontSize: 12,
  },
  badgeCard: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(252, 211, 77, 0.35)",
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 18,
  },
  badgeCardTitle: {
    color: "#fcd34d",
    fontSize: 18,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
    borderRadius: 18,
    padding: 16,
  },
  badgeIcon: {
    fontSize: 30,
  },
  badgeContent: {
    flex: 1,
    gap: 4,
  },
  badgeTitle: {
    color: "#fef3c7",
    fontSize: 16,
    fontWeight: "700",
  },
  badgeSubtitle: {
    color: "#facc15",
    fontSize: 13,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 20,
    padding: 18,
  },
  historyIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    alignItems: "center",
    justifyContent: "center",
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
    color: "#9ca3af",
    fontSize: 13,
  },
  historyXp: {
    color: "#a855f7",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#d1d5db",
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
