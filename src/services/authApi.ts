import { apiClient } from "./apiClient";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  role: string;
}

export interface VerifyEmailPayload {
  email: string;
  token: string;
}

export interface AuthTokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organization_id: string;
  };
}

export interface RegisterResult {
  user_id: string;
  email: string;
  status: string;
  message: string;
  verification_token?: string;
}

export async function login(payload: LoginPayload): Promise<AuthTokenResult> {
  const response = await apiClient.post<AuthTokenResult>("/api/v1/auth/login", payload);
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  // Backend serverless: signup em POST /users (cria organização + usuário admin).
  // Não há verificação por e-mail no modelo atual; a conta já fica ativa.
  const response = await apiClient.post<{
    user_id: string;
    role: string;
    organization_id: string;
  }>("/api/v1/users", {
    email: payload.email,
    name: payload.name,
    password: payload.password
  });
  return {
    user_id: response.data.user_id,
    email: payload.email,
    status: "active",
    message: "Conta criada com sucesso."
  };
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<AuthTokenResult> {
  const response = await apiClient.post<AuthTokenResult>("/api/v1/auth/verify-email", payload);
  return response.data;
}
