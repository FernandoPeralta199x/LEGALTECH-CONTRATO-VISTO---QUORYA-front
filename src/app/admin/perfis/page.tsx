"use client";

import { useCallback, useEffect, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { PageTitle } from "@/components/PageTitle";
import { PerfilGuard } from "@/components/PerfilGuard";
import { Switch } from "@/components/Switch";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errorMessage";
import {
  LIBERATABLE_TELAS,
  listClientOrgs,
  listOrgUsers,
  updateOrgUserTelas,
  type ClientOrg,
  type OrgUser
} from "@/services/organizations";

type Status = "loading" | "error" | "ready";

const LIBERATABLE_IDS = LIBERATABLE_TELAS.map((tela) => tela.id) as string[];

function liberatableOf(telasExtra: string[]): string[] {
  return telasExtra.filter((tela) => LIBERATABLE_IDS.includes(tela));
}

function sameTelas(a: string[], b: string[]): boolean {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.length === sb.length && sa.every((value, index) => value === sb[index]);
}

function PerfilConfigContent() {
  const [orgs, setOrgs] = useState<ClientOrg[]>([]);
  const [orgsStatus, setOrgsStatus] = useState<Status>("loading");
  const [orgsError, setOrgsError] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [usersStatus, setUsersStatus] = useState<Status>("ready");
  const [usersError, setUsersError] = useState("");

  // Telas liberadas em edição, por usuário (só as liberáveis).
  const [edits, setEdits] = useState<Record<string, string[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const loadOrgs = useCallback(async () => {
    setOrgsStatus("loading");
    setOrgsError("");
    try {
      setOrgs(await listClientOrgs());
      setOrgsStatus("ready");
    } catch (err) {
      setOrgsError(errorMessage(err, "Erro ao carregar organizações."));
      setOrgsStatus("error");
    }
  }, []);

  // Carga inicial: setState só APÓS o fetch (via .then), nunca síncrono no efeito
  // (o estado já inicia "loading"). loadOrgs fica para o botão "tentar novamente".
  useEffect(() => {
    let cancelled = false;
    listClientOrgs()
      .then((items) => {
        if (!cancelled) {
          setOrgs(items);
          setOrgsStatus("ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOrgsError(errorMessage(err, "Erro ao carregar organizações."));
          setOrgsStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectOrg = useCallback(async (orgId: string) => {
    setSelectedOrgId(orgId);
    setUsersStatus("loading");
    setUsersError("");
    setNotice(null);
    try {
      const items = await listOrgUsers(orgId);
      setUsers(items);
      setEdits(
        Object.fromEntries(items.map((user) => [user.id, liberatableOf(user.telasExtra)]))
      );
      setUsersStatus("ready");
    } catch (err) {
      setUsersError(errorMessage(err, "Erro ao carregar usuários da organização."));
      setUsersStatus("error");
    }
  }, []);

  function toggleTela(userId: string, tela: string, on: boolean) {
    setEdits((prev) => {
      const current = prev[userId] ?? [];
      const next = on
        ? [...new Set([...current, tela])]
        : current.filter((value) => value !== tela);
      return { ...prev, [userId]: next };
    });
  }

  async function save(user: OrgUser) {
    if (!selectedOrgId) {
      return;
    }
    setSavingId(user.id);
    setNotice(null);
    try {
      const saved = await updateOrgUserTelas(selectedOrgId, user.id, edits[user.id] ?? []);
      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, telasExtra: saved } : item))
      );
      setEdits((prev) => ({ ...prev, [user.id]: liberatableOf(saved) }));
      setNotice({ tone: "success", message: `Abas de ${user.name} atualizadas.` });
    } catch (err) {
      setNotice({ tone: "error", message: errorMessage(err, "Erro ao salvar as abas.") });
    } finally {
      setSavingId(null);
    }
  }

  const selectedOrg = orgs.find((org) => org.id === selectedOrgId) ?? null;

  return (
    <AppLayout>
      <PageTitle
        description="Libere abas extras (ex.: Dashboard, Documentos) para clientes específicos. Só administradores; Administração e Financeiro nunca são liberáveis."
        eyebrow="Administração"
        title="Configuração de Perfil"
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="shrink-0 lg:w-72">
          <Card title="Clientes">
            {orgsStatus === "loading" && <LoadingState label="Carregando clientes..." />}
            {orgsStatus === "error" && (
              <ErrorState
                action={
                  <Button onClick={() => void loadOrgs()} variant="secondary">
                    Tentar novamente
                  </Button>
                }
                description={orgsError}
              />
            )}
            {orgsStatus === "ready" && orgs.length === 0 && (
              <EmptyState
                description="Clientes aparecem aqui quando se cadastram na plataforma."
                title="Nenhum cliente ainda"
              />
            )}
            {orgsStatus === "ready" && orgs.length > 0 && (
              <div className="space-y-1">
                {orgs.map((org) => (
                  <button
                    className={cn(
                      "flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left transition-colors",
                      selectedOrgId === org.id
                        ? "bg-[var(--teal-dim)] text-[var(--text)]"
                        : "text-[var(--text2)] hover:bg-[var(--surf3)] hover:text-[var(--text)]"
                    )}
                    key={org.id}
                    onClick={() => void selectOrg(org.id)}
                    type="button"
                  >
                    <span className="w-full truncate text-sm font-medium">{org.name}</span>
                    <span className="font-mono text-[11px] text-[var(--text3)]">
                      {org.documentMasked ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 flex-1">
          {!selectedOrg && (
            <Card>
              <EmptyState
                description="Escolha um cliente à esquerda para liberar abas aos seus usuários."
                title="Selecione um cliente"
              />
            </Card>
          )}
          {selectedOrg && (
            <Card description="Abas liberadas por usuário" title={selectedOrg.name}>
              {notice && (
                <Notification
                  compact
                  title={notice.tone === "success" ? "Salvo" : "Erro"}
                  tone={notice.tone}
                >
                  {notice.message}
                </Notification>
              )}
              {usersStatus === "loading" && <LoadingState label="Carregando usuários..." />}
              {usersStatus === "error" && (
                <ErrorState
                  action={
                    <Button
                      onClick={() => void selectOrg(selectedOrg.id)}
                      variant="secondary"
                    >
                      Tentar novamente
                    </Button>
                  }
                  description={usersError}
                />
              )}
              {usersStatus === "ready" && users.length === 0 && (
                <EmptyState
                  description="Esta organização não tem usuários ativos."
                  title="Sem usuários ativos"
                />
              )}
              {usersStatus === "ready" && users.length > 0 && (
                <div className="space-y-3">
                  {users.map((user) => {
                    const current = edits[user.id] ?? [];
                    const dirty = !sameTelas(current, liberatableOf(user.telasExtra));
                    const isAdminUser = user.perfil === "administrador";
                    return (
                      <div
                        className="rounded-xl border border-[var(--bd)] bg-[var(--surf2)] p-4"
                        key={user.id}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text)]">
                              {user.name}
                            </p>
                            <p className="truncate font-mono text-[11px] text-[var(--text3)]">
                              {user.email}
                            </p>
                          </div>
                          <span className="cv-badge cv-badge-muted shrink-0">
                            {user.perfil ?? "—"}
                          </span>
                        </div>
                        {isAdminUser ? (
                          <p className="text-xs text-[var(--text3)]">
                            Administradores já veem todas as telas — nada a liberar.
                          </p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              {LIBERATABLE_TELAS.map((tela) => (
                                <div
                                  className="flex items-center justify-between gap-3"
                                  key={tela.id}
                                >
                                  <span className="text-sm text-[var(--text2)]">
                                    {tela.label}
                                  </span>
                                  <Switch
                                    checked={current.includes(tela.id)}
                                    label={`Liberar ${tela.label} para ${user.name}`}
                                    onCheckedChange={(on) => toggleTela(user.id, tela.id, on)}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button
                                disabled={!dirty || savingId === user.id}
                                loading={savingId === user.id}
                                onClick={() => void save(user)}
                                variant="primary"
                              >
                                Salvar
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function PerfilConfigPage() {
  return (
    <AuthGuard>
      <PerfilGuard allowed={["administrador"]}>
        <PerfilConfigContent />
      </PerfilGuard>
    </AuthGuard>
  );
}
