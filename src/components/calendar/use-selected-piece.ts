"use client";

import { useRef, useState } from "react";

/**
 * The selected piece of a calendar, kept in the URL (?pieza=) without
 * reloading. On a phone the panel is under the grid, so selecting brings it
 * into view.
 */
export function useSelectedPiece(initialId: string | null) {
  const [selectedId, setSelectedId] = useState(initialId);
  const panelRef = useRef<HTMLDivElement>(null);

  function select(id: string | null) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("pieza", id);
    else url.searchParams.delete("pieza");
    window.history.replaceState(null, "", url);
    const panel = panelRef.current;
    if (panel && panel.getBoundingClientRect().top > window.innerHeight) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return { selectedId, select, panelRef };
}
