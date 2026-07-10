"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CASES_PAGE_SIZE } from "@/lib/caseFormOptions";
import { errorMessage } from "@/lib/errorMessage";
import { listCasesPaged } from "@/services/cases";
import { listClients } from "@/services/clients";
import type { Case, CaseStatus, Client } from "@/types";

type UseCasesListOptions = {
  /** Chamado após carregar os clientes (a página usa p/ default do form de criação).
   *  Guardado em ref estável — NÃO entra nas deps de refreshCases. */
  onClientsLoaded?: (clients: Client[]) => void;
};

/** Estado + fetch da LISTA de casos (busca/filtro/paginação) extraído do god file
 *  (fe-struct-02). Preserva o race-guard (fe-ts-01) e o debounce + reset de página
 *  (fe-ts-02). O form/modal de criação/edição e os handlers ficam na página. */
export function useCasesList({ onClientsLoaded }: UseCasesListOptions = {}) {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const [fallbackReason, setFallbackReason] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState("");

  const onClientsLoadedRef = useRef(onClientsLoaded);
  useEffect(() => {
    onClientsLoadedRef.current = onClientsLoaded;
  }, [onClientsLoaded]);

  // Sequenciador de requisições: guarda contra respostas obsoletas — fe-ts-01.
  const latestLoad = useRef(0);

  const refreshCases = useCallback(async () => {
    const token = ++latestLoad.current;
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const clientsResult = await listClients();
      const casesResult = await listCasesPaged(
        {
          q: debouncedQuery || undefined,
          status: (filter || undefined) as CaseStatus | undefined,
          page,
          pageSize: CASES_PAGE_SIZE
        },
        clientsResult.data
      );
      if (token !== latestLoad.current) return; // uma busca mais nova já saiu
      setClients(clientsResult.data);
      setCases(casesResult.data);
      setTotal(casesResult.total);
      setTotalPages(casesResult.totalPages);
      onClientsLoadedRef.current?.(clientsResult.data);
      setFallbackReason(
        clientsResult.source === "mock" || casesResult.source === "mock"
          ? clientsResult.fallbackReason ?? casesResult.fallbackReason ?? ""
          : ""
      );
    } catch (err) {
      if (token !== latestLoad.current) return;
      setError(errorMessage(err, "Não foi possível carregar casos."));
      setFallbackReason("");
    } finally {
      if (token === latestLoad.current) setLoading(false);
    }
  }, [debouncedQuery, filter, page]);

  useEffect(() => {
    // defer (setTimeout 0) evita cascade render sincrono dentro do efeito
    const t = window.setTimeout(() => void refreshCases(), 0);
    return () => window.clearTimeout(t);
  }, [refreshCases]);

  // busca server-side com debounce (acha em toda a base, não só na página). Reseta a
  // página JUNTO com o debounce: assim uma nova busca dispara UM único fetch (page=1),
  // sem a requisição intermediária com a página antiga (o filtro reseta no próprio onChange).
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  function clearListFilters() {
    setFilter("");
    setQuery("");
  }

  return {
    cases,
    setCases,
    clients,
    error,
    setError,
    fallbackReason,
    setFallbackReason,
    filter,
    setFilter,
    loading,
    query,
    setQuery,
    page,
    setPage,
    total,
    setTotal,
    totalPages,
    successMessage,
    setSuccessMessage,
    refreshCases,
    clearListFilters
  };
}
