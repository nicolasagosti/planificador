"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const MESSAGES = {
  invalid: "El email o la contraseña no son correctos.",
  tooMany: "Hiciste demasiados intentos. Esperá un minuto y probá de nuevo.",
  failed: "No pudimos iniciar la sesión. Probá de nuevo en un momento.",
};

const inputClass =
  "min-h-11 rounded-button border border-hollow bg-surface px-3 text-15 text-ink focus-visible:border-ink";

export function PasswordLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    if (result.error) {
      setPending(false);
      setError(
        result.error.status === 429
          ? MESSAGES.tooMany
          : result.error.status === 401
            ? MESSAGES.invalid
            : MESSAGES.failed,
      );
      return;
    }
    router.replace(next as Route);
    router.refresh();
  }

  return (
    // method="post": if the script never loaded, a native submit must not put
    // the password in the URL.
    <form
      method="post"
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-5"
    >
      {error && (
        <p
          role="alert"
          className="rounded-button border-[1.5px] border-ink bg-surface px-3 py-2.5 font-semibold"
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-13 font-semibold text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-13 font-semibold text-muted">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 min-h-12 cursor-pointer rounded-button bg-ink px-4.5 font-semibold text-surface hover:bg-ink-hover disabled:cursor-wait disabled:bg-ink-hover"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
