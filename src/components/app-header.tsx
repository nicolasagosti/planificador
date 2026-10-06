import { signOut } from "@/app/(app)/actions";
import { todayLine } from "@/domain/phrases";
import { today } from "@/server/today";
import { Brand } from "./brand";

export function AppHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-1 px-8 py-2">
        <Brand />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-14 text-muted">
          <span>{todayLine(today())}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-11 cursor-pointer px-1 font-semibold text-ink underline underline-offset-3"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
