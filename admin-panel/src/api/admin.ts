import { apiRequest } from './client';

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  phone?: string;
  estateName?: string;
  isAdmin: boolean;
  isBlocked: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  createdAt: string;
};

export type Community = {
  id: string;
  title: string;
  memberCount: number;
  createdAt: string;
};

export type DeletedCommunity = {
  id: string;
  title: string;
  deletedAt: string;
  restoreExpiresAt: string;
  deletedReason?: string | null;
};

export type CustomPostField = {
  key: string;
  label: string;
  type: 'text' | 'number';
  required: boolean;
};

export type AppSettings = {
  id: string;
  pricePerHourPkr: number;
  minImages: number;
  maxImages: number;
  cityRequired: boolean;
  areaRequired: boolean;
  customFields: CustomPostField[];
  /** Days a chat message (community or private) is kept before it's permanently deleted. */
  chatRetentionDays: number;
  updatedAt: string;
};

export type UpdateAppSettingsInput = Partial<
  Omit<AppSettings, 'id' | 'updatedAt'>
>;

export type AdStatus = 'pending' | 'active' | 'expired' | 'rejected';

export type CommunityAd = {
  id: string;
  userId: string;
  title: string;
  description: string;
  city: string;
  area: string;
  images: string[];
  durationHours: number;
  price: number;
  status: AdStatus;
  expiresAt: string | null;
  remainingSeconds: number | null;
  rejectionReason?: string | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  authorEmail?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReportStatus = 'open' | 'reviewed' | 'actioned' | 'dismissed';

export type AdminReport = {
  id: string;
  status: ReportStatus;
  reason: string;
  details?: string | null;
  createdAt: string;
  targetType: 'user' | 'message' | 'listing';
  targetId: string;
  reporter: { id: string; displayName: string; avatarUrl?: string | null };
  reportedUser: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    email: string;
    isBlocked: boolean;
    isDisabled: boolean;
  } | null;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isAdmin: boolean;
};

export type AdminUserDetail = AdminUser & {
  bio?: string | null;
  updatedAt: string;
  ads: CommunityAd[];
};

// ---- Auth -------------------------------------------------------------

export async function login(email: string, password: string) {
  return apiRequest<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// ---- Users --------------------------------------------------------------

export function fetchUsers() {
  return apiRequest<AdminUser[]>('/admin/users');
}

export function fetchUserDetail(id: string) {
  return apiRequest<AdminUserDetail>(`/admin/users/${id}`);
}

export function setUserBlocked(id: string, value: boolean, reason?: string) {
  return apiRequest(`/admin/users/${id}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ value, reason }),
  });
}

export function setUserDisabled(id: string, value: boolean, reason?: string) {
  return apiRequest(`/admin/users/${id}/disable`, {
    method: 'PATCH',
    body: JSON.stringify({ value, reason }),
  });
}

export function deleteUser(id: string) {
  return apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
}

// ---- Communities ----------------------------------------------------------

export function fetchCommunities() {
  return apiRequest<Community[]>('/admin/communities');
}

export function fetchDeletedCommunities() {
  return apiRequest<DeletedCommunity[]>('/admin/communities/deleted');
}

export function createCommunity(title: string) {
  return apiRequest<Community>('/admin/communities', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function deleteCommunity(id: string, reason?: string) {
  return apiRequest(`/admin/communities/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export function restoreCommunity(id: string) {
  return apiRequest(`/admin/communities/${id}/restore`, { method: 'PATCH' });
}

// ---- Platform settings (pricing, image limits, custom ad fields) ---------

export function fetchSettings() {
  return apiRequest<AppSettings>('/admin/settings');
}

export function updateSettings(input: UpdateAppSettingsInput) {
  return apiRequest<AppSettings>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ---- Ads / community posts ------------------------------------------------

export function fetchCommunityAds() {
  return apiRequest<CommunityAd[]>('/admin/community-posts');
}

export function verifyAd(id: string) {
  return apiRequest(`/admin/community-posts/${id}/verify`, { method: 'PATCH' });
}

export function rejectAd(id: string, reason?: string) {
  return apiRequest(`/admin/community-posts/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export function deleteAd(id: string) {
  return apiRequest(`/admin/community-posts/${id}`, { method: 'DELETE' });
}

// ---- Chat management (permanent deletion) ---------------------------------

export type ChatDeletionResult = { deleted: number };

/** Permanently deletes every message in every community (group) chat. Communities and profiles are kept. */
export function deleteAllCommunityMessages() {
  return apiRequest<ChatDeletionResult>('/admin/chats/community', { method: 'DELETE' });
}

/** Permanently deletes every message in every private (direct) chat. Threads and profiles are kept. */
export function deleteAllPrivateMessages() {
  return apiRequest<ChatDeletionResult>('/admin/chats/private', { method: 'DELETE' });
}

// ---- Reports --------------------------------------------------------------

export function fetchReports() {
  return apiRequest<AdminReport[]>('/admin/reports');
}

export function setReportStatus(id: string, status: 'reviewed' | 'actioned' | 'dismissed') {
  return apiRequest(`/admin/reports/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
