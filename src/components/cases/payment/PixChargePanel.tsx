"use client";

import { Check, CheckCircle2, Clock, Copy, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { centsToReaisLabel } from "@/components/CurrencyInput";
import { formatCountdown } from "@/lib/pixFormat";
import type { PixCharge, PixChargeStatus } from "@/services/pix";

type PixChargePanelProps = {
  charge: PixCharge;
  status: PixChargeStatus;
  amountCents: number;
  orderCode: string;
  isMock: boolean;
  onSimulate?: () => void;
  simulating?: boolean;
  onBack: () => void;
};

/** Tela Pix: valor > QR (ou placeholder no mock) > contador > copia-e-cola > status.
 *  A confirmação vem SÓ do backend (polling em pixStatus, feito pela página) — este
 *  componente é presentacional + contador local. Extraído para foco/testabilidade. */
export function PixChargePanel({
  charge,
  status,
  amountCents,
  orderCode,
  isMock,
  onSimulate,
  simulating,
  onBack,
}: PixChargePanelProps) {
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  // Tique de 1s só para o contador (o polling de status vive na página).
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresMs = charge.expiresAt ? new Date(charge.expiresAt).getTime() : 0;
  const remaining = expiresMs - now;
  const expired =
    status === "EXPIRED" ||
    (status === "PENDING_PAYMENT" && expiresMs > 0 && remaining <= 0);

  async function copy() {
    try {
      await navigator.clipboard.writeText(charge.pixCopyPaste);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível — o usuário ainda pode selecionar o código manualmente.
    }
  }

  if (status === "PAID") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-6 text-center animate-in">
          <CheckCircle2 className="text-[var(--teal)]" size={44} />
          <p className="text-base font-semibold text-[var(--text)]">
            Pagamento confirmado
          </p>
          <p className="max-w-sm text-sm leading-5 text-[var(--text2)]">
            O Pix de{" "}
            <span className="font-mono font-semibold">
              {centsToReaisLabel(amountCents)}
            </span>{" "}
            foi confirmado pelo banco. O caso já está liberado.
          </p>
          <Button onClick={onBack}>Voltar ao caso</Button>
        </div>
      </Card>
    );
  }

  const failed = ["CANCELLED", "PAYMENT_FAILED", "REFUNDED"].includes(status);

  return (
    <div className="space-y-4">
      <Card title="Pague com Pix">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-2xl font-bold tracking-tight text-[var(--text)]">
            {centsToReaisLabel(amountCents)}
          </p>
          <p className="text-xs text-[var(--text3)]">
            Pedido <span className="font-mono">{orderCode}</span>
          </p>
        </div>

        <div className="flex justify-center">
          {charge.qrCodeImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- QR vem como data-URI/URL do provider; next/image não serve p/ data-URI
            <img
              alt="QR Code Pix"
              className="h-48 w-48 rounded-lg bg-white p-2"
              src={charge.qrCodeImage}
            />
          ) : (
            <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--bd)] bg-[var(--surf2)] px-3 text-center">
              <QrCode className="text-[var(--text3)]" size={40} />
              <p className="text-[10px] leading-4 text-[var(--text3)]">
                QR em modo de teste — use o código Copia e Cola abaixo
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--text2)]">
          <Clock size={13} />
          {expired ? (
            <span className="font-medium text-orange-400">Cobrança expirada</span>
          ) : (
            <span>
              Expira em{" "}
              <span className="font-mono font-semibold text-[var(--text)]">
                {formatCountdown(remaining)}
              </span>
            </span>
          )}
        </div>
      </Card>

      <Card
        description="No app do seu banco, escolha Pix › Copia e Cola e cole o código."
        title="Código Copia e Cola"
      >
        <div className="flex flex-col gap-2">
          <code className="block max-h-24 overflow-y-auto break-all rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2 font-mono text-[11px] leading-4 text-[var(--text2)]">
            {charge.pixCopyPaste}
          </code>
          <Button
            icon={copied ? <Check size={15} /> : <Copy size={15} />}
            onClick={() => void copy()}
            variant="secondary"
          >
            {copied ? "Copiado!" : "Copiar código"}
          </Button>
        </div>
      </Card>

      {failed ? (
        <p className="text-center text-[11px] text-orange-400">
          Esta cobrança não pode mais ser paga. Gere uma nova para tentar novamente.
        </p>
      ) : (
        <p className="text-center text-[11px] text-[var(--text3)]">
          Aguardando confirmação do pagamento… a tela atualiza automaticamente.
        </p>
      )}

      {isMock && onSimulate && !expired && status === "PENDING_PAYMENT" && (
        <div className="flex flex-col items-center gap-1 border-t border-dashed border-[var(--bd)] pt-4">
          <Button loading={simulating} onClick={onSimulate} size="sm">
            Confirmar pagamento (teste)
          </Button>
          <p className="text-[10px] text-[var(--text3)]">
            Modo de teste — confirma o pagamento automaticamente.
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <button
          className="pressable text-xs text-[var(--text2)] transition hover:text-[var(--teal)]"
          onClick={onBack}
          type="button"
        >
          Voltar ao caso
        </button>
      </div>
    </div>
  );
}
