export async function isOwnerEmail(email?: string | null): Promise<boolean> {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  try {
    const response = await fetch(
      `/api/owner-access?email=${encodeURIComponent(normalized)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { isOwner?: boolean };
    return Boolean(payload.isOwner);
  } catch {
    return false;
  }
}