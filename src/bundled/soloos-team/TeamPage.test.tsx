// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Agents } from "../../features/agents/service";
import type { HostRequest, HostResponse } from "../../features/host/service";
import { SOLO_OS_COURSE_URL, SOLO_OS_TEAM_ORIGIN, TEAM_COPY } from "./config";
import manifest from "./manifest.json";
import { CLAUDE_TYPE, CODEX_TYPE, KeyStore } from "./team";
import { newTeamCache, TeamPage } from "./TeamPage";

afterEach(cleanup);

const ORIGIN = "https://team.example.com";
const MANAGER_KEY = "ManagerKey_0123456789abcdefghijk";
const COPY_KEY = "CopywriterKey_0123456789abcdefgh";
const OLD_KEY = "RevokedKey_0123456789abcdefghijk";

const ROSTER = [
  ["manager", "Manager", false, "available"],
  ["brand-strategist", "Brand strategist", false, "in_training"],
  ["copywriter", "Copywriter", false, "in_training"],
  ["web-designer", "Web designer", false, "in_training"],
  ["youtube-strategist", "YouTube strategist", true, "in_training"],
  ["content-strategist", "Content strategist", false, "in_training"],
].map(([id, name, paid, status], index) => ({
  id,
  name,
  role: name,
  description: `${name} does their job.`,
  order: index + 1,
  paid,
  status,
  portrait: "data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E",
}));
const managerCard = { name: "Manager", instructions: "# MANAGER" };

function server({ rosterFails = false } = {}) {
  return vi.fn(async ({ url }: HostRequest): Promise<HostResponse> => {
    const reply = (status: number, body: unknown) => ({
      status,
      headers: {},
      body: JSON.stringify(body),
    });
    if (url === `${ORIGIN}/v1/roster`) {
      if (rosterFails) throw new Error("offline");
      return reply(200, { employees: ROSTER });
    }
    const key = new URL(url).searchParams.get("key");
    if (key === MANAGER_KEY)
      return reply(200, { employees: [{ id: "manager", card: managerCard }] });
    if (key === COPY_KEY)
      return reply(403, { error: "in_training", employee: "copywriter" });
    if (key === OLD_KEY) return reply(404, { error: "revoked" });
    return reply(404, { error: "unknown" });
  });
}

function fakeAgents({ types = [CLAUDE_TYPE], hired = [] as string[] } = {}) {
  let agents = hired.map((name) => ({ name }));
  const listeners = new Set<() => void>();
  let snapshot = { status: "ready", agents };
  const create = vi.fn(async (input: { name: string }) => {
    agents = [...agents, { name: input.name }];
    snapshot = { status: "ready", agents };
    for (const listener of listeners) listener();
    return { ...input, pubkey: "p" };
  });
  const service = {
    types: () =>
      types.map((key) => ({
        key,
        title: key === CLAUDE_TYPE ? "Claude" : "Codex",
        adopt: (carry: { instructions?: string }, config: object) => ({
          ...config,
          ...carry,
        }),
        defaults: () => ({ config: {} }),
      })),
    snapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    create,
  } as unknown as Agents;
  return { service, create };
}

function memoryStorage(initial?: object) {
  const items = new Map<string, string>();
  if (initial) items.set("soloos-team.keys.v1", JSON.stringify(initial));
  return {
    getItem: (name: string) => items.get(name) ?? null,
    setItem: (name: string, value: string) => void items.set(name, value),
    items,
  };
}

function renderPage({
  request = server(),
  agents = fakeAgents(),
  storage = memoryStorage(),
} = {}) {
  render(
    <TeamPage
      agents={agents.service}
      request={request}
      origin={ORIGIN}
      keys={new KeyStore(storage)}
      cache={newTeamCache()}
    />,
  );
  return { request, agents, storage };
}

const card = (name: string) => screen.getByRole("listitem", { name });

async function paste(link: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Access link"), link);
  await user.click(screen.getByRole("button", { name: "Unlock" }));
}

