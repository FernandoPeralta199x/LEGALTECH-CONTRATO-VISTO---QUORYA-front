/** @type {import('next').NextConfig} */

// FRONT-01: destino do proxy vem do ambiente (fallback local para dev),
// evitando o hardcode de localhost que quebraria em staging/prod.
const apiTarget = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

// M-04: Content-Security-Policy. 'unsafe-inline'/'unsafe-eval' sao necessarios para o
// runtime do Next (hidratacao) e o HMR em dev; endurecer com nonces fica para a Fase 7.
// O restante trava clickjacking (frame-ancestors), base-uri e plugins (object-src).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' ws: wss:",
  "form-action 'self'",
].join("; ");

// Headers de seguranca espelhando o backend (src/main.py SECURITY_HEADERS).
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
];

const nextConfig = {
  // A-10: build standalone para imagem Docker minima (deploy ECS/Fargate).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiTarget}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
