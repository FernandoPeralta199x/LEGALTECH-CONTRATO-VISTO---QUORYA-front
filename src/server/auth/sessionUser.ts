import { extractBackendData, fetchBackend, readBackendJson } from "@/server/backend/client";
import type { Session, SessionRole } from "@/types/auth";
import { SESSION_ROLES } from "@/types/auth";

type BackendCurrentUser = {
  email?: unknown;
  id?: unknown;
  name?: unknown;
  organization_id?: unknown;
  role?: unknown;
};

function isSessionRole(value: unknown): value is SessionRole {
  return (
    typeof value === "string" &&
    (SESSION_ROLES as readonly string[]).includes(value)
  );
}

export function buildPublicSession(
  user: BackendCurrentUser,
  issuedAt: number,
  expiresAt: number
): Session | null {
  if (
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.organization_id !== "string" ||
    !isSessionRole(user.role)
  ) {
    return null;
  }

  return {
    email: user.email,
    expiresAt: new Date(expiresAt).toISOString(),
    issuedAt: new Date(issuedAt).toISOString(),
    ...(typeof user.name === "string" && user.name.trim()
      ? { name: user.name }
      : {}),
    organizationId: user.organization_id,
    role: user.role,
    userId: user.id
  };
}

export async function fetchVerifiedSession(
  token: string,
  issuedAt: number,
  expiresAt: number
): Promise<{ response: Response; session: Session | null; payload: unknown }> {
  const response = await fetchBackend("/me", { token });
  const payload = await readBackendJson(response);
  const user = extractBackendData<BackendCurrentUser>(payload);
  return {
    payload,
    response,
    session:
      response.ok && user
        ? buildPublicSession(user, issuedAt, expiresAt)
        : null
  };
}
