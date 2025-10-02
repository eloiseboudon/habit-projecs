import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const NAV_ITEMS = [
  { label: "Accueil", route: "/" },
  { label: "Quêtes", route: "/quests" },
  { label: "Progression", route: "/progression" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.route;

        return (
          <Pressable
            key={item.route}
            style={[styles.navButton, isActive && styles.navButtonActive]}
            onPress={() => {
              if (!isActive) {
                router.push(item.route as never);
              }
            }}
          >
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#161b22",
    borderTopWidth: 1,
    borderColor: "#30363d",
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  navButtonActive: {
    backgroundColor: "#1f6feb22",
  },
  navLabel: {
    color: "#8b949e",
    fontSize: 15,
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#f0f6fc",
  },
});
