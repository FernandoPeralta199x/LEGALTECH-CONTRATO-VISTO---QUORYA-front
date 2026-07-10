import { apiClient } from "@/services/apiClient";

export type PixChargeStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "PAYMENT_FAILED";

/** Contrato estrito do create-charge (spec §3) — só campos exibíveis. */
export type PixCharge = {
  orderId: string;
  paymentId: string;
  qrCodeImage: string | null; // data-URI/URL do provider; null no mock (FE mostra copia-e-cola)
  pixCopyPaste: string;
  expiresAt: string | null;
  status: PixChargeStatus;
};

export type PixStatus = {
  status: PixChargeStatus | null;
  paymentId: string | null;
  expiresAt: string | null;
};

/** Cria a cobrança Pix dinâmica (PENDING_PAYMENT). O valor (1x) e a org são derivados
 *  server-side — o cliente só envia a chave de idempotência. */
export async function createPixCharge(
  caseId: string,
  idempotencyKey: string
): Promise<PixCharge> {
  const res = await apiClient.post<PixCharge>(
    `/api/v1/cases/${caseId}/pix-charge`,
    { idempotency_key: idempotencyKey }
  );
  return res.data;
}

/** Consulta o status da cobrança (backend-autoritativo) — usado pelo polling. */
export async function getPixStatus(caseId: string): Promise<PixStatus> {
  const res = await apiClient.get<PixStatus>(
    `/api/v1/cases/${caseId}/pix-charge/status`
  );
  return res.data;
}

/** DEV-ONLY: dispara o webhook mock ASSINADO para confirmar a cobrança (só existe quando
 *  o backend está em PAYMENT_MODE=mock). Em produção, o provider real dispara o webhook —
 *  a confirmação NUNCA parte do cliente. */
export async function simulatePixPaid(caseId: string): Promise<void> {
  await apiClient.post(`/api/v1/cases/${caseId}/pix-charge/simulate`, {});
}
