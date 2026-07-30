import { apiClient } from "./apiClient";

/** Organização-cliente (empresarial/individual) que a firma pode gerenciar. */
export type ClientOrg = {
  id: string;
  name: string;
  type: string;
  documentMasked: string | null;
  documentType: string | null;
  status: string;
};

/** Usuário de uma org-cliente + suas telas (Modelo B). */
export type OrgUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  perfil: string | null;
  telasExtra: string[];
  telas: string[];
};

/** Abas que o admin pode LIBERAR por usuário. Espelha LIBERATABLE_TELAS do backend
 *  (src/utils/context.py) — a autoridade é server-side; a UI só reflete. */
export const LIBERATABLE_TELAS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "documentos", label: "Documentos" }
] as const;

type BackendOrg = {
  id: string;
  name: string;
  type: string;
  document_masked?: string | null;
  document_type?: string | null;
  status: string;
};

type BackendOrgUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  perfil?: string | null;
  telas_extra?: string[];
  telas?: string[];
};

function mapOrg(org: BackendOrg): ClientOrg {
  return {
    id: org.id,
    name: org.name,
    type: org.type,
    documentMasked: org.document_masked ?? null,
    documentType: org.document_type ?? null,
    status: org.status
  };
}

function mapUser(user: BackendOrgUser): OrgUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    perfil: user.perfil ?? null,
    telasExtra: user.telas_extra ?? [],
    telas: user.telas ?? []
  };
}

export async function listClientOrgs(): Promise<ClientOrg[]> {
  const res = await apiClient.get<{ items?: BackendOrg[] }>(
    "/api/v1/organizations/clients"
  );
  return (res.data.items ?? []).map(mapOrg);
}

export async function listOrgUsers(orgId: string): Promise<OrgUser[]> {
  const res = await apiClient.get<{ items?: BackendOrgUser[] }>(
    `/api/v1/organizations/${orgId}/users`
  );
  return (res.data.items ?? []).map(mapUser);
}

/** Libera/revoga abas de um usuário; retorna as telas_extra efetivamente gravadas. */
export async function updateOrgUserTelas(
  orgId: string,
  userId: string,
  telas: string[]
): Promise<string[]> {
  const res = await apiClient.patch<{ telas_extra?: string[] }>(
    `/api/v1/organizations/${orgId}/users/${userId}/telas`,
    { telas }
  );
  return res.data.telas_extra ?? [];
}
