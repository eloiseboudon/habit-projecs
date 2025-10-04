import type { ImageSourcePropType } from "react-native";

import type { AvatarType } from "../types/api";

const AVATAR_ASSETS: Record<AvatarType, Record<number, ImageSourcePropType>> = {
  explorateur: {
    1: require("../assets/explorateur-1.svg"),
  },
  batisseur: {
    1: require("../assets/batisseur-1.svg"),
  },
  moine: {
    1: require("../assets/moine-1.svg"),
  },
  guerrier: {
    1: require("../assets/guerrier-1.svg"),
  },
};

export function getAvatarAsset(type: AvatarType, level: number): ImageSourcePropType | null {
  const assets = AVATAR_ASSETS[type];
  if (!assets) {
    return null;
  }

  const availableLevels = Object.keys(assets)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);

  for (let index = availableLevels.length - 1; index >= 0; index -= 1) {
    const availableLevel = availableLevels[index];
    if (level >= availableLevel) {
      return assets[availableLevel];
    }
  }

  return assets[availableLevels[0]] ?? null;
}

export const REGISTERED_AVATAR_LEVELS: Record<AvatarType, number[]> = Object.fromEntries(
  (Object.keys(AVATAR_ASSETS) as AvatarType[]).map((type) => [
    type,
    Object.keys(AVATAR_ASSETS[type])
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b),
  ]),
);
