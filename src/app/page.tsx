import { redirect } from "next/navigation";

// A landing pública foi removida: a raiz "/" leva direto ao app.
// Logado -> /dashboard; não logado -> o AuthGuard redireciona para /login.
export default function Home() {
  redirect("/dashboard");
}
