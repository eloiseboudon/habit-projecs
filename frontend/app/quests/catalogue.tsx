import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../../components/BottomNav";
import { useHabitData } from "../../context/HabitDataContext";
import { fetchUserTaskTemplates } from "../../lib/api";
import type { TaskTemplateItem } from "../../types/api";

export default function TaskCatalogueScreen() {
  const router = useRouter();
  const {
    state: { user },
    enableTaskTemplate,
    disableTaskTemplate,
  } = useHabitData();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [templates, setTemplates] = useState<TaskTemplateItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<number | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Record<number, boolean>>({});

  const userId = user?.id ?? null;

  const loadTemplates = useCallback(
    async (mode: "full" | "refresh" = "full") => {
      if (!userId) {
        return;
      }

      if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setStatus("loading");
      }
      setErrorMessage(null);

      try {
        const data = await fetchUserTaskTemplates(userId);
        setTemplates(data);
        setStatus("ready");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de charger le catalogue des quêtes.";
        setErrorMessage(message);
        setStatus("error");
      } finally {
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }
      void loadTemplates("full");
    }, [loadTemplates, userId]),
  );

  const handleToggleTemplate = useCallback(
    async (template: TaskTemplateItem, nextValue: boolean) => {
      if (!userId || pendingTemplateId !== null) {
        return;
      }

      setPendingTemplateId(template.id);
      try {
        if (nextValue) {
          await enableTaskTemplate(template.id);
        } else {
          await disableTaskTemplate(template.id);
        }
        await loadTemplates("refresh");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour cette quête.";
        Alert.alert("Erreur", message);
      } finally {
        setPendingTemplateId(null);
      }
    },
    [disableTaskTemplate, enableTaskTemplate, loadTemplates, pendingTemplateId, userId],
  );

  const domainGroups = useMemo(() => {
    const groups: {
      domainId: number;
      domainName: string;
      icon: string | null;
      templates: TaskTemplateItem[];
    }[] = [];
    const map = new Map<number, (typeof groups)[number]>();

    templates.forEach((template) => {
      let group = map.get(template.domain_id);
      if (!group) {
        group = {
          domainId: template.domain_id,
          domainName: template.domain_name,
          icon: template.icon,
          templates: [],
        };
        map.set(template.domain_id, group);
        groups.push(group);
      }

      if (!group.icon && template.icon) {
        group.icon = template.icon;
      }
      group.templates.push(template);
    });

    return groups;
  }, [templates]);

  type CatalogueListItem =
    | {
        type: "domain";
        domainId: number;
        domainName: string;
        icon: string | null;
        isExpanded: boolean;
      }
    | {
        type: "template";
        domainId: number;
        template: TaskTemplateItem;
      };

  const catalogueItems = useMemo(() => {
    const items: CatalogueListItem[] = [];

    domainGroups.forEach((group) => {
      const isExpanded = expandedDomains[group.domainId] ?? false;
      items.push({
        type: "domain",
        domainId: group.domainId,
        domainName: group.domainName,
        icon: group.icon,
        isExpanded,
      });

      if (isExpanded) {
        group.templates.forEach((template) => {
          items.push({ type: "template", domainId: group.domainId, template });
        });
      }
    });

    return items;
  }, [domainGroups, expandedDomains]);

  const handleToggleDomainVisibility = useCallback((domainId: number) => {
    setExpandedDomains((previous) => ({
      ...previous,
      [domainId]: !(previous[domainId] ?? false),
    }));
  }, []);

  const renderCatalogueItem = useCallback(
    ({ item }: { item: CatalogueListItem }) => {
      if (item.type === "domain") {
        const icon = item.icon ?? "⭐";
        return (
          <Pressable
            style={styles.domainHeader}
            onPress={() => handleToggleDomainVisibility(item.domainId)}
            accessibilityRole="button"
          >
            <View style={styles.domainHeaderLeft}>
              <Text style={styles.domainIcon}>{icon}</Text>
              <Text style={styles.domainTitle}>{item.domainName}</Text>
            </View>
            <Feather
              name={item.isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#f8fafc"
            />
          </Pressable>
        );
      }

      const { template } = item;
      const icon = template.icon ?? "⭐";
      const isBusy = pendingTemplateId === template.id;

      return (
        <View style={[styles.card, styles.templateCard]}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{template.title}</Text>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardMeta}>
                {icon} {template.domain_name}
              </Text>
              <Text style={styles.cardMeta}>+{template.default_xp} XP</Text>
            </View>
            {template.unit && <Text style={styles.cardUnit}>Unité : {template.unit}</Text>}
          </View>
          <View style={styles.cardAction}>
            {isBusy ? (
              <ActivityIndicator size="small" color="#f8fafc" />
            ) : (
              <Switch
                value={template.is_enabled}
                onValueChange={(value) => handleToggleTemplate(template, value)}
                disabled={pendingTemplateId !== null}
                trackColor={{ false: "#475569", true: "#7c3aed" }}
                thumbColor={template.is_enabled ? "#f8fafc" : "#cbd5f5"}
              />
            )}
          </View>
        </View>
      );
    },
    [handleToggleDomainVisibility, handleToggleTemplate, pendingTemplateId],
  );

  const listEmptyComponent = useMemo(() => {
    if (status === "loading") {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.emptyStateLabel}>Chargement du catalogue…</Text>
        </View>
      );
    }

    if (status === "error") {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateLabel}>{errorMessage ?? "Catalogue indisponible."}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadTemplates("full")}>
            <Text style={styles.retryButtonLabel}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateLabel}>Aucun modèle de quête disponible.</Text>
      </View>
    );
  }, [errorMessage, loadTemplates, status]);

  return (
    <LinearGradient
      colors={["#111827", "#111827", "#1f2937"]}
      style={styles.gradientBackground}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          <FlatList
            data={catalogueItems}
            keyExtractor={(item) =>
              item.type === "domain" ? `domain-${item.domainId}` : `template-${item.template.id}`
            }
            renderItem={renderCatalogueItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={listEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadTemplates("refresh")}
                tintColor="#818cf8"
              />
            }
            ListHeaderComponent={
              <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.back()}
                    style={styles.backButton}
                  >
                    <Feather name="chevron-left" size={24} color="#f8fafc" />
                  </Pressable>
                  <Text style={styles.title}>Catalogue des quêtes</Text>
                </View>
                <Text style={styles.subtitle}>
                  Activez les quêtes préconfigurées pour les ajouter instantanément à votre journal.
                </Text>
              </View>
            }
          />
          <BottomNav />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    position: "relative",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#cbd5f5",
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  domainHeader: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  domainHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  domainIcon: {
    fontSize: 18,
  },
  domainTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  templateCard: {
    marginBottom: 12,
    marginLeft: 12,
  },
  cardContent: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardMeta: {
    color: "#cbd5f5",
    fontSize: 13,
  },
  cardUnit: {
    color: "#94a3b8",
    fontSize: 12,
  },
  cardAction: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyStateLabel: {
    color: "#e2e8f0",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: "rgba(99, 102, 241, 0.25)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonLabel: {
    color: "#cbd5f5",
    fontWeight: "600",
  },
});
