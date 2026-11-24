// The Team page's logic, kept free of React so it is easy to test: reading
// access links, talking to the team server, remembering keys, working out
// each card's state and hiring.
//
// Keys are secrets. Nothing here logs them, puts them in an error message or
// sends them anywhere except the team server.

import type { HostRequest, HostResponse } from "../../features/host/service";
import type { Agent, Agents } from "../../features/agents/service";

export type EmployeeStatus = "available" | "in_training";

export type Employee = Readonly<{
  id: string;
  name: string;
  role: string;
  description: string;
  order: number;
  paid: boolean;
  status: EmployeeStatus;
  /** A data: image or https: URL, when the server supplied a usable one. */
  portrait?: string;
}>;

export type Card = Readonly<{ name: string; instructions: string }>;

export type Request = (input: HostRequest) => Promise<HostResponse>;

const KEY = /^[A-Za-z0-9_-]{24,128}$/;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

// Access links

/** The key in a pasted access link (`https://<host>/unlock/<key>`) or a bare
 * key; undefined for anything else. */
export function parseAccessLink(input: string): string | undefined {
  const text = input.trim();
  if (KEY.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  const match = /^\/unlock\/([^/]+)\/?$/.exec(url.pathname);
  const key = match?.[1];
  return key && KEY.test(key) ? key : undefined;
}

// The team server

function isPortrait(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 200_000 &&
    (/^data:image\/(svg\+xml|png|jpeg|webp)[;,]/.test(value) ||
      /^https:\/\/[^\s"'<>]+$/.test(value))
  );
}

/** The roster's valid entries, in hire order. An unknown status reads as in
 * training, so a newer server never makes an employee hireable by accident. */
export function parseRoster(body: unknown): Employee[] {
  const list = (body as { employees?: unknown } | null)?.employees;
  if (!Array.isArray(list))
    throw new Error("The team server sent an unexpected roster");
  const employees: Employee[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const { id, name, role, description, order, paid, status, portrait } =
      entry;
    if (
      typeof id !== "string" ||
      !ID.test(id) ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof order !== "number" ||
      !Number.isFinite(order) ||
      employees.some((employee) => employee.id === id)
    )
      continue;
    employees.push({
      id,
      name: name.trim(),
      role: typeof role === "string" ? role : "",
      description: typeof description === "string" ? description : "",
      order,
      paid: paid === true,
      status: status === "available" ? "available" : "in_training",
      ...(isPortrait(portrait) && { portrait }),
    });
  }
  return employees.sort((a, b) => a.order - b.order);
}

export type UnlockFailure =
  | "unknown"
  | "revoked"
  | "in_training"
  | "unavailable"
  | "rate_limited"
  | "network";

export type UnlockResult =
  | Readonly<{ ok: true; cards: ReadonlyMap<string, Card> }>
  | Readonly<{ ok: false; reason: UnlockFailure; employee?: string }>;

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

export async function fetchRoster(
  request: Request,
  origin: string,
): Promise<Employee[]> {
  const response = await request({
    url: `${origin}/v1/roster`,
    method: "GET",
    headers: { accept: "application/json" },
    timeoutMs: 15_000,
  });
  if (response.status !== 200)
    throw new Error(`The team server answered ${response.status}`);
  return parseRoster(parseJson(response.body));
}

/** Asks the team server what `key` unlocks. Never throws. */
export async function unlock(
  request: Request,
  origin: string,
  key: string,
): Promise<UnlockResult> {
  let response: HostResponse;
  try {
    response = await request({
      url: `${origin}/v1/unlock?key=${encodeURIComponent(key)}`,
      method: "GET",
      headers: { accept: "application/json" },
      timeoutMs: 15_000,
    });
  } catch {
    return { ok: false, reason: "network" };
  }
  const body = parseJson(response.body) as
    | { error?: unknown; employee?: unknown; employees?: unknown }
    | undefined;
  const employee =
    typeof body?.employee === "string" ? body.employee : undefined;
  const failed = (reason: UnlockFailure): UnlockResult => ({
    ok: false,
    reason,
    ...(employee && { employee }),
  });
  if (response.status === 404)
    return failed(body?.error === "revoked" ? "revoked" : "unknown");
  if (response.status === 403 && body?.error === "in_training")
    return failed("in_training");
  if (response.status === 429) return failed("rate_limited");
  if (response.status === 503) return failed("unavailable");
  if (response.status !== 200 || !Array.isArray(body?.employees))
    return failed("network");
  const cards = new Map<string, Card>();
  for (const item of body.employees as unknown[]) {
    const { id, card } = (item ?? {}) as { id?: unknown; card?: unknown };
    const { name, instructions } = (card ?? {}) as {
      name?: unknown;
      instructions?: unknown;
    };
    if (
      typeof id === "string" &&
      ID.test(id) &&
      typeof name === "string" &&
      name.trim() &&
      typeof instructions === "string" &&
      instructions.trim()
    )
      cards.set(id, { name: name.trim(), instructions });
  }
  return cards.size ? { ok: true, cards } : failed("unknown");
}

export function unlockMessage(reason: UnlockFailure): string {
  switch (reason) {
    case "unknown":
      return "That access link isn't recognised. Copy it again from the lesson.";
    case "revoked":
      return "That access link has been turned off. Get the current link from the lesson.";
    case "in_training":
      return "That employee is still in training. Your link is saved, and they unlock here when they're ready.";
    case "unavailable":
      return "That employee isn't ready to hire yet. Try again a little later.";
    case "rate_limited":
      return "Too many tries in a short time. Wait a few minutes, then try again.";
    case "network":
      return "Couldn't reach the Solo OS team server. Check your internet connection and try again.";
  }
}

// Remembered keys

export const STORAGE_KEY = "soloos-team.keys.v1";

export type SavedKey = Readonly<{ key: string; employees: readonly string[] }>;

/** The keys this device has unlocked, in localStorage. Keys only, never cards. */
export class KeyStore {
  constructor(
    private readonly storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  ) {}

  list(): SavedKey[] {
    try {
      const parsed = JSON.parse(
        this.storage?.getItem(STORAGE_KEY) ?? "null",
      ) as {
        keys?: unknown;
      } | null;
      if (!Array.isArray(parsed?.keys)) return [];
      return parsed.keys.flatMap((item: unknown) => {
        const { key, employees } = (item ?? {}) as {
          key?: unknown;
          employees?: unknown;
        };
        return typeof key === "string" && KEY.test(key)
          ? [
              {
                key,
                employees: Array.isArray(employees)
                  ? employees.filter(
                      (id): id is string => typeof id === "string",
                    )
                  : [],
              },
            ]
          : [];
      });
    } catch {
      return [];
    }
  }

  /** Remembers `key`, replacing any earlier entry for it. */
  save(key: string, employees: readonly string[]) {
    this.write([
      ...this.list().filter((saved) => saved.key !== key),
      { key, employees },
    ]);
  }

  forget(key: string) {
    this.write(this.list().filter((saved) => saved.key !== key));
  }

  private write(keys: readonly SavedKey[]) {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify({ keys }));
    } catch {
      // Storage full or blocked: the key still works for this visit.
    }
  }
}