describe("TeamPage", () => {
  it("shows the team sheet in hire order, with the Manager locked and the rest in training", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: TEAM_COPY.headline }),
    ).toBeInTheDocument();
    expect(screen.getByText(TEAM_COPY.intro)).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: "Your Solo OS team" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("aria-label")),
    ).toEqual(ROSTER.map((employee) => employee.name));
    expect(
      within(card("Manager")).getByRole("button", { name: "Locked" }),
    ).toBeDisabled();
    for (const name of [
      "Brand strategist",
      "Copywriter",
      "Web designer",
      "YouTube strategist",
      "Content strategist",
    ]) {
      expect(
        within(card(name)).getByRole("button", { name: "In training" }),
      ).toBeDisabled();
      expect(within(card(name)).getByText("Coming soon")).toBeInTheDocument();
    }
    expect(
      within(card("YouTube strategist")).getByText("Paid"),
    ).toBeInTheDocument();
    expect(within(card("Manager")).queryByText("Paid")).toBeNull();
    expect(
      screen.getByRole("link", { name: TEAM_COPY.course }),
    ).toHaveAttribute("href", SOLO_OS_COURSE_URL);
  });

  it("unlocks with a pasted link, remembers the key, and hires with the card", async () => {
    const { agents, storage } = renderPage();
    await screen.findByRole("list");
    await paste(`${ORIGIN}/unlock/${MANAGER_KEY}`);
    await userEvent.click(
      await within(card("Manager")).findByRole("button", { name: "Employ me" }),
    );
    expect(agents.create).toHaveBeenCalledWith({
      type: CLAUDE_TYPE,
      name: "Manager",
      config: { instructions: "# MANAGER" },
    });
    expect(
      await within(card("Manager")).findByText("Hired"),
    ).toBeInTheDocument();
    expect(storage.items.get("soloos-team.keys.v1")).toContain(MANAGER_KEY);
  });

  it("shows Hired for an employee already on the team", async () => {
    renderPage({ agents: fakeAgents({ hired: ["Manager"] }) });
    expect(
      await within(
        await screen.findByRole("listitem", { name: "Manager" }),
      ).findByText("Hired"),
    ).toBeInTheDocument();
  });

  it("unlocks again from a saved key on the next visit", async () => {
    renderPage({
      storage: memoryStorage({
        keys: [{ key: MANAGER_KEY, employees: ["manager"] }],
      }),
    });
    expect(
      await within(
        await screen.findByRole("listitem", { name: "Manager" }),
      ).findByRole("button", { name: "Employ me" }),
    ).toBeEnabled();
  });

  it("forgets a saved key that was revoked and says so", async () => {
    const storage = memoryStorage({
      keys: [{ key: OLD_KEY, employees: ["manager"] }],
    });
    renderPage({ storage });
    expect(await screen.findByRole("alert")).toHaveTextContent(/turned off/);
    expect(storage.items.get("soloos-team.keys.v1")).not.toContain(OLD_KEY);
  });

  it("explains a revoked, unknown or malformed link", async () => {
    renderPage();
    await screen.findByRole("list");
    await paste(`${ORIGIN}/unlock/${OLD_KEY}`);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That access link has been turned off.",
    );
    await userEvent.clear(screen.getByLabelText("Access link"));
    await paste(
      "https://team.example.com/unlock/Unknown_0123456789abcdefghijklm",
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("isn't recognised"),
    );
    await userEvent.clear(screen.getByLabelText("Access link"));
    await paste("my link");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Paste the whole access link",
    );
  });

  it("keeps a link for an employee in training", async () => {
    const { storage } = renderPage();
    await screen.findByRole("list");
    await paste(`${ORIGIN}/unlock/${COPY_KEY}`);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "still in training",
    );
    expect(storage.items.get("soloos-team.keys.v1")).toContain(COPY_KEY);
    expect(
      within(card("Copywriter")).getByRole("button", { name: "In training" }),
    ).toBeDisabled();
  });

  it("reports a network failure and retries", async () => {
    const request = server({ rosterFails: true });
    renderPage({ request });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't reach the Solo OS team server",
    );
    request.mockImplementation(server());
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(await screen.findByRole("list")).toBeInTheDocument();
  });

  it("explains how to turn on Claude when no harness is available", async () => {
    renderPage({ agents: fakeAgents({ types: [] }) });
    expect(await screen.findByRole("note")).toHaveTextContent("turn on Claude");
  });

  it("lets the member choose Codex when both harnesses are on", async () => {
    const agents = fakeAgents({ types: [CLAUDE_TYPE, CODEX_TYPE] });
    renderPage({
      agents,
      storage: memoryStorage({
        keys: [{ key: MANAGER_KEY, employees: ["manager"] }],
      }),
    });
    await userEvent.selectOptions(screen.getByLabelText("Hire as"), "Codex");
    await userEvent.click(
      await within(card("Manager")).findByRole("button", { name: "Employ me" }),
    );
    expect(agents.create.mock.calls[0]?.[0]).toMatchObject({
      type: CODEX_TYPE,
    });
  });

  it("only talks to the origin its manifest declares", () => {
    expect(manifest.host.networkOrigins).toEqual([SOLO_OS_TEAM_ORIGIN]);
    expect(SOLO_OS_TEAM_ORIGIN).not.toMatch(/\/$/);
  });

  it("never logs a key", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );
    renderPage({
      storage: memoryStorage({ keys: [{ key: OLD_KEY, employees: [] }] }),
    });
    await screen.findByRole("list");
    await paste(`${ORIGIN}/unlock/${MANAGER_KEY}`);
    await within(card("Manager")).findByRole("button", { name: "Employ me" });
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(MANAGER_KEY);
      expect(JSON.stringify(spy.mock.calls)).not.toContain(OLD_KEY);
      spy.mockRestore();
    }
  });
});
