export type UserSummary = {
  id: string;
  display_name: string;
};

export type AuthResponse = {
  user: UserSummary;
};

export type RegisterRequest = {
  display_name: string;
  email: string;
  password: string;
};

export type DashboardDomainStat = {
  domain_id: number;
  domain_key: string;
  domain_name: string;
  icon: string | null;
  weekly_points: number;
  weekly_target: number;
  weekly_xp: number;
  progress_ratio: number;
};

export type DashboardResponse = {
  user_id: string;
  display_name: string;
  initials: string;
  level: number;
  current_xp: number;
  xp_to_next: number;
  avatar_type: AvatarType;
  domain_stats: DashboardDomainStat[];
};

export type TaskFrequency = "daily" | "weekly" | "monthly";
export type SnapshotPeriod = "day" | "week" | "month";

export type TaskListItem = {
  id: string;
  title: string;
  domain_id: number;
  domain_key: string;
  domain_name: string;
  icon: string | null;
  xp: number;
  schedule_period: SnapshotPeriod;
  schedule_interval: number;
  frequency_type: TaskFrequency;
  target_occurrences: number;
  occurrences_completed: number;
  occurrences_remaining: number;
  period_start: string;
  period_end: string;
  completed_today: boolean;
  is_custom: boolean;
  show_in_global: boolean;
};

export type TaskListResponse = {
  user_id: string;
  tasks: TaskListItem[];
};

export type CreateTaskRequest = {
  title: string;
  domain_key: string;
  xp: number;
  frequency_type: TaskFrequency;
  schedule_period: SnapshotPeriod;
  schedule_interval: number;
  target_occurrences: number;
};

export type UpdateTaskRequest = {
  title: string;
  domain_key: string;
  xp: number;
  frequency_type: TaskFrequency;
  schedule_period: SnapshotPeriod;
  schedule_interval: number;
  target_occurrences: number;
};

export type UpdateTaskVisibilityRequest = {
  show_in_global: boolean;
};

export type TaskTemplateItem = {
  id: number;
  title: string;
  domain_id: number;
  domain_key: string;
  domain_name: string;
  icon: string | null;
  default_xp: number;
  default_points: number;
  unit: string | null;
  is_enabled: boolean;
};

export type HistoryItem = {
  id: string;
  title: string;
  occurred_at: string;
  xp_awarded: number;
  domain_id: number;
  domain_key: string;
  domain_name: string;
  icon: string | null;
};

export type WeeklyStat = {
  domain_id: number;
  domain_key: string;
  domain_name: string;
  icon: string | null;
  weekly_points: number;
  weekly_xp: number;
};

export type RewardUnlock = {
  id: number;
  key: string;
  type: string;
  name: string;
  description: string;
  reward_data: Record<string, unknown> | null;
};

export type TaskLogResponse = {
  id: string;
  user_id: string;
  user_task_id: string | null;
  domain_id: number;
  occurred_at: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  xp_awarded: number;
  points_awarded: number;
  source: string;
  unlocked_rewards: RewardUnlock[];
};

export type BadgeItem = {
  id: string;
  title: string;
  subtitle: string;
  domain_id: number | null;
  icon: string | null;
};

export type ProgressionResponse = {
  user_id: string;
  recent_history: HistoryItem[];
  weekly_stats: WeeklyStat[];
  badges: BadgeItem[];
};

export type UserDomainSetting = {
  domain_id: number;
  domain_key: string;
  domain_name: string;
  icon: string | null;
  weekly_target_points: number;
  is_enabled: boolean;
};

export type UpdateUserDomainSettingsRequest = {
  settings: {
    domain_id: number;
    weekly_target_points: number;
    is_enabled: boolean;
  }[];
};

export type AvatarType = "explorateur" | "batisseur" | "moine" | "guerrier";

export type UserProfile = {
  display_name: string;
  email: string;
  timezone: string;
  language: string;
  notifications_enabled: boolean;
  first_day_of_week: number;
  avatar_type: AvatarType;
};

export type UpdateUserProfileRequest = UserProfile;
