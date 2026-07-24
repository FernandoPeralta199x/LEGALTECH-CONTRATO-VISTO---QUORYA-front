const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;
const HARD_MAX_BODY_BYTES = 10 * 1024 * 1024;

export class RequestBodyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

export function requestBodyLimit(): number {
  const configured = Number(process.env.BFF_MAX_BODY_BYTES);
  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_MAX_BODY_BYTES;
  }
  return Math.min(Math.floor(configured), HARD_MAX_BODY_BYTES);
}

export async function readLimitedBody(
  request: Request,
  limit = requestBodyLimit()
): Promise<ArrayBuffer | undefined> {
  if (!request.body) {
    return undefined;
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) {
    throw new RequestBodyError("Corpo da requisição excede o limite.", 413);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new RequestBodyError("Corpo da requisição excede o limite.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

export async function readJsonBody<T>(
  request: Request,
  limit = 64 * 1024
): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new RequestBodyError(
      "Content-Type application/json é obrigatório.",
      415
    );
  }

  const body = await readLimitedBody(request, limit);
  if (!body?.byteLength) {
    throw new RequestBodyError("Corpo JSON obrigatório.", 400);
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as T;
  } catch {
    throw new RequestBodyError("Corpo JSON inválido.", 400);
  }
}
