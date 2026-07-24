export const SESSION_ROLES = [
  "owner",
  "admin",
  "manager",
  "analyst",
  "viewer",
  "client",
  "support"
] as const;

export type SessionRole = (typeof SESSION_ROLES)[number];

/**
 * Visão pública e não sensível da sessão. O JWT nunca faz parte deste tipo:
 * ele permanece cifrado no cookie HttpOnly e só é aberto pelo BFF.
 */
export type Session = {
  email: string;
  expiresAt: string;
  issuedAt: string;
  name?: string;
  organizationId: string;
  role: SessionRole;
  userId: string;
};
