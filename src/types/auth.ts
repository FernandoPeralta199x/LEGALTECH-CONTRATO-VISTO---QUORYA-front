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
 * Perfil de acesso (RBAC B2B2C) — eixo ORTOGONAL ao `role`: decide QUAIS TELAS
 * o usuário enxerga, enquanto `role` decide permissão de escrita/operação.
 * Fonte da verdade é o backend (`require_perfil`); o frontend só espelha.
 */
export const SESSION_PERFIS = [
  "administrador",
  "empresarial",
  "cliente_comum"
] as const;

export type SessionPerfil = (typeof SESSION_PERFIS)[number];

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
  /** Opcional por resiliência a tokens legados sem perfil; o backend atual
   *  sempre o inclui (migration 028 fez backfill='administrador'). */
  perfil?: SessionPerfil;
  /** Telas EFETIVAS vindas do /me (backend: PERFIL_TELAS[perfil] ∪ abas liberadas —
   *  Modelo B). Fonte da verdade da nav/guards; o frontend só espelha (SEC-FE). */
  telas?: readonly string[];
  userId: string;
};
