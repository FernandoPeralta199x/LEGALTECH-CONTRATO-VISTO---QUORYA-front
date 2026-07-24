/** @type {import('next').NextConfig} */

// PROD-03: o upload envia os bytes por fetch PUT direto ao presigned URL do S3
// (documents.ts), que em produção é CROSS-ORIGIN (ex.: https://<bucket>.s3.<region>.amazonaws.com).
// fetch/PUT é regido por connect-src — sem o host, o browser BLOQUEIA o upload em produção.
// Derivado de env: vazio em dev/local (storage mock, sem PUT cross-origin), setado no deploy.
const s3UploadOrigin = process.env.NEXT_PUBLIC_S3_UPLOAD_ORIGIN || "";
const isDevelopment = process.env.NODE_ENV !== "production";

// M-04: Content-Security-Policy. `unsafe-eval` fica limitado ao HMR de
// desenvolvimento; `unsafe-inline` ainda é necessário para a hidratação do Next
// até a adoção de nonces. O restante trava clickjacking, base-uri e plugins.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' ws: wss:${s3UploadOrigin ? " " + s3UploadOrigin : ""}`,
  "form-action 'self'",
].join("; ");

// Headers de seguranca espelhando o backend (src/main.py SECURITY_HEADERS).
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
];

const nextConfig = {
  // A-10: build standalone para imagem Docker minima (deploy ECS/Fargate).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
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
