import { Feather } from "@expo/vector-icons";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import BottomNav from "../../components/BottomNav";
import { useAuth } from "../../context/AuthContext";

const SETTINGS_OPTIONS = [
  {
    title: "Objectifs",
    description: "Définissez une cible hebdomadaire pour chaque domaine.",
    icon: "target" as const,
    route: "/settings/objectifs",
  },
  {
    title: "Profil",
    description: "Modifiez vos informations personnelles et préférences.",
    icon: "user" as const,
    route: "/settings/profile",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const {
    state: { status: authStatus },
  } = useAuth();

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (authStatus !== "authenticated") {
      router.replace("/login");
    }
  }, [authStatus, navigationState?.key, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/");
                }
              }}
            >
              <Feather name="arrow-left" size={20} color="#f8fafc" />
              <Text style={styles.backLabel}>Retour</Text>
            </TouchableOpacity>
            <Text style={styles.screenHeading}>Paramètres</Text>
          </View>

          <View style={styles.cards}>
            {SETTINGS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.route}
                style={styles.card}
                onPress={() => router.push(option.route as never)}
                activeOpacity={0.85}
              >
                <View style={styles.cardIconWrapper}>
                  <Feather name={option.icon} size={24} color="#f8fafc" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardDescription}>{option.description}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}
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
    paddingTop: 24,
    paddingBottom: 120,
    gap: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
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
  backLabel: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  screenHeading: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
  },
  cards: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#161b22",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#30363d",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1f6feb33",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  cardDescription: {
    color: "#94a3b8",
    fontSize: 14,
  },
});
