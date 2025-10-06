import { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";

const DISPLAY_DURATION_MS = 2600;

export type RewardUnlockModalProps = {
  visible: boolean;
  rewardName: string;
  rewardTypeLabel: string;
  icon?: string | null;
  onHidden: () => void;
};

export default function RewardUnlockModal({
  visible,
  rewardName,
  rewardTypeLabel,
  icon,
  onHidden,
}: RewardUnlockModalProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
      return;
    }

    opacity.setValue(0);
    scale.setValue(0.85);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 80,
      }),
    ]).start();

    hideTimeout.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        hideTimeout.current = null;
        onHidden();
      });
    }, DISPLAY_DURATION_MS);

    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
    };
  }, [opacity, scale, visible, onHidden]);

  if (!visible) {
    return null;
  }

  const displayIcon = icon && icon.trim().length > 0 ? icon : "🎉";

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.container, { opacity, transform: [{ scale }] }]}
        >
          <Text style={styles.icon}>{displayIcon}</Text>
          <Text style={styles.title}>Félicitations !</Text>
          <Text style={styles.subtitle}>{rewardTypeLabel} débloqué 🎉</Text>
          {rewardName ? <Text style={styles.rewardName}>{rewardName}</Text> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#cbd5f5",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 8,
  },
  rewardName: {
    color: "#fbbf24",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
});