// Card state

export type CardState =
  | Readonly<{ kind: "hired" }>
  | Readonly<{ kind: "in_training" }>
  | Readonly<{ kind: "employ"; card: Card }>
  | Readonly<{ kind: "locked" }>;

/** Names of the agents in the selected community, for the Hired check. */
export function agentNames(
  agents: readonly Pick<Agent, "name">[],
): ReadonlySet<string> {
  return new Set(agents.map((agent) => agent.name.trim()));
}

/** Hired wins (an agent with the card's or roster's exact name is here), then
 * In training (from the server roster), then Employ me with an unlocked card,
 * else Locked. */
export function cardState(
  employee: Employee,
  cards: ReadonlyMap<string, Card>,
  names: ReadonlySet<string>,
): CardState {
  const card = cards.get(employee.id);
  if (names.has(employee.name) || (card && names.has(card.name)))
    return { kind: "hired" };
  if (employee.status !== "available") return { kind: "in_training" };
  return card ? { kind: "employ", card } : { kind: "locked" };
}

// Hiring

export const CLAUDE_TYPE = "buzz.claude-code/claude-code";
export const CODEX_TYPE = "buzz.codex/codex";

export type Harness = Readonly<{ key: string; title: string }>;

/** The agent types a card can be hired as here: Claude first, then Codex.
 * Only local types that take instructions qualify. */
export function harnesses(agents: Pick<Agents, "types">): Harness[] {
  const types = agents.types();
  return [CLAUDE_TYPE, CODEX_TYPE].flatMap((key) => {
    const type = types.find((entry) => entry.key === key);
    return type && !type.remote && type.adopt
      ? [{ key, title: type.title }]
      : [];
  });
}

export type HireFailure =
  | "not_connected"
  | "already_hired"
  | "no_harness"
  | "failed";

export class HireError extends Error {
  constructor(
    readonly reason: HireFailure,
    message: string,
  ) {
    super(message);
    this.name = "HireError";
  }
}

export type HireAgents = Pick<Agents, "types" | "create" | "snapshot">;

/** The team server's image of an employee's portrait: an HTTPS URL, which is
 * the only kind of picture an agent can have. */
export function portraitUrl(origin: string, employeeId: string): string {
  return `${origin}/v1/portrait/${encodeURIComponent(employeeId)}`;
}

/** Creates the card's agent, with its exact name, instructions and picture,
 * in the selected community as `typeKey`. */
export async function hire(
  agents: HireAgents,
  card: Card,
  typeKey: string,
  picture?: string,
): Promise<Agent> {
  const snapshot = agents.snapshot();
  if (snapshot.status !== "ready")
    throw new HireError(
      "not_connected",
      "Your workspace isn't connected yet. Wait for it to connect, then try again.",
    );
  if (agentNames(snapshot.agents).has(card.name))
    throw new HireError(
      "already_hired",
      `${card.name} is already on your team.`,
    );
  const kind = agents.types().find((entry) => entry.key === typeKey);
  if (!kind || kind.remote || !kind.adopt)
    throw new HireError("no_harness", noHarnessMessage);
  const config = kind.adopt(
    { instructions: card.instructions },
    kind.defaults().config,
  );
  try {
    return await agents.create({
      type: typeKey,
      name: card.name,
      ...(picture && { picture }),
      config,
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message ? ` (${error.message})` : "";
    throw new HireError(
      "failed",
      `Couldn't hire ${card.name}${detail}. Try again.`,
    );
  }
}

export const noHarnessMessage =
  "To hire, turn on Claude: open Settings, then Plugins, and turn on Claude. Then sign in with your Claude account when Solo Command Centre asks, and come back here.";
