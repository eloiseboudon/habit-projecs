export const CATEGORIES = {
  health: { label: "Santé", icon: "🩺" },
  finance: { label: "Finances", icon: "💰" },
  work: { label: "Travail", icon: "🧠" },
  relations: { label: "Relations", icon: "🤝" },
  wellness: { label: "Bien-être", icon: "🧘" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const CATEGORY_OPTIONS = Object.keys(CATEGORIES) as CategoryKey[];
