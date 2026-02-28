export const PRIMARY_ADMIN_EMAIL = "abdigashahun0@gmail.com";

export function isAdminEmail(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}