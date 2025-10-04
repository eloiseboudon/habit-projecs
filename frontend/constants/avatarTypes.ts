import type { AvatarType } from "../types/api";

export type AvatarOption = {
  type: AvatarType;
  label: string;
  tagline: string;
  evolution: string[];
  colors: string[];
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    type: "explorateur",
    label: "Explorateur",
    tagline: "Aventure • Découverte",
    evolution: ["Sac à dos", "Boussole", "Lampe", "Carte détaillée"],
    colors: ["#3a2f1d", "#2f5f3d", "#c79a2f"],
  },
  {
    type: "batisseur",
    label: "Bâtisseur",
    tagline: "Discipline • Construction",
    evolution: ["Marteau", "Établi", "Plan", "Tour solide"],
    colors: ["#4a5568", "#1e3a8a", "#94a3b8"],
  },
  {
    type: "moine",
    label: "Moine",
    tagline: "Calme • Sérénité",
    evolution: ["Robe simple", "Bâton", "Aura", "Halo lumineux"],
    colors: ["#f5e0c3", "#7c3aed", "#f8fafc"],
  },
  {
    type: "guerrier",
    label: "Guerrier",
    tagline: "Résilience • Force",
    evolution: ["Tenue simple", "Brassard", "Armure légère", "Aura puissante"],
    colors: ["#991b1b", "#111827", "#d1d5db"],
  },
];

export const AVATAR_TYPE_LABELS: Record<AvatarType, string> = AVATAR_OPTIONS.reduce(
  (accumulator, option) => {
    accumulator[option.type] = option.label;
    return accumulator;
  },
  {} as Record<AvatarType, string>,
);

export function getAvatarOption(type: AvatarType): AvatarOption {
  const option = AVATAR_OPTIONS.find((item) => item.type === type);
  return (
    option ?? {
      type,
      label: type,
      tagline: "",
      evolution: [],
      colors: [],
    }
  );
}
