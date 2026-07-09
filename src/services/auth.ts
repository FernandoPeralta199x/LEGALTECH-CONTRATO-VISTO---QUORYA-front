import { saveStoredSession } from "@/src/lib/authStorage";
import { decodeJwtPayload } from "@/src/lib/devJwt";
import type { DecodedDevJwt, DevLoginInput, DevRole, DevSession } from "@/src/types/auth";
import { DEV_ROLES } from "@/src/types/auth";
import { apiClient } from "./apiClient";

type BackendCurrentUser = {
  email: string;
  id: string;
  organization_id: string;
  role: string;
};

export function isDevRole(value: string): value is DevRole {
  return DEV_ROLES.includes(value as DevRole);
}

export function decodeDevJwt(token: string): DecodedDevJwt | null {
  // Decode compartilhado (src/lib/devJwt): mesmo base64url->JSON e mesmo guard
  // de 3 partes de antes. As claims continuam validadas em requireDevJwtClaims.
  return decodeJwtPayload(token) as DecodedDevJwt | null;
}

function requireDevJwtClaims(token: string): DecodedDevJwt {
  const decodedToken = decodeDevJwt(token);
  const role = decodedToken?.["custom:role"] ?? decodedToken?.role;
  const organizationId =
    decodedToken?.["custom:organization_id"] ?? decodedToken?.organization_id;

  if (
    !decodedToken ||
    decodedToken.token_use !== "dev" ||
    !decodedToken.sub ||
    !organizationId ||
    !role ||
    !isDevRole(role)
  ) {
    throw new Error("JWT dev invalido. Gere um token dev valido no backend.");
  }

  if (
    typeof decodedToken.exp === "number" &&
    decodedToken.exp <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error("JWT dev expirado. Gere um novo token no backend.");
  }

  return decodedToken;
}

function requireDevRole(value: string): DevRole {
  if (!isDevRole(value)) {
    throw new Error("JWT dev invalido. Papel retornado pelo backend nao e permitido.");
  }

  return value;
}

export function buildDevSession(
  input: DevLoginInput,
  verifiedUser?: BackendCurrentUser
): DevSession {
  const providedToken = input.token?.trim();
  if (!providedToken) {
    throw new Error("JWT dev é obrigatório para criar sessão local.");
  }

  const token = providedToken;
  const decodedToken = requireDevJwtClaims(token);
  const decodedRole = decodedToken?.["custom:role"] ?? decodedToken?.role;
  const role = verifiedUser
    ? requireDevRole(verifiedUser.role)
    : decodedRole && isDevRole(decodedRole)
      ? decodedRole
      : input.role;
  const issuedAt = decodedToken?.iat
    ? new Date(decodedToken.iat * 1000).toISOString()
    : new Date().toISOString();
  const expiresAt = decodedToken?.exp
    ? new Date(decodedToken.exp * 1000).toISOString()
    : undefined;

  return {
    email: verifiedUser?.email ?? decodedToken.email ?? `dev.${role}@example.test`,
    expiresAt,
    issuedAt,
    organizationId:
      verifiedUser?.organization_id ??
      decodedToken["custom:organization_id"] ??
      decodedToken.organization_id ??
      "",
    role,
    source: "pasted",
    token,
    userId: verifiedUser?.id ?? decodedToken.sub ?? ""
  };
}

export async function validateDevTokenWithBackend(token: string): Promise<DevSession> {
  const decodedToken = requireDevJwtClaims(token);
  const response = await apiClient.get<BackendCurrentUser>("/api/v1/me", { token });
  return buildDevSession(
    {
      role:
        decodedToken["custom:role"] && isDevRole(decodedToken["custom:role"])
          ? decodedToken["custom:role"]
          : "client",
      token
    },
    response.data
  );
}

export async function saveDevSession(input: DevLoginInput): Promise<DevSession> {
  const session = await validateDevTokenWithBackend(input.token ?? "");
  saveStoredSession(session);
  return session;
}
