// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OnboardingScreen } from "./OnboardingScreen";

// Each test picks the build: Buzz (the default) or Solo OS.
const build = vi.hoisted(() => ({ soloos: false }));
vi.mock("../../soloos", () => ({
  get SOLOOS() {
    return build.soloos;
  },
}));

afterEach(() => {
  cleanup();
  build.soloos = false;
});

const step = () =>
  render(
    <OnboardingScreen labelledBy="t" intro={<h1 id="t">Welcome</h1>}>
      {null}
    </OnboardingScreen>,
  );

it("keeps Buzz's first-run card steps unchanged outside Solo OS", () => {
  step();
  const main = screen.getByRole("main", { name: "Welcome" });
  expect(main.hasAttribute("data-soloos-scope")).toBe(false);
  expect(screen.getByRole("img", { name: "Buzz" })).toBeTruthy();
});

it("puts Solo OS first-run card steps in the Solo OS scope with its own mark", () => {
  build.soloos = true;
  step();
  const main = screen.getByRole("main", { name: "Welcome" });
  expect(main.getAttribute("data-soloos-scope")).toBe("");
  expect(screen.getByRole("img", { name: "Solo OS" })).toBeTruthy();
  expect(screen.queryByRole("img", { name: "Buzz" })).toBeNull();
});

it("moves the Solo OS mark clear of the macOS window buttons, and only there", () => {
  build.soloos = true;
  step();
  const mark = () => screen.getByRole("img", { name: "Solo OS" });
  expect(mark().hasAttribute("data-mac-window")).toBe(false);
  cleanup();
  // The desktop app on a Mac: macOS draws its buttons over the top-left corner.
  const host = globalThis as { isTauri?: boolean };
  host.isTauri = true;
  const platform = vi
    .spyOn(navigator, "platform", "get")
    .mockReturnValue("MacIntel");
  try {
    step();
    expect(mark().getAttribute("data-mac-window")).toBe("true");
  } finally {
    platform.mockRestore();
    delete host.isTauri;
  }
});

it("leaves the welcome variant outside the scope", () => {
  build.soloos = true;
  render(
    <OnboardingScreen welcome labelledBy="t" intro={<h1 id="t">Buzz</h1>}>
      {null}
    </OnboardingScreen>,
  );
  expect(
    screen
      .getByRole("main", { name: "Buzz" })
      .hasAttribute("data-soloos-scope"),
  ).toBe(false);
});

/** Every source file under `src`, without tests. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

it("keeps Solo OS colours inside first launch", () => {
  const root = join(process.cwd(), "src");
  const styles = join(root, "shared/design-system/styles");
  const scoped = new Set([
    join(styles, "soloos.css"),
    join(styles, "tokens.css"),
    join(root, "features/identity/OnboardingScreen.tsx"),
  ]);
  for (const file of sources(root)) {
    if (scoped.has(file)) continue;
    const text = readFileSync(file, "utf8");
    expect(text, file).not.toMatch(/--soloos-|data-soloos-scope/);
  }
  // soloos.css defines its palette on :root and reads it only in the scope.
  const css = readFileSync(join(styles, "soloos.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const scope =
    /^:root(:not\(\[data-color-mode="dark"\]\)|\[data-color-mode="dark"\]) main\[data-soloos-scope\]$/;
  for (const [, selector = "", body = ""] of css.matchAll(
    /([^{}]*)\{([^{}]*)\}/g,
  )) {
    if (selector.trim() === ":root") {
      expect(body).not.toMatch(/var\(/);
      continue;
    }
    expect(selector.trim()).toMatch(scope);
  }
  // tokens.css only names the scope on its dark role blocks.
  const tokens = readFileSync(join(styles, "tokens.css"), "utf8");
  expect(tokens).not.toMatch(/--soloos-/);
  expect(tokens.match(/\[data-soloos-scope\]/g)).toHaveLength(2);
});
