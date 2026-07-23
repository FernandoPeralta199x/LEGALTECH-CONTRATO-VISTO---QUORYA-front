import { RequestBodyError } from "@/server/http/requestBody";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegistrationInput = LoginCredentials & {
  name: string;
};

function validEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 256;
}

export function requireLoginCredentials(value: unknown): LoginCredentials {
  if (typeof value !== "object" || value === null) {
    throw new RequestBodyError("Credenciais inválidas.", 400);
  }
  const record = value as Record<string, unknown>;
  if (!validEmail(record.email) || !validPassword(record.password)) {
    throw new RequestBodyError("E-mail ou senha inválidos.", 400);
  }
  return {
    email: record.email.trim().toLowerCase(),
    password: record.password
  };
}

export function requireRegistrationInput(value: unknown): RegistrationInput {
  const credentials = requireLoginCredentials(value);
  const name = (value as Record<string, unknown>).name;
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 120
  ) {
    throw new RequestBodyError("Nome inválido.", 400);
  }
  return { ...credentials, name: name.trim() };
}
