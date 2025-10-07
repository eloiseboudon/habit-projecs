import type { SnapshotPeriod, TaskFrequency, TaskListItem, DashboardResponse } from "../../types/api";
import { CATEGORY_OPTIONS, CATEGORIES, type CategoryKey } from "../../constants/categories";

export const FREQUENCY_CHOICES: { value: TaskFrequency; label: string; periodLabel: string }[] = [
  { value: "daily", label: "Quotidienne", periodLabel: "aujourd’hui" },
  { value: "weekly", label: "Hebdomadaire", periodLabel: "cette semaine" },
  { value: "monthly", label: "Mensuelle", periodLabel: "ce mois-ci" },
];

export const SCHEDULE_PERIOD_BY_FREQUENCY: Record<TaskFrequency, SnapshotPeriod> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

export const PERIOD_HELPER_BY_SCHEDULE: Record<SnapshotPeriod, string> = {
  day: "par jour",
  week: "par semaine",
  month: "par mois",
};

const normalizeText = (value: string | null | undefined) =>
  value
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
    : "";

export function buildDomainKeyOverrides(
  tasks: TaskListItem[],
  dashboard: DashboardResponse | null,
): Map<CategoryKey, string> {
  const overrides = new Map<CategoryKey, string>();

  const candidates: { key: string; name: string }[] = [];

  if (dashboard) {
    for (const stat of dashboard.domain_stats) {
      candidates.push({ key: stat.domain_key, name: stat.domain_name });
    }
  }

  for (const task of tasks) {
    candidates.push({ key: task.domain_key, name: task.domain_name });
  }

  if (candidates.length === 0) {
    return overrides;
  }

  for (const categoryKey of CATEGORY_OPTIONS) {
    const category = CATEGORIES[categoryKey];
    const normalizedKey = normalizeText(categoryKey);
    const normalizedLabel = normalizeText(category.label);

    const match = candidates.find((candidate) => {
      const normalizedCandidateKey = normalizeText(candidate.key);
      const normalizedCandidateName = normalizeText(candidate.name);
      return (
        normalizedCandidateKey === normalizedKey || normalizedCandidateName === normalizedLabel
      );
    });

    if (match) {
      overrides.set(categoryKey, match.key);
    }
  }

  return overrides;
}
