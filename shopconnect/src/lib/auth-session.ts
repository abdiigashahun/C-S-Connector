type SessionUser = {
  id?: string;
  name?: string;
  email?: string;
};

export function getAuthSessionUser(sessionResult: unknown): SessionUser | null {
  const result = sessionResult as {
    data?: { user?: SessionUser; session?: { user?: SessionUser } };
    user?: SessionUser;
    session?: { user?: SessionUser };
  };

  return (
    result?.data?.user ??
    result?.data?.session?.user ??
    result?.session?.user ??
    result?.user ??
    null
  );
}

export function getAuthSessionUserId(sessionResult: unknown): string | undefined {
  return getAuthSessionUser(sessionResult)?.id;
}
