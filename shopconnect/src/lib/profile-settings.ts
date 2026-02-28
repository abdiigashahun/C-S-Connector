export type ProfileSettingsPayload = {
  email: string;
  role: "customer" | "shop_owner";
  name: string;
  phone: string;
  preferredLocation: string;
  address: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  showPhone: boolean;
};

export type ProfileSettingsRecord = ProfileSettingsPayload & {
  updatedAt?: string | null;
};

type ProfileSettingsApiRecord = {
  email: string;
  role: "customer" | "shop_owner";
  name: string | null;
  phone: string | null;
  preferred_location: string | null;
  address: string | null;
  notify_email: boolean | null;
  notify_push: boolean | null;
  show_phone: boolean | null;
  updated_at: string | null;
};

function mapApiRecord(record: ProfileSettingsApiRecord): ProfileSettingsRecord {
  return {
    email: record.email,
    role: record.role,
    name: record.name ?? "",
    phone: record.phone ?? "",
    preferredLocation: record.preferred_location ?? "",
    address: record.address ?? "",
    notifyEmail: record.notify_email ?? true,
    notifyPush: record.notify_push ?? true,
    showPhone: record.show_phone ?? false,
    updatedAt: record.updated_at,
  };
}

export async function getProfileSettingsByEmail(
  email: string
): Promise<ProfileSettingsRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  try {
    const response = await fetch(
      `/api/profile-settings?email=${encodeURIComponent(normalized)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: ProfileSettingsApiRecord | null };
    if (!payload.data) {
      return null;
    }

    return mapApiRecord(payload.data);
  } catch {
    return null;
  }
}

export async function saveProfileSettingsByEmail(
  value: ProfileSettingsPayload
): Promise<ProfileSettingsRecord | null> {
  const normalized = value.email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  try {
    const response = await fetch("/api/profile-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...value,
        email: normalized,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: ProfileSettingsApiRecord | null };
    if (!payload.data) {
      return null;
    }

    return mapApiRecord(payload.data);
  } catch {
    return null;
  }
}
