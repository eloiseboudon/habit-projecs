import type { AvatarStyle } from "../types/api";

export type DiceBearStyleOption = {
  id: AvatarStyle;
  label: string;
  description: string;
  tags: string[];
  accentColor: string;
  backgroundColor: string;
  previewSeed?: string;
};

export const DICEBEAR_STYLE_OPTIONS: DiceBearStyleOption[] = [
  {
    id: "adventurer",
    label: "Adventurer",
    description: "Illustrations humaines vibrantes inspirées des jeux d'aventure.",
    tags: ["Humain", "Coloré"],
    accentColor: "#f97316",
    backgroundColor: "#0f172a",
    previewSeed: "wanderlust",
  },
  {
    id: "adventurer-neutral",
    label: "Adventurer Neutral",
    description: "Variante aux tons doux de la collection Adventurer.",
    tags: ["Humain", "Neutre"],
    accentColor: "#34d399",
    backgroundColor: "#111827",
    previewSeed: "calm-trail",
  },
  {
    id: "avataaars",
    label: "Avataaars",
    description: "Style cartoon populaire avec une grande variété d'accessoires.",
    tags: ["Humain", "Cartoon"],
    accentColor: "#facc15",
    backgroundColor: "#0f172a",
    previewSeed: "trendy",
  },
  {
    id: "avataaars-neutral",
    label: "Avataaars Neutral",
    description: "Palette professionnelle et sobre pour des profils corporate.",
    tags: ["Humain", "Pro"],
    accentColor: "#60a5fa",
    backgroundColor: "#101828",
    previewSeed: "calm-office",
  },
  {
    id: "big-ears",
    label: "Big Ears",
    description: "Personnages originaux aux silhouettes arrondies et expressives.",
    tags: ["Humain", "Fun"],
    accentColor: "#fda4af",
    backgroundColor: "#111827",
    previewSeed: "storyteller",
  },
  {
    id: "big-ears-neutral",
    label: "Big Ears Neutral",
    description: "Variation pastel et douce des personnages Big Ears.",
    tags: ["Humain", "Neutre"],
    accentColor: "#93c5fd",
    backgroundColor: "#0f172a",
    previewSeed: "sketch",
  },
  {
    id: "big-smile",
    label: "Big Smile",
    description: "Portraits joyeux aux grands sourires et couleurs chaleureuses.",
    tags: ["Humain", "Optimiste"],
    accentColor: "#f472b6",
    backgroundColor: "#111827",
    previewSeed: "sunny-day",
  },
  {
    id: "bottts",
    label: "Bottts",
    description: "Robots futuristes hautement personnalisables.",
    tags: ["Robot", "Coloré"],
    accentColor: "#22d3ee",
    backgroundColor: "#0f172a",
    previewSeed: "synthetic",
  },
  {
    id: "bottts-neutral",
    label: "Bottts Neutral",
    description: "Robots minimalistes aux teintes froides et métalliques.",
    tags: ["Robot", "Neutre"],
    accentColor: "#38bdf8",
    backgroundColor: "#101828",
    previewSeed: "steel",
  },
  {
    id: "croodles",
    label: "Croodles",
    description: "Esquisses dessinées à la main pleines de personnalité.",
    tags: ["Dessin", "Expressif"],
    accentColor: "#f97316",
    backgroundColor: "#0f172a",
    previewSeed: "scribble",
  },
  {
    id: "croodles-neutral",
    label: "Croodles Neutral",
    description: "Version douce et pastel des croquis Croodles.",
    tags: ["Dessin", "Neutre"],
    accentColor: "#a78bfa",
    backgroundColor: "#111827",
    previewSeed: "pastel-scribble",
  },
  {
    id: "dylan",
    label: "Dylan",
    description: "Portraits modernes avec des dégradés élégants.",
    tags: ["Humain", "Mode"],
    accentColor: "#fb7185",
    backgroundColor: "#0f172a",
    previewSeed: "editorial",
  },
  {
    id: "fun-emoji",
    label: "Fun Emoji",
    description: "Émojis dynamiques parfaits pour un ton léger.",
    tags: ["Emoji", "Fun"],
    accentColor: "#facc15",
    backgroundColor: "#111827",
    previewSeed: "sparkle",
  },
  {
    id: "glass",
    label: "Glass",
    description: "Avatars translucides façon verre dépoli.",
    tags: ["Abstrait", "Moderne"],
    accentColor: "#6ee7b7",
    backgroundColor: "#0f172a",
    previewSeed: "frosted",
  },
  {
    id: "icons",
    label: "Icons",
    description: "Pictogrammes abstraits minimalistes.",
    tags: ["Abstrait", "Minimal"],
    accentColor: "#a855f7",
    backgroundColor: "#111827",
    previewSeed: "glyph",
  },
  {
    id: "identicon",
    label: "Identicon",
    description: "Motifs géométriques générés à partir de l'identifiant.",
    tags: ["Abstrait", "Géométrique"],
    accentColor: "#38bdf8",
    backgroundColor: "#0f172a",
    previewSeed: "blueprint",
  },
  {
    id: "initials",
    label: "Initials",
    description: "Monogrammes élégants basés sur vos initiales.",
    tags: ["Typo", "Minimal"],
    accentColor: "#94a3b8",
    backgroundColor: "#111827",
    previewSeed: "letters",
  },
  {
    id: "lorelei",
    label: "Lorelei",
    description: "Illustrations féminines colorées et expressives.",
    tags: ["Humain", "Coloré"],
    accentColor: "#f59e0b",
    backgroundColor: "#0f172a",
    previewSeed: "artemis",
  },
  {
    id: "lorelei-neutral",
    label: "Lorelei Neutral",
    description: "Version neutre et douce de la série Lorelei.",
    tags: ["Humain", "Neutre"],
    accentColor: "#22d3ee",
    backgroundColor: "#111827",
    previewSeed: "muse",
  },
  {
    id: "micah",
    label: "Micah",
    description: "Personnages stylisés aux formes organiques.",
    tags: ["Humain", "Stylisé"],
    accentColor: "#34d399",
    backgroundColor: "#0f172a",
    previewSeed: "organic",
  },
  {
    id: "miniavs",
    label: "Miniavs",
    description: "Petits avatars tout en rondeur au look minimal.",
    tags: ["Humain", "Minimal"],
    accentColor: "#fbbf24",
    backgroundColor: "#111827",
    previewSeed: "mini",
  },
  {
    id: "notionists",
    label: "Notionists",
    description: "Avatars épurés inspirés de Notion.",
    tags: ["Humain", "Minimal"],
    accentColor: "#a855f7",
    backgroundColor: "#0f172a",
    previewSeed: "workspace",
  },
  {
    id: "notionists-neutral",
    label: "Notionists Neutral",
    description: "Palette neutre des avatars Notionists.",
    tags: ["Humain", "Neutre"],
    accentColor: "#60a5fa",
    backgroundColor: "#111827",
    previewSeed: "workspace-calm",
  },
  {
    id: "open-peeps",
    label: "Open Peeps",
    description: "Personnages dessinés à la main très expressifs.",
    tags: ["Humain", "Dessin"],
    accentColor: "#f97316",
    backgroundColor: "#0f172a",
    previewSeed: "peeps",
  },
  {
    id: "personas",
    label: "Personas",
    description: "Portraits modernes et inclusifs.",
    tags: ["Humain", "Inclusif"],
    accentColor: "#fb7185",
    backgroundColor: "#111827",
    previewSeed: "inclusive",
  },
  {
    id: "pixel-art",
    label: "Pixel Art",
    description: "Avatars rétro façon pixel art.",
    tags: ["Pixel", "Retro"],
    accentColor: "#38bdf8",
    backgroundColor: "#0f172a",
    previewSeed: "retro",
  },
  {
    id: "pixel-art-neutral",
    label: "Pixel Art Neutral",
    description: "Variation pixel art aux couleurs désaturées.",
    tags: ["Pixel", "Neutre"],
    accentColor: "#facc15",
    backgroundColor: "#111827",
    previewSeed: "retro-calm",
  },
  {
    id: "rings",
    label: "Rings",
    description: "Motifs en anneaux générés aléatoirement.",
    tags: ["Abstrait", "Géométrique"],
    accentColor: "#22d3ee",
    backgroundColor: "#0f172a",
    previewSeed: "rings",
  },
  {
    id: "shapes",
    label: "Shapes",
    description: "Formes abstraites et colorées.",
    tags: ["Abstrait", "Coloré"],
    accentColor: "#f97316",
    backgroundColor: "#111827",
    previewSeed: "shapes",
  },
  {
    id: "thumbs",
    label: "Thumbs",
    description: "Mini vignettes illustrées parfaites pour des listes.",
    tags: ["Humain", "Mini"],
    accentColor: "#34d399",
    backgroundColor: "#0f172a",
    previewSeed: "thumb",
  },
];

export const DEFAULT_DICEBEAR_STYLE: AvatarStyle = "adventurer";

export const DICEBEAR_STYLE_IDS: AvatarStyle[] = DICEBEAR_STYLE_OPTIONS.map((option) => option.id);

export function isValidDiceBearStyle(style: string | null | undefined): style is AvatarStyle {
  return style ? (DICEBEAR_STYLE_IDS as string[]).includes(style) : false;
}

export function getDiceBearStyleOption(style: string | null | undefined): DiceBearStyleOption {
  const normalized = isValidDiceBearStyle(style) ? style : DEFAULT_DICEBEAR_STYLE;
  return (
    DICEBEAR_STYLE_OPTIONS.find((option) => option.id === normalized) ?? DICEBEAR_STYLE_OPTIONS[0]
  );
}
