import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { ThemeProvider } from "@/components/ThemeProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Contrato Visto — Análise jurídica inteligente",
  description:
    "Plataforma LegalTech para análise jurídica, due diligence, consulta de partes e acompanhamento de casos com inteligência artificial."
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07080c" },
    { media: "(prefers-color-scheme: light)", color: "#f0f6f3" }
  ]
};

// Script inline BLOQUEANTE: aplica o tema salvo antes da hidratação para eliminar
// o flash de tema (PERF-02). Espelha getStoredThemePreference/applyThemePreference
// de lib/preferences.ts — manter em sincronia se aquela lógica mudar.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("legaltech.theme.preference.v1");var t=(s==="light"||s==="dark")?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"dark");var e=document.documentElement;e.classList.toggle("dark",t==="dark");e.dataset.theme=t;e.style.colorScheme=t;}catch(_){}})();`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`dark ${GeistSans.variable} ${GeistMono.variable}`}
      data-theme="dark"
      lang="pt-BR"
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
