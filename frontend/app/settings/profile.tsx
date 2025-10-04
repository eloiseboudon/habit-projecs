import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRootNavigationState, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import ReadyPlayerMeAvatar from "../../components/ReadyPlayerMeAvatar";
import ReadyPlayerMeCreatorModal from "../../components/ReadyPlayerMeCreatorModal";
import { getAvatarAsset } from "../../constants/avatarAssets";
import { AVATAR_OPTIONS } from "../../constants/avatarTypes";
import { useAuth } from "../../context/AuthContext";
import { useHabitData } from "../../context/HabitDataContext";
import { fetchUserProfile, updateUserProfile } from "../../lib/api";
import type { AvatarType } from "../../types/api";


type ProfileFormState = {
  displayName: string;
  email: string;
  timezone: string;
  language: string;
  notificationsEnabled: boolean;
  firstDayOfWeek: string;
  avatarType: AvatarType;
  avatarUrl: string | null;
};

const INITIAL_FORM: ProfileFormState = {
  displayName: "",
  email: "",
  timezone: "",
  language: "fr",
  notificationsEnabled: true,
  firstDayOfWeek: "1",
  avatarType: "explorateur",
  avatarUrl: null,
};

export default function ProfileScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const {
    state: { status: authStatus, user: authUser },
    updateUser,
  } = useAuth();
  const {
    state: { user, dashboard },
    refresh,
  } = useHabitData();

  const [form, setForm] = useState<ProfileFormState>(INITIAL_FORM);
  const [initialAvatarType, setInitialAvatarType] = useState<AvatarType | null>(null);
  const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);
  const [isSelectingFallbackAvatar, setIsSelectingFallbackAvatar] = useState(false);
  const [isAvatarCreatorVisible, setIsAvatarCreatorVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const avatarPreviewLevel = dashboard?.level ?? 1;

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (authStatus !== "authenticated") {
      router.replace("/login");
    }
  }, [authStatus, navigationState?.key, router]);

  const loadProfile = useCallback(async () => {
    if (!user) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchUserProfile(user.id);
      setForm({
        displayName: response.display_name,
        email: response.email,
        timezone: response.timezone,
        language: response.language,
        notificationsEnabled: response.notifications_enabled,
        firstDayOfWeek: String(response.first_day_of_week ?? 1),
        avatarType: response.avatar_type,
        avatarUrl: response.avatar_url ?? null,
      });
      setInitialAvatarType(response.avatar_type);
      setInitialAvatarUrl(response.avatar_url ?? null);
      setIsSelectingFallbackAvatar(false);
      setIsAvatarCreatorVisible(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de charger votre profil pour le moment.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadProfile();
    }
  }, [user, loadProfile]);

  const handleChange = useCallback(<T extends keyof ProfileFormState>(key: T, value: ProfileFormState[T]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      return;
    }

    const trimmedName = form.displayName.trim();
    if (!trimmedName) {
      Alert.alert("Nom requis", "Veuillez indiquer un nom d’affichage valide.");
      return;
    }

    const firstDay = Number.parseInt(form.firstDayOfWeek, 10);
    if (Number.isNaN(firstDay) || firstDay < 0 || firstDay > 6) {
      Alert.alert(
        "Valeur invalide",
        "Le premier jour de la semaine doit être compris entre 0 (dimanche) et 6 (samedi).",
      );
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        display_name: trimmedName,
        email: form.email.trim(),
        timezone: form.timezone.trim(),
        language: form.language.trim() || "fr",
        notifications_enabled: form.notificationsEnabled,
        first_day_of_week: firstDay,
        avatar_type: form.avatarType,
        avatar_url: form.avatarUrl,
      };
      const response = await updateUserProfile(user.id, payload);
      setForm({
        displayName: response.display_name,
        email: response.email,
        timezone: response.timezone,
        language: response.language,
        notificationsEnabled: response.notifications_enabled,
        firstDayOfWeek: String(response.first_day_of_week ?? firstDay),
        avatarType: response.avatar_type,
        avatarUrl: response.avatar_url ?? null,
      });
      setInitialAvatarType(response.avatar_type);
      setInitialAvatarUrl(response.avatar_url ?? null);
      setIsSelectingFallbackAvatar(false);
      setIsAvatarCreatorVisible(false);
      if (authUser) {
        updateUser({ id: authUser.id, display_name: response.display_name });
      }
      await refresh();
      Alert.alert("Profil mis à jour", "Vos informations ont bien été enregistrées.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer votre profil pour le moment.";
      Alert.alert("Erreur", message);
    } finally {
      setIsSaving(false);
    }
  }, [authUser, form, refresh, updateUser, user]);

  const handleAvatarExported = useCallback(
    (rawUrl: string) => {
      const trimmed = rawUrl.trim();
      if (!trimmed) {
        return;
      }

      try {
        const parsed = new URL(trimmed);
        const host = parsed.hostname.toLowerCase();
        if (!host.endsWith("readyplayer.me")) {
          Alert.alert(
            "URL non reconnue",
            "Le modèle reçu ne provient pas de Ready Player Me. Veuillez réessayer.",
          );
          return;
        }
        const normalized = parsed.toString();
        setForm((previous) => ({ ...previous, avatarUrl: normalized }));
        setIsAvatarCreatorVisible(false);
        setIsSelectingFallbackAvatar(false);
        Alert.alert(
          "Avatar importé",
          "N'oubliez pas d'enregistrer votre profil pour appliquer ce nouvel avatar.",
        );
      } catch (error) {
        Alert.alert(
          "Avatar invalide",
          "Impossible de lire l'URL de l'avatar généré. Veuillez réessayer.",
        );
      }
    },
    [],
  );

  const handleResetAvatarChanges = useCallback(() => {
    setForm((previous) => ({
      ...previous,
      avatarType: initialAvatarType ?? previous.avatarType,
      avatarUrl: initialAvatarUrl,
    }));
    setIsSelectingFallbackAvatar(false);
  }, [initialAvatarType, initialAvatarUrl]);

  const hasAvatarChanges = useMemo(() => {
    const typeChanged = initialAvatarType ? form.avatarType !== initialAvatarType : false;
    const urlChanged = form.avatarUrl !== initialAvatarUrl;
    return typeChanged || urlChanged;
  }, [form.avatarType, form.avatarUrl, initialAvatarType, initialAvatarUrl]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#58a6ff" />
          <Text style={styles.loadingLabel}>Chargement de votre profil…</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorLabel}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryLabel}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Avatar</Text>
        <Text style={styles.sectionSubtitle}>
          Personnalisez un avatar 3D stylisé avec Ready Player Me. Un style 2D reste disponible en secours.
        </Text>
        <View style={styles.currentAvatarCard}>
          {(() => {
            const currentOption =
              AVATAR_OPTIONS.find((option) => option.type === form.avatarType) ?? AVATAR_OPTIONS[0];
            const preview = getAvatarAsset(form.avatarType, avatarPreviewLevel);
            const accentColor = currentOption.colors[1] ?? "#38bdf8";
            const previewBackground = currentOption.colors[0] ?? "#0f172a";
            const initials = currentOption.label
              .split(" ")
              .map((part) => part[0] ?? "")
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <>
                <View
                  style={[
                    styles.currentAvatarPreview,
                    { borderColor: accentColor, backgroundColor: previewBackground },
                  ]}
                >
                  {form.avatarUrl ? (
                    <ReadyPlayerMeAvatar
                      modelUrl={form.avatarUrl}
                      backgroundColor={previewBackground}
                      accentColor={accentColor}
                      style={styles.currentAvatarCanvas}
                    />
                  ) : preview ? (
                    <Image source={preview} style={styles.currentAvatarImage} contentFit="contain" />
                  ) : (
                    <Text style={styles.avatarOptionInitials}>{initials}</Text>
                  )}
                </View>
                <View style={styles.currentAvatarTextGroup}>
                  <Text style={styles.avatarOptionLabel}>{currentOption.label}</Text>
                  <Text style={styles.avatarOptionTagline}>{currentOption.tagline}</Text>
                  {form.avatarUrl ? (
                    <Text style={styles.avatarOptionEvolution}>
                      Avatar Ready Player Me chargé via CDN. Le visuel 2D sélectionné servira de secours.
                    </Text>
                  ) : (
                    <Text style={styles.avatarOptionEvolution}>
                      Évolution: {currentOption.evolution.join(" → ")}
                    </Text>
                  )}
                </View>
              </>
            );
          })()}
        </View>
        <View style={styles.avatarActions}>
          <TouchableOpacity
            style={styles.avatarActionButton}
            onPress={() => setIsAvatarCreatorVisible(true)}
            activeOpacity={0.85}
          >
            <Feather name="edit-3" size={18} color="#f8fafc" />
            <Text style={styles.avatarActionButtonLabel}>
              {form.avatarUrl ? "Modifier l’avatar 3D" : "Créer mon avatar 3D"}
            </Text>
          </TouchableOpacity>
          {form.avatarUrl ? (
            <TouchableOpacity
              style={styles.avatarRemoveButton}
              onPress={() => handleChange("avatarUrl", null)}
              activeOpacity={0.85}
            >
              <Feather name="trash-2" size={18} color="#f87171" />
              <Text style={styles.avatarRemoveButtonLabel}>Supprimer l’avatar 3D</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.avatarInfoText}>
          Le modèle GLB est affiché en temps réel avec un rendu cartoon three.js.
        </Text>
        {hasAvatarChanges ? (
          <TouchableOpacity
            style={styles.cancelAvatarButton}
            onPress={handleResetAvatarChanges}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelAvatarButtonLabel}>Revenir à l’avatar enregistré</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.secondaryAvatarButton}
          onPress={() => setIsSelectingFallbackAvatar((previous) => !previous)}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryAvatarButtonLabel}>
            {isSelectingFallbackAvatar
              ? "Fermer la sélection 2D de secours"
              : "Choisir l’avatar 2D de secours"}
          </Text>
        </TouchableOpacity>
        {isSelectingFallbackAvatar ? (
          <>
            <Text style={styles.avatarInfoText}>
              Ce style sera utilisé si le chargement du modèle 3D échoue.
            </Text>
            <View style={styles.avatarOptionsGrid}>
              {AVATAR_OPTIONS.map((option) => {
                const isSelected = option.type === form.avatarType;
                const preview = getAvatarAsset(option.type, avatarPreviewLevel);
                const accentColor = option.colors[1] ?? "#38bdf8";
                const previewBackground = option.colors[0] ?? "#0f172a";
                const cardBackground = isSelected ? "#0f172a" : "#161b22";
                const borderColor = isSelected ? accentColor : "#1f2937";
                const initials = option.label
                  .split(" ")
                  .map((part) => part[0] ?? "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.avatarOption,
                      isSelected ? styles.avatarOptionSelected : null,
                      { backgroundColor: cardBackground, borderColor },
                    ]}
                    onPress={() => handleChange("avatarType", option.type)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.avatarOptionPreview,
                        { borderColor: accentColor, backgroundColor: previewBackground },
                      ]}
                    >
                      {preview ? (
                        <Image source={preview} style={styles.avatarOptionImage} contentFit="contain" />
                      ) : (
                        <Text style={styles.avatarOptionInitials}>{initials}</Text>
                      )}
                    </View>
                    <View style={styles.avatarOptionTextGroup}>
                      <Text style={styles.avatarOptionLabel}>{option.label}</Text>
                      <Text style={styles.avatarOptionTagline}>{option.tagline}</Text>
                      <Text style={styles.avatarOptionEvolution}>
                        Évolution: {option.evolution.join(" → ")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Informations générales</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nom d’affichage</Text>
          <TextInput
            style={styles.input}
            value={form.displayName}
            onChangeText={(value) => handleChange("displayName", value)}
            placeholder="Votre nom"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Adresse e-mail</Text>
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={(value) => handleChange("email", value)}
            placeholder="vous@example.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Fuseau horaire</Text>
          <TextInput
            style={styles.input}
            value={form.timezone}
            onChangeText={(value) => handleChange("timezone", value)}
            placeholder="Europe/Paris"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.sectionTitle}>Préférences</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Langue</Text>
          <TextInput
            style={styles.input}
            value={form.language}
            onChangeText={(value) => handleChange("language", value)}
            placeholder="fr"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            maxLength={5}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Premier jour de la semaine</Text>
          <TextInput
            style={styles.input}
            value={form.firstDayOfWeek}
            onChangeText={(value) => handleChange("firstDayOfWeek", value.replace(/[^0-6]/g, ""))}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#64748b"
            maxLength={1}
          />
          <Text style={styles.inputHelper}>
            0 = dimanche, 1 = lundi, …, 6 = samedi
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrapper}>
            <Text style={styles.inputLabel}>Notifications</Text>
            <Text style={styles.inputHelper}>Recevez un rappel pour vos quêtes et objectifs.</Text>
          </View>
          <Switch
            trackColor={{ false: "#64748b", true: "#1f6feb" }}
            thumbColor={form.notificationsEnabled ? "#f8fafc" : "#cbd5f5"}
            value={form.notificationsEnabled}
            onValueChange={(value) => handleChange("notificationsEnabled", value)}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#f8fafc" />
          ) : (
            <Text style={styles.saveButtonLabel}>Enregistrer mon profil</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

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
                  router.replace("/settings");
                }
              }}
            >
              <Feather name="arrow-left" size={20} color="#f8fafc" />
              <Text style={styles.backLabel}>Paramètres</Text>
            </TouchableOpacity>
            <Text style={styles.screenHeading}>Profil</Text>
          </View>

          {renderContent()}
        </ScrollView>
        <BottomNav />
        <ReadyPlayerMeCreatorModal
          visible={isAvatarCreatorVisible}
          onClose={() => setIsAvatarCreatorVisible(false)}
          onAvatarExported={handleAvatarExported}
        />
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
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20,
  },
  currentAvatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#161b22",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
  },
  currentAvatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#1f6feb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  currentAvatarImage: {
    width: "100%",
    height: "100%",
  },
  currentAvatarCanvas: {
    width: "100%",
    height: "100%",
  },
  currentAvatarTextGroup: {
    flex: 1,
    gap: 4,
  },
  avatarOptionsGrid: {
    gap: 16,
  },
  avatarOption: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
  },
  avatarOptionSelected: {
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarOptionPreview: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#1f6feb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  avatarOptionImage: {
    width: "100%",
    height: "100%",
  },
  avatarOptionInitials: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
  },
  avatarOptionTextGroup: {
    flex: 1,
    gap: 4,
  },
  avatarOptionLabel: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
  },
  avatarOptionTagline: {
    color: "#94a3b8",
    fontSize: 13,
  },
  avatarOptionEvolution: {
    color: "#64748b",
    fontSize: 12,
  },
  avatarActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  avatarActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#1f6feb",
  },
  avatarActionButtonLabel: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarRemoveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatarRemoveButtonLabel: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarInfoText: {
    marginTop: 8,
    color: "#94a3b8",
    fontSize: 13,
  },
  secondaryAvatarButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0b1220",
  },
  secondaryAvatarButtonLabel: {
    color: "#cbd5f5",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelAvatarButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111827",
  },
  cancelAvatarButtonLabel: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 15,
  },
  inputHelper: {
    color: "#64748b",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161b22",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#30363d",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  toggleTextWrapper: {
    flex: 1,
    gap: 4,
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
});
