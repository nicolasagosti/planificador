"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleSignIn({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    setPending(true);
    setFailed(false);
    // On success the browser goes to Google and comes back to `next`; if
    // Google sends an error, Better Auth returns to /login?error=<code>.
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      errorCallbackURL: "/login",
    });
    if (result.error) {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {failed && (
        <p
          role="alert"
          className="rounded-button border-[1.5px] border-ink bg-surface px-3 py-2.5 font-semibold"
        >
          No pudimos entrar con Google. Probá de nuevo.
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="min-h-12 cursor-pointer rounded-button bg-ink px-4.5 font-semibold text-surface hover:bg-ink-hover disabled:cursor-wait disabled:bg-ink-hover"
      >
        {pending ? "Yendo a Google…" : "Entrar con Google"}
      </button>
    </div>
  );
}
