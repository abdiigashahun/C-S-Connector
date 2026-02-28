export type AppRole = "shop_owner" | "customer";

type UserPreferenceRecord = {
  role: AppRole;
  termsAcceptedAt: string;
};

type PendingRegistrationRecord = {
  role: AppRole;
  termsAcceptedAt: string;
};

const USER_PREFS_KEY = "shopconnect_user_preferences";
const PENDING_REG_KEY = "shopconnect_pending_registration";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getUserPreferences(userId: string): UserPreferenceRecord | null {
  const all = readJson<Record<string, UserPreferenceRecord>>(USER_PREFS_KEY) ?? {};
  return all[userId] ?? null;
}

export function setUserPreferences(
  userId: string,
  value: UserPreferenceRecord
): void {
  const all = readJson<Record<string, UserPreferenceRecord>>(USER_PREFS_KEY) ?? {};
  all[userId] = value;
  writeJson(USER_PREFS_KEY, all);
}

export function setPendingRegistration(value: PendingRegistrationRecord): void {
  writeJson(PENDING_REG_KEY, value);
}

export function consumePendingRegistration(): PendingRegistrationRecord | null {
  const pending = readJson<PendingRegistrationRecord>(PENDING_REG_KEY);

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PENDING_REG_KEY);
  }

  return pending;
}
