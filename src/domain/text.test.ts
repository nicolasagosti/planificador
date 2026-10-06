import { describe, expect, it } from "vitest";
import { counted, joinWithAnd } from "./text";

describe("joinWithAnd", () => {
  it("joins Spanish lists", () => {
    expect(joinWithAnd([])).toBe("");
    expect(joinWithAnd(["Instagram"])).toBe("Instagram");
    expect(joinWithAnd(["Instagram", "Facebook"])).toBe("Instagram y Facebook");
    expect(joinWithAnd(["a", "b", "c"])).toBe("a, b y c");
  });

  it("uses «e» before an «i» sound", () => {
    expect(joinWithAnd(["Facebook", "Instagram"])).toBe("Facebook e Instagram");
    expect(joinWithAnd(["agua", "hilo"])).toBe("agua e hilo");
    expect(joinWithAnd(["agua", "hielo"])).toBe("agua y hielo");
    expect(joinWithAnd(["2 de A", "1 de Impulso"])).toBe(
      "2 de A y 1 de Impulso",
    );
  });
});

describe("counted", () => {
  it("agrees in number", () => {
    expect(counted(1, "pieza", "piezas")).toBe("1 pieza");
    expect(counted(0, "pieza", "piezas")).toBe("0 piezas");
    expect(counted(25, "pieza", "piezas")).toBe("25 piezas");
  });
});
