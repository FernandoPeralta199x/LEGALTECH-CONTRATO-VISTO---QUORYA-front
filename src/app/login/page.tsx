"use client";

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { Button } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errorMessage";
import { login, register as registerUser } from "@/services/authApi";
import { sanitizeNextPath } from "@/lib/safeRedirect";
import { validatePasswordCreate } from "@/lib/validation";

type Tab = "login" | "register";
type ToastState = {
  message: string;
  tone: "error" | "success" | "warning";
} | null;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");  // sanitizado no uso (A6 — open redirect)

  const [tab, setTab] = useState<Tab>("login");
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordValidation = validatePasswordCreate({
    password: registerPassword
  });
  const passwordsMatch =
    registerPassword.length > 0 && registerPassword === confirmPassword;
  const strengthScore =
    registerPassword.length === 0
      ? 0
      : Object.values(passwordValidation.requirements).filter(Boolean).length;
  const strengthMeta =
    strengthScore >= 5
      ? { label: "Forte", text: "text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500" }
      : strengthScore >= 3
        ? { label: "Média", text: "text-amber-600 dark:text-amber-300", bar: "bg-amber-500" }
        : { label: "Fraca", text: "text-red-500 dark:text-red-300", bar: "bg-red-500" };
  const canSubmitRegister =
    name.trim().length > 0 &&
    registerEmail.length > 0 &&
    passwordValidation.valid &&
    passwordsMatch;

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setToast(null);
    setLoading(true);

    try {
      await login({
        email: loginEmail,
        password: loginPassword
      });

      setToast({
        message: "Login realizado. Redirecionando...",
        tone: "success"
      });
      await new Promise((resolve) => setTimeout(resolve, 450));
      router.replace(sanitizeNextPath(nextPath));
    } catch (err) {
      setToast({
        message: errorMessage(err, "E-mail ou senha inválidos."),
        tone: "error"
      });
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // O botão fica desabilitado enquanto inválido; este guard é só defesa (ex.: Enter).
    if (loading || !canSubmitRegister) return;

    setToast(null);
    setLoading(true);

    try {
      await registerUser({
        email: registerEmail,
        name,
        password: registerPassword,
        role: "client"
      });
      // Serverless: a conta já fica ativa após o signup (sem verificação por
      // e-mail). Faz login direto com as credenciais recém-criadas.
      await login({
        email: registerEmail,
        password: registerPassword
      });
      setToast({ message: "Conta criada. Redirecionando...", tone: "success" });
      await new Promise((resolve) => setTimeout(resolve, 450));
      router.replace(sanitizeNextPath(nextPath));
    } catch (err) {
      setToast({
        message: errorMessage(err, "Não foi possível criar o cadastro."),
        tone: "error"
      });
      setLoading(false);
    }
  }

  function switchTab(nextTab: Tab) {
    setTab(nextTab);
    setToast(null);
  }

  return (
    <main className="cv-login-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-45 noise" />
      <Link
        className="absolute left-5 top-5 z-10 flex items-center gap-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--teal)]"
        href="/"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--bd)] bg-[var(--surf2)]">
          <ShieldCheck size={16} />
        </span>
        Contrato Visto
      </Link>
      <ThemeToggle className="absolute right-5 top-5 z-10" />

      <section
        aria-label="Autenticação"
        className="cv-login-card relative z-10 w-full max-w-md px-4 pb-8 pt-14 backdrop-blur-lg backdrop-saturate-150 sm:px-10 sm:pb-12 sm:pt-16"
      >
        <div aria-hidden="true" className="absolute -top-11 left-1/2 h-[88px] w-[88px] -translate-x-1/2">
          <div className="absolute -inset-3 animate-pulse rounded-full bg-[radial-gradient(circle,rgba(95,200,152,0.24)_0%,transparent_68%)]" />
          <div className="absolute -inset-[3px] animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_28%,rgba(95,200,152,.12)_40%,rgba(95,200,152,.88)_53%,rgba(190,255,225,1)_57%,rgba(95,200,152,.88)_61%,rgba(95,200,152,.12)_72%,transparent_84%,transparent_100%)]" />
          <div className="cv-login-avatar absolute inset-0 flex items-center justify-center rounded-full bg-[linear-gradient(148deg,#2a6068,#021f23)] text-emerald-100">
            <ShieldCheck size={34} />
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase text-[var(--text3)]">
            Acesso à plataforma
          </p>
          <span className="cv-badge cv-badge-teal">
            <Sparkles size={12} />
            Sessão segura
          </span>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-1">
          <button
            className={cn(
              "rounded-md px-3 py-2 text-xs font-semibold transition",
              tab === "login"
                ? "bg-brand-teal text-white shadow"
                : "text-[var(--text2)] hover:text-[var(--text)]"
            )}
            aria-pressed={tab === "login"}
            onClick={() => switchTab("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={cn(
              "rounded-md px-3 py-2 text-xs font-semibold transition",
              tab === "register"
                ? "bg-brand-teal text-white shadow"
                : "text-[var(--text2)] hover:text-[var(--text)]"
            )}
            aria-pressed={tab === "register"}
            onClick={() => switchTab("register")}
            type="button"
          >
            Cadastro
          </button>
        </div>

        {toast && (
          <div
            className={cn(
              "mb-5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs",
              toast.tone === "error" &&
                "border-red-500/30 bg-red-500/10 text-red-200",
              toast.tone === "success" &&
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
              toast.tone === "warning" &&
                "border-amber-500/30 bg-amber-500/10 text-amber-200"
            )}
            role="alert"
          >
            {toast.tone === "success" && <Check size={14} className="mt-0.5 shrink-0" />}
            {toast.tone === "error" && <X size={14} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
          </div>
        )}

        {tab === "login" ? (
          <form
            className="space-y-4 duration-200 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
            onSubmit={handleLogin}
          >
            <Field label="E-mail" icon={<Mail size={15} />} required>
              <input
                autoComplete="email"
                className={inputClass}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="seu@email.com"
                required
                type="email"
                value={loginEmail}
              />
            </Field>

            <Field htmlFor="login-password" label="Senha" icon={<Lock size={15} />} required>
              <div className="relative">
                <input
                  autoComplete="current-password"
                  className={`${inputClass} pr-10`}
                  id="login-password"
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Sua senha forte"
                  required
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                />
                <button
                  aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                  onClick={() => setShowLoginPassword((current) => !current)}
                  type="button"
                >
                  {showLoginPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                </button>
              </div>
            </Field>

            <Button
              className="w-full"
              icon={<ArrowRight size={16} />}
              loading={loading}
              type="submit"
              variant="primary"
            >
              Entrar
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4 duration-200 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
            onSubmit={handleRegister}
          >
            <Field label="Nome completo" icon={<User size={15} />} required>
              <input
                autoComplete="name"
                className={inputClass}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                required
                type="text"
                value={name}
              />
            </Field>

            <Field label="E-mail" icon={<Mail size={15} />} required>
              <input
                autoComplete="email"
                className={inputClass}
                onChange={(event) => setRegisterEmail(event.target.value)}
                placeholder="seu@email.com"
                required
                type="email"
                value={registerEmail}
              />
            </Field>

            <Field htmlFor="register-password" label="Senha" icon={<Lock size={15} />} required>
              <div className="relative">
                <input
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                  id="register-password"
                  onChange={(event) => setRegisterPassword(event.target.value)}
                  placeholder="Mínimo 12 caracteres"
                  required
                  type={showRegisterPassword ? "text" : "password"}
                  value={registerPassword}
                />
                <button
                  aria-label={showRegisterPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                  onClick={() => setShowRegisterPassword((current) => !current)}
                  type="button"
                >
                  {showRegisterPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                </button>
              </div>
            </Field>

            <Field htmlFor="register-confirm-password" label="Repetir senha" icon={<Lock size={15} />} required>
              <div className="relative">
                <input
                  autoComplete="new-password"
                  className={cn(
                    `${inputClass} pr-10`,
                    confirmPassword.length > 0 &&
                      (passwordsMatch
                        ? "border-emerald-500/60 focus:border-emerald-500"
                        : "border-red-500/60 focus:border-red-500")
                  )}
                  id="register-confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a senha"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                />
                <button
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  type="button"
                >
                  {showConfirmPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    passwordsMatch
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-500 dark:text-red-300"
                  )}
                >
                  {passwordsMatch ? <Check size={12} /> : <X size={12} />}
                  {passwordsMatch ? "As senhas coincidem" : "As senhas não coincidem"}
                </p>
              )}
            </Field>

            {registerPassword.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text3)]">Força da senha</span>
                  <span className={cn("font-semibold", strengthMeta.text)}>
                    {strengthMeta.label}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surf3)]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      strengthMeta.bar
                    )}
                    style={{ width: `${(strengthScore / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {passwordRequirements.map(([key, label]) => {
                const met =
                  passwordValidation.requirements[
                    key as keyof typeof passwordValidation.requirements
                  ];
                return (
                  <div className="flex items-center gap-2 text-xs" key={key}>
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold",
                        met
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                          : "border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                      )}
                    >
                      {met ? <Check size={10} /> : "·"}
                    </span>
                    <span
                      className={cn(
                        met
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button
              className="w-full"
              disabled={!canSubmitRegister}
              icon={<ArrowRight size={16} />}
              loading={loading}
              type="submit"
              variant="primary"
            >
              Criar conta
            </Button>
          </form>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-[var(--bd)] pt-5">
          <div className="relative h-16 w-16">
            <span
              aria-hidden="true"
              className="absolute -inset-[3px] rounded-full border border-[rgba(95,200,152,0.4)]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="QUORYA — Inteligência para Vendas"
              className="h-16 w-16 rounded-full object-cover"
              src="/quorya-emblem.png"
            />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold tracking-[0.18em] text-[var(--text)]">
              QUORYA
            </p>
            <p className="mt-1 text-[13px] text-[var(--teal)]">
              Inteligência para Vendas
            </p>
            <p className="mt-1 text-[13px] text-[var(--text3)]">© 2026</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  children,
  htmlFor,
  icon,
  label,
  required
}: {
  children: React.ReactNode;
  htmlFor?: string;
  icon: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  const labelText = (
    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text)]">
      {icon}
      {label}
      {required && (
        <span aria-hidden="true" className="text-red-500">
          *
        </span>
      )}
    </span>
  );
  // Com htmlFor: associação EXPLÍCITA (o <label> aponta só ao input; controles
  // extras como o toggle de senha ficam fora do label — A11Y-10). Sem htmlFor:
  // label envolvente, adequado a campos de controle único.
  if (htmlFor) {
    return (
      <div className="block space-y-1.5">
        <label className="block" htmlFor={htmlFor}>
          {labelText}
        </label>
        {children}
      </div>
    );
  }
  return (
    <label className="block space-y-1.5">
      {labelText}
      {children}
    </label>
  );
}

const passwordRequirements = [
  ["hasMinLength", "Mínimo de 12 caracteres"],
  ["hasMaxLength", "Máximo de 18 caracteres"],
  ["hasLowercase", "Pelo menos 1 letra minúscula"],
  ["hasUppercase", "Pelo menos 1 letra maiúscula"],
  ["hasSpecial", "Pelo menos 1 caractere especial"]
] as const;

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surf2)] px-3.5 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text3)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition-[border-color,box-shadow] duration-200 hover:border-brand-teal/40 focus:border-[var(--teal)] focus:outline-none focus:ring-2 focus:ring-brand-teal/25";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[var(--text2)]">
          Carregando...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
