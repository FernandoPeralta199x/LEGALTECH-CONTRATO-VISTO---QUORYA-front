"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ACTIVE_STATUSES } from "@/components/dashboard/config";
import { errorMessage } from "@/lib/errorMessage";
import { listCases } from "@/services/cases";
import { listClients } from "@/services/clients";
import { getDashboardStats, type DashboardStats } from "@/services/dashboard";
import { listDocuments } from "@/services/documents";
import type { Case, Client, Document } from "@/types";

// Lógica de dados do dashboard extraída da página (fe-struct-02): fetch consolidado
// (clients/cases/documents/stats), cross-join de documentsCount por caso, view-model
// derivado (totais reais vindos de /dashboard/stats, contagem parcial como fallback).
// A página fica puramente presentational.
export function useDashboardData() {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState("");
  const [fallbackActive, setFallbackActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  // stats falhou (totais consolidados indisponíveis) => os cards mostram só a 1ª página
  const [statsDegraded, setStatsDegraded] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const clientsResult = await listClients();
      const [casesResult, documentsResult, statsResult] = await Promise.all([
        listCases(clientsResult.data),
        listDocuments(),
        getDashboardStats().catch(() => ({ data: null, source: "mock" as const }))
      ]);
      setStats(statsResult.data);
      // stats falhou mas as listas responderam: totais viram contagem parcial (1ª página)
      setStatsDegraded(statsResult.data === null);
      setClients(clientsResult.data);
      setDocuments(documentsResult.data);
      setCases(
        casesResult.data.map((legalCase) => ({
          ...legalCase,
          documentsCount: documentsResult.data.filter(
            (document) => document.caseId === legalCase.id
          ).length
        }))
      );
      setFallbackActive(
        clientsResult.source === "mock" ||
          casesResult.source === "mock" ||
          documentsResult.source === "mock"
      );
    } catch (err) {
      setError(errorMessage(err, "Não foi possível carregar o dashboard."));
      setFallbackActive(false);
      setStatsDegraded(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshDashboard]);

  const activeCasesCount = useMemo(
    () => cases.filter((c) => ACTIVE_STATUSES.has(c.status)).length,
    [cases]
  );
  // Totais reais vêm de /dashboard/stats (a lista carregada é só a 1ª página).
  const totalCasesDisplay = stats?.totalCases ?? cases.length;
  const totalClientsDisplay = stats?.totalClients ?? clients.length;
  const activeCasesDisplay = stats
    ? Math.max(
        0,
        stats.totalCases -
          (stats.casesByStatus["completed"] ?? 0) -
          (stats.casesByStatus["closed"] ?? 0)
      )
    : activeCasesCount;
  const recentCases = useMemo(() => cases.slice(0, 4), [cases]);
  const recentDocuments = useMemo(() => documents.slice(0, 3), [documents]);
  const hasData =
    cases.length > 0 || clients.length > 0 || documents.length > 0;

  return {
    documents,
    error,
    setError,
    fallbackActive,
    loading,
    statsDegraded,
    refreshDashboard,
    totalCasesDisplay,
    totalClientsDisplay,
    activeCasesDisplay,
    recentCases,
    recentDocuments,
    hasData
  };
}
