import { Navigate } from "react-router-dom";

import { useAuth } from "../features/auth/AuthContext";
import { parseLoginForm } from "../features/auth/loginForm";
import { lunaMandalaLogoUrl } from "../lib/brand";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function LoginRoute() {
  const { isAuthenticated, login, loginError, loginLoading } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/control" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || "")
    };
    const parsed = parseLoginForm(values);

    if (!parsed.success) {
      return;
    }

    await login(parsed.data);
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-label="Inicio de sesion">
        <img className="auth-logo" src={lunaMandalaLogoUrl} alt="Luna Mandala" />
        <h1>Admin</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <Input label="Password" name="password" type="password" autoComplete="current-password" required />
          {loginError ? <p className="form-error">{loginError.message}</p> : null}
          <Button type="submit" disabled={loginLoading}>
            {loginLoading ? "Entrando" : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
