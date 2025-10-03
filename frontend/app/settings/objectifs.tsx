import { Feather } from "@expo/vector-icons";
import { useRootNavigationState, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../../components/BottomNav";
import { useAuth } from "../../context/AuthContext";
import { useHabitData } from "../../context/HabitDataContext";
import { fetchDomainSettings, updateDomainSettings } from "../../lib/api";
import type { UserDomainSetting } from "../../types/api";


type DomainSettingForm = UserDomainSetting & { targetInput: string };

export default function ObjectivesScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const {
    state: { status: authStatus },
  } = useAuth();
  const {
    state: { user },
    refresh,
  } = useHabitData();

  const [settings, setSettings] = useState<DomainSettingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (authStatus !== "authenticated") {
      router.replace("/login");
    }
  }, [authStatus, navigationState?.key, router]);

  const loadSettings = useCallback(
    async (withLoader: boolean) => {
      if (!user) {
        return;
      }
      if (withLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setErrorMessage(null);
      try {
        const response = await fetchDomainSettings(user.id);
        setSettings(
          response.map((item) => ({
            ...item,
            targetInput: String(item.weekly_target_points ?? 0),
          })),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de récupérer vos objectifs pour le moment.";
        setErrorMessage(message);
      } finally {
        if (withLoader) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [user],
  );

  useEffect(() => {
    if (user) {
      void loadSettings(true);
    }
  }, [user, loadSettings]);

  const hasActiveDomains = useMemo(() => settings.some((item) => item.is_enabled), [settings]);

  const handleChangeTarget = useCallback((domainId: number, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setSettings((previous) =>
      previous.map((item) =>
        item.domain_id === domainId ? { ...item, targetInput: sanitized } : item,
      ),
    );
  }, []);

  const handleToggleDomain = useCallback((domainId: number, enabled: boolean) => {
    setSettings((previous) =>
      previous.map((item) =>
        item.domain_id === domainId ? { ...item, is_enabled: enabled } : item,
      ),
    );
  }, []);

  const handleRefresh = useCallback(() => {
    void loadSettings(false);
  }, [loadSettings]);

  const handleSubmit = useCallback(async () => {
    if (!user || settings.length === 0) {
      return;
    }

    const payload = settings.map((item) => ({
      domain_id: item.domain_id,
      is_enabled: item.is_enabled,
      weekly_target_points: Number.parseInt(item.targetInput, 10) || 0,
    }));

    const hasInvalidTarget = payload.some(
      (item) => item.weekly_target_points < 0 || item.weekly_target_points > 100000,
    );

    if (hasInvalidTarget) {
      Alert.alert(
        "Valeur incorrecte",
        "Les objectifs doivent être compris entre 0 et 100 000 points.",
      );
      return;
    }

    try {
      setIsSaving(true);
      const response = await updateDomainSettings(user.id, { settings: payload });
      setSettings(
        response.map((item) => ({
          ...item,
          targetInput: String(item.weekly_target_points ?? 0),
        })),
      );
      await refresh();
      Alert.alert("Objectifs enregistrés", "Vos objectifs hebdomadaires ont été mis à jour.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer vos objectifs pour le moment.";
      Alert.alert("Erreur", message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, settings, user]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#58a6ff" />
          <Text style={styles.loadingLabel}>Chargement de vos objectifs…</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorLabel}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadSettings(true)}>
            <Text style={styles.retryLabel}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (settings.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorLabel}>Aucun domaine n'est disponible pour votre compte.</Text>
        </View>
      );
    }

    return (
      <View style={styles.formContainer}>
        <Text style={styles.introText}>
          Activez les domaines que vous souhaitez suivre et définissez un objectif de points
          hebdomadaire pour chacun d'entre eux.
        </Text>

        {settings.map((item) => (
          <View key={item.domain_id} style={styles.domainCard}>
            <View style={styles.domainHeader}>
              <View style={styles.domainIconWrapper}>
                <Text style={styles.domainIcon}>{item.icon ?? "⭐"}</Text>
              </View>
              <View style={styles.domainInfo}>
                <Text style={styles.domainTitle}>{item.domain_name}</Text>
                <Text style={styles.domainSubtitle}>{item.domain_key}</Text>
              </View>
              <Switch
                trackColor={{ false: "#64748b", true: "#1f6feb" }}
                thumbColor={item.is_enabled ? "#f8fafc" : "#cbd5f5"}
                value={item.is_enabled}
                onValueChange={(value) => handleToggleDomain(item.domain_id, value)}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Objectif hebdomadaire</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={item.targetInput}
                  onChangeText={(value) => handleChangeTarget(item.domain_id, value)}
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  maxLength={6}
                />
                <Text style={styles.inputSuffix}>pts</Text>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#f8fafc" />
          ) : (
            <Text style={styles.saveButtonLabel}>Enregistrer mes objectifs</Text>
          )}
        </TouchableOpacity>

        {!hasActiveDomains && (
          <Text style={styles.helpText}>
            Tous vos domaines sont désactivés pour le moment. Activez-en au moins un pour voir
            des statistiques dans le tableau de bord.
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#58a6ff"
            />
          }
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/settings");
                }
              }}
            >
              <Feather name="arrow-left" size={20} color="#f8fafc" />
              <Text style={styles.backLabel}>Paramètres</Text>
            </TouchableOpacity>
            <Text style={styles.screenHeading}>Objectifs</Text>
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
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1f6feb",
  },
  retryLabel: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  formContainer: {
    gap: 20,
  },
  introText: {
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 22,
  },
  domainCard: {
    backgroundColor: "#161b22",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 18,
    gap: 16,
  },
  domainHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  domainIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1f6feb22",
    alignItems: "center",
    justifyContent: "center",
  },
  domainIcon: {
    fontSize: 24,
  },
  domainInfo: {
    flex: 1,
  },
  domainTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "700",
  },
  domainSubtitle: {
    color: "#64748b",
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 15,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    color: "#f8fafc",
    fontSize: 16,
    minWidth: 60,
    textAlign: "right",
  },
  inputSuffix: {
    color: "#94a3b8",
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2563eb",
    shadowColor: "#2563eb",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonLabel: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  helpText: {
    color: "#facc15",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
