export type BackendEnvironment = Record<string, string | undefined>;

export function resolveBackendBaseUrl(
  env: BackendEnvironment = process.env,
  production = process.env.NODE_ENV === "production"
): URL {
  const configured = (
    env.API_BASE_URL ??
    (!production ? "http://127.0.0.1:8000" : undefined)
  )?.trim();

  if (!configured) {
    throw new Error("API_BASE_URL não está configurado.");
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("API_BASE_URL deve ser uma URL absoluta válida.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("API_BASE_URL não pode conter credenciais.");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("API_BASE_URL não pode conter query string ou fragmento.");
  }
  if (production && parsed.protocol !== "https:") {
    throw new Error("API_BASE_URL deve usar HTTPS em produção.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("API_BASE_URL deve usar HTTP(S).");
  }

  parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/`;
  return parsed;
}

export function buildBackendUrl(
  base: URL,
  pathname: string,
  search = ""
): string {
  if (
    !pathname.startsWith("/api/v1/") ||
    pathname.length > 2_048 ||
    search.length > 4_096 ||
    pathname.includes("\\")
  ) {
    throw new Error("Caminho de API não permitido.");
  }

  const segments = pathname.split("/").filter(Boolean);
  const encodedPath = segments
    .map((segment) => {
      const decoded = decodeURIComponent(segment);
      if (
        decoded === "." ||
        decoded === ".." ||
        /[\/\\\u0000-\u001f\u007f]/.test(decoded)
      ) {
        throw new Error("Segmento de API não permitido.");
      }
      return encodeURIComponent(decoded);
    })
    .join("/");
  const target = new URL(encodedPath, base);
  target.search = search;
  return target.toString();
}
