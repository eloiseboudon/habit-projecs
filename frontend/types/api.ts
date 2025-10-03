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
  domain_stats: DashboardDomainStat[];
};

export type TaskListItem = {
  id: string;
  title: string;
  domain_id: number;
  domain_key: string;
  domain_name: string;
  icon: string | null;
  xp: number;
  completed_today: boolean;
};

export type TaskListResponse = {
  user_id: string;
  tasks: TaskListItem[];
};

export type CreateTaskRequest = {
  title: string;
  domain_key: string;
  xp: number;
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

export type BadgeItem = {
  id: string;
  title: string;
  subtitle: string;
  domain_id: number | null;
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

export type UserProfile = {
  display_name: string;
  email: string;
  timezone: string;
  language: string;
  notifications_enabled: boolean;
  first_day_of_week: number;
};

export type UpdateUserProfileRequest = UserProfile;
