"use client";

// Error Boundary de ÚLTIMO recurso (fe-err-03): captura erros lançados no próprio
// root layout, que os error.tsx por rota NÃO cobrem. Substitui o layout raiz, então
// precisa renderizar seu próprio <html>/<body> (não herda globals.css) e usa estilos
// inline para funcionar mesmo se o pipeline de CSS falhar.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sem PII/token: só mensagem/digest para diagnóstico.
    console.error("[global-error]", error?.message, error?.digest);
  }, [error]);

  return (
    <html lang="pt-BR" data-theme="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080c",
          color: "#e6e8ee",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "2rem"
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Algo deu errado
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#9aa0ac",
              margin: "0 0 1.5rem"
            }}
          >
            Ocorreu um erro inesperado ao carregar a aplicação. Tente novamente.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #f97316",
              background: "transparent",
              color: "#f97316",
              cursor: "pointer",
              fontSize: "0.875rem"
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
