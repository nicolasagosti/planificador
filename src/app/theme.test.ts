import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Colors approved in docs/SPEC.md (section 6) and the mockups' hover states.
// The theme must define exactly these: color means status and nothing else.
const approvedColors: Record<string, string> = {
  page: "#F6F7F9",
  surface: "#FFFFFF",
  ink: "#171C28",
  "ink-hover": "#2E3545",
  muted: "#535B6B",
  line: "#D4D8E0",
  "row-hover": "#ECEEF3",
  "control-hover": "#E7E9EE",
  outside: "#EEF0F4",
  hollow: "#717A8A",
  pending: "#F4B700",
  "pending-edge": "#8F6B00",
  "pending-soft": "#FFF2C2",
  done: "#2457D6",
  "done-soft": "#E2EAFD",
  delivered: "#2E3545",
  "delivered-soft": "#E7E9EE",
  overdue: "#D62B1F",
  "overdue-soft": "#FDE8E5",
  "overdue-text": "#A51D13",
};

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function definedColors(): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const match of css.matchAll(
    /--color-([a-z-]+):\s*(#[0-9a-fA-F]{6});/g,
  )) {
    const [, name, value] = match;
    if (name && value) colors[name] = value.toUpperCase();
  }
  return colors;
}

describe("theme", () => {
  it("defines exactly the approved colors", () => {
    expect(definedColors()).toEqual(approvedColors);
  });

  it("removes Tailwind's default palette and shadows", () => {
    expect(css).toContain("--color-*: initial;");
    expect(css).toContain("--shadow-*: initial;");
  });
});
