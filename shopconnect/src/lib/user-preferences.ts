export type AppRole = "shop_owner" | "customer";

type UserPreferenceRecord = {
  role: AppRole;
  termsAcceptedAt: string;
};

type UserRoleApiRecord = {
  email: string;
  role: AppRole;
  terms_accepted_at: string | null;
  updated_at: string | null;
  user_id: string | null;
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

export async function getUserRoleByEmail(
  email: string
): Promise<UserPreferenceRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  try {
    const response = await fetch(
      `/api/user-role?email=${encodeURIComponent(normalizedEmail)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: UserRoleApiRecord | null };
    const record = payload.data;

    if (!record?.role) {
      return null;
    }

    return {
      role: record.role,
      termsAcceptedAt:
        record.terms_accepted_at ?? record.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function setUserRoleByEmail(value: {
  email: string;
  role: AppRole;
  termsAcceptedAt: string;
  userId?: string;
}): Promise<UserPreferenceRecord | null> {
  const normalizedEmail = value.email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  try {
    const response = await fetch("/api/user-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        role: value.role,
        termsAcceptedAt: value.termsAcceptedAt,
        userId: value.userId,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: UserRoleApiRecord | null };
    const record = payload.data;

    if (!record?.role) {
      return null;
    }

    return {
      role: record.role,
      termsAcceptedAt:
        record.terms_accepted_at ?? record.updated_at ?? value.termsAcceptedAt,
    };
  } catch {
    return null;
  }
}
