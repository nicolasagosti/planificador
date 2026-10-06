import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";

/** "Clientes / Café Lumbre / Octubre 2026": the last item is the page. */
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: Route }[];
}) {
  return (
    <nav
      aria-label="Ruta"
      className="flex flex-wrap items-center gap-x-2 text-14 text-muted"
    >
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && <span aria-hidden="true">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="flex min-h-11 items-center font-semibold text-ink underline underline-offset-3"
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="flex min-h-11 items-center">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
