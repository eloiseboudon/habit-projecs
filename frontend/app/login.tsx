import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

const EMAIL_REGEX = /.+@.+\..+/i;

type AuthMode = "login" | "register";

export default function LoginScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const {
    state: { status, errorMessage },
    login,
    register,
    clearError,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();

  const isLoading = status === "checking";

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (status === "authenticated") {
      router.replace("/");
    }
  }, [navigationState?.key, router, status]);

  useEffect(() => {
    setLocalError(undefined);
    clearError();
  }, [mode, clearError]);

  const buttonLabel = useMemo(() => {
    return mode === "login" ? "Se connecter" : "Créer mon compte";
  }, [mode]);

  const secondaryActionLabel = useMemo(() => {
    return mode === "login" ? "Pas encore de compte ? Inscription" : "Déjà inscrit ? Connexion";
  }, [mode]);

  const validateForm = () => {
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      return "Veuillez saisir un e-mail valide.";
    }
    if (!password.trim()) {
      return "Veuillez indiquer un mot de passe.";
    }
    if (mode === "register" && !displayName.trim()) {
      return "Veuillez renseigner un nom d’affichage.";
    }
    return undefined;
  };

  const handleSubmit = async () => {
    if (isLoading) {
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    try {
      if (mode === "login") {
        await login(email.trim().toLowerCase(), password);
      } else {
        await register(displayName.trim(), email.trim().toLowerCase(), password);
      }
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible d’exécuter la requête.";
      setLocalError(message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Habit Quest</Text>
            <Text style={styles.subtitle}>
              {mode === "login"
                ? "Connectez-vous pour suivre votre progression"
                : "Créez un compte pour commencer votre aventure"}
            </Text>
          </View>

          {mode === "register" && (
            <View style={styles.field}>
              <Text style={styles.label}>Nom d’affichage</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ex. Alex"
                placeholderTextColor="#6b7280"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="vous@example.com"
              placeholderTextColor="#6b7280"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
              secureTextEntry
              style={styles.input}
            />
          </View>

          {(localError || errorMessage) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{localError ?? errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.primaryButtonLabel}>{buttonLabel}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setMode(mode === "login" ? "register" : "login")}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionLabel}>{secondaryActionLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 24,
  },
  header: {
    gap: 12,
    alignItems: "center",
  },
  title: {
    color: "#f9fafb",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: "#cbd5f5",
    fontSize: 16,
    textAlign: "center",
  },
  field: {
    gap: 8,
  },
  label: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "#1f2937",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#38bdf8",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonLabel: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryAction: {
    alignItems: "center",
    marginTop: 8,
  },
  secondaryActionLabel: {
    color: "#60a5fa",
    fontSize: 15,
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(248, 113, 113, 0.35)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    textAlign: "center",
  },
});
