import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import type { AvatarStyle } from "../types/api";
import { useDiceBearAvatar } from "../lib/dicebear";

type DiceBearAvatarProps = {
  style: AvatarStyle | string | null | undefined;
  seed: string | null | undefined;
  size?: number;
  fallback?: ReactNode;
};

export default function DiceBearAvatar({ style, seed, size = 120, fallback }: DiceBearAvatarProps) {
  const { uri, isLoading } = useDiceBearAvatar(style, seed);

  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size }} contentFit="contain" />;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (isLoading) {
    return (
      <View style={[styles.loader, { width: size, height: size }]}>
        <ActivityIndicator color="#f8fafc" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loader: {
    alignItems: "center",
    justifyContent: "center",
  },
});
