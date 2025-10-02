import { Feather } from "@expo/vector-icons";
import { Redirect, useRootNavigationState, useRouter } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../components/BottomNav";
import { CATEGORIES, CATEGORY_OPTIONS } from "../constants/categories";
import { useAuth } from "../context/AuthContext";
import { useHabitData } from "../context/HabitDataContext";

const DOMAIN_COLORS: Record<string, string> = {
  health: "#10b981",
  finance: "#f59e0b",
  work: "#3b82f6",
  relations: "#ec4899",
  wellness: "#8b5cf6",
};

export default function Index() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const {
    state: authState,
    logout,
  } = useAuth();
  const {
    state: { status, dashboard, errorMessage },
    refresh,
    isRefreshing,
  } = useHabitData();

  if (!navigationState?.key) {
    return null;
  }

  if (authState.status !== "authenticated") {
    return <Redirect href="/login" />;
  }

  const renderContent = () => {
    if ((status === "loading" || status === "idle") && !dashboard) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#58a6ff" />
          <Text style={styles.loadingLabel}>Chargement de votre tableau de bord…</Text>
        </View>
      );
    }

    if (status === "error" && !dashboard) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorLabel}>{errorMessage ?? "Une erreur est survenue."}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
            <Text style={styles.retryButtonLabel}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!dashboard) {
      return null;
    }

    const statsByKey = new Map(
      dashboard.domain_stats.map((stat) => [stat.domain_key, stat]),
    );
    const orderedStats = CATEGORY_OPTIONS.map((key, index) => {
      const stat = statsByKey.get(key);
      if (stat) {
        statsByKey.delete(key);
        return stat;
      }
      const category = CATEGORIES[key];
      return {
        domain_id: -(index + 1),
        domain_key: key,
        domain_name: category.label,
        icon: category.icon,
        weekly_points: 0,
        weekly_target: 0,
        weekly_xp: 0,
        progress_ratio: 0,
      };
    });
    const statsToDisplay = [...orderedStats, ...statsByKey.values()];

    return (
      <>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{dashboard.initials}</Text>
          </View>
          <View>
            <Text style={styles.displayName}>{dashboard.display_name}</Text>
            <Text style={styles.levelLabel}>Niveau {dashboard.level}</Text>
            <Text style={styles.xpText}>
              {dashboard.current_xp} XP / {dashboard.xp_to_next} XP
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          {statsToDisplay.map((stat) => {
            const color = DOMAIN_COLORS[stat.domain_key] ?? "#58a6ff";
            return (
              <View key={`${stat.domain_key}-${stat.domain_id}`} style={styles.statRow}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>
                    {stat.icon ? `${stat.icon} ` : ""}
                    {stat.domain_name}
                  </Text>
                  <Text style={styles.statValue}>{Math.round(stat.progress_ratio * 100)}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(stat.progress_ratio * 100, 100)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.statSubtitle}>
                  {stat.weekly_points} pts / {stat.weekly_target} visés • {stat.weekly_xp} XP
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.ctaButton, styles.questsButton]}
            onPress={() => router.push("/quests")}
            activeOpacity={0.85}
          >
            <Feather name="target" size={28} color="#ffffff" />
            <Text style={styles.ctaLabel}>Mes Quêtes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaButton, styles.progressButton]}
            onPress={() => router.push("/progression")}
            activeOpacity={0.85}
          >
            <Feather name="trending-up" size={28} color="#ffffff" />
            <Text style={styles.ctaLabel}>Progression</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => refresh()} tintColor="#58a6ff" />
          }
        >
          <View style={styles.topBar}>
            <Text style={styles.screenHeading}>Tableau de bord</Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                logout();
                router.replace("/login");
              }}
            >
              <Feather name="log-out" size={18} color="#f8fafc" />
              <Text style={styles.logoutLabel}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
          {renderContent()}
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenHeading: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#30363d",
    backgroundColor: "#161b2233",
  },
  logoutLabel: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
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
  displayName: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  levelLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  xpText: {
    color: "#8b949e",
    fontSize: 14,
  },
  statsContainer: {
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 120,
    gap: 16,
    alignItems: "center",
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
  statRow: {
    backgroundColor: "#161b22",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#30363d",
    gap: 10,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: {
    color: "#c9d1d9",
    fontSize: 16,
    fontWeight: "600",
  },
  statValue: {
    color: "#8b949e",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
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
    borderRadius: 8,
  },
  statSubtitle: {
    color: "#8b949e",
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 16,
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  questsButton: {
    backgroundColor: "#1d4ed8",
    borderColor: "#3b82f6",
    shadowColor: "#2563eb",
  },
  progressButton: {
    backgroundColor: "#7c3aed",
    borderColor: "#a855f7",
    shadowColor: "#8b5cf6",
  },
  ctaLabel: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
