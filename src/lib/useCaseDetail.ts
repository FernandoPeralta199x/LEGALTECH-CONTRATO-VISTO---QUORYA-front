"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

import { getCaseAggregate } from "@/services/cases";
import { errorMessage } from "@/lib/errorMessage";
import { aggregatePartyFromCaseParty } from "@/lib/useCasePartiesEditor";
import type { Case, CaseAggregate, CaseParty, Document } from "@/types";

/** Carga e estado do agregado do caso (caso/documentos/partes) com race-guard por token.
 *  Extraído de cases/[id] (fe-struct-02).
 *
 *  `loadTokenRef` (ref) é COMPARTILHADO com useFinalReports: refreshCase INCREMENTA o token e,
 *  após carregar o agregado, chama `onAggregateLoaded` (a página injeta o refreshFinalReports
 *  do useFinalReports). Elevar o ref à página + injetar via callback quebra a dependência
 *  circular entre os dois hooks irmãos mantendo o token único (a invalidação mútua da corrida
 *  segue valendo). `syncCaseParties` mantém o setState TRIPLO aninhado do original (parties →
 *  caseData.parties → aggregate.parties/summary.partiesCount) — é passado como applyParties
 *  ao useCasePartiesEditor. */
export function useCaseDetail(options: {
  id: string;
  loadTokenRef: RefObject<number>;
  onAggregateLoaded: () => void;
}) {
  const { id, loadTokenRef, onAggregateLoaded } = options;

  const [caseAggregate, setCaseAggregate] = useState<CaseAggregate | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [caseDocuments, setCaseDocuments] = useState<Document[]>([]);
  const [caseParties, setCaseParties] = useState<CaseParty[]>([]);
  const [error, setError] = useState("");
  const [fallbackReason, setFallbackReason] = useState("");
  const [aggregateSource, setAggregateSource] = useState<"api" | "mock">("api");
  const [loading, setLoading] = useState(true);

  const refreshCase = useCallback(async () => {
    const token = ++loadTokenRef.current;
    setLoading(true);
    setError("");

    try {
      const aggregateResult = await getCaseAggregate(id);
      if (token !== loadTokenRef.current) return; // id trocou / novo refresh — descarta
      setCaseAggregate(aggregateResult.data);
      setCaseData(aggregateResult.data.case);
      setCaseDocuments(aggregateResult.data.documents);
      setCaseParties(aggregateResult.data.parties);
      setAggregateSource(aggregateResult.source);
      setFallbackReason(
        aggregateResult.source === "mock" ? aggregateResult.fallbackReason ?? "" : ""
      );
      onAggregateLoaded();
    } catch (err) {
      if (token !== loadTokenRef.current) return;
      setError(errorMessage(err));
      setFallbackReason("");
      setCaseAggregate(null);
      setCaseData(null);
      setCaseDocuments([]);
      setCaseParties([]);
    } finally {
      if (token === loadTokenRef.current) setLoading(false);
    }
  }, [id, loadTokenRef, onAggregateLoaded]);

  function syncCaseParties(updater: (current: CaseParty[]) => CaseParty[]) {
    setCaseParties((current) => {
      const next = updater(current);
      setCaseData((currentCase) =>
        currentCase ? { ...currentCase, parties: next } : currentCase
      );
      setCaseAggregate((currentAggregate) =>
        currentAggregate
          ? {
              ...currentAggregate,
              case: { ...currentAggregate.case, parties: next },
              parties: next.map((party) =>
                aggregatePartyFromCaseParty(
                  party,
                  currentAggregate.case.organizationId ?? ""
                )
              ),
              summary: {
                ...currentAggregate.summary,
                partiesCount: next.length
              }
            }
          : currentAggregate
      );
      return next;
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCase();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshCase]);

  return {
    caseAggregate,
    caseData,
    caseDocuments,
    caseParties,
    error,
    fallbackReason,
    aggregateSource,
    loading,
    refreshCase,
    syncCaseParties,
    setFallbackReason
  };
}
