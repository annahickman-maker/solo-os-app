import { describe, expect, it, vi } from "vitest";
import type { HostRequest, HostResponse } from "../../features/host/service";
import {
  agentNames,
  type Card,
  cardState,
  CLAUDE_TYPE,
  CODEX_TYPE,
  type Employee,
  fetchRoster,
  harnesses,
  hire,
  type HireAgents,
  HireError,
  KeyStore,
  parseAccessLink,
  parseRoster,
  portraitUrl,
  STORAGE_KEY,
  unlock,
} from "./team";

const KEY = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const ORIGIN = "https://team.example.com";

const employee = (patch: Partial<Employee> = {}): Employee => ({
  id: "manager",
  name: "Manager",
  role: "Manager",
  description: "Sets things up.",
  order: 1,
  paid: false,
  status: "available",
  ...patch,
});
const card: Card = { name: "Manager", instructions: "# MANAGER\nHello." };

function respond(status: number, body: unknown) {
  return vi.fn(
    async (_input: HostRequest): Promise<HostResponse> => ({
      status,
      headers: {},
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("parseAccessLink", () => {
  it("reads the key from an access link", () => {
    expect(parseAccessLink(`${ORIGIN}/unlock/${KEY}`)).toBe(KEY);
    expect(parseAccessLink(`  ${ORIGIN}/unlock/${KEY}/  `)).toBe(KEY);
    expect(
      parseAccessLink(`https://other.example/unlock/${KEY}?from=lesson#top`),
    ).toBe(KEY);
  });

  it("accepts a bare key", () => {
    expect(parseAccessLink(KEY)).toBe(KEY);
  });

  it("rejects anything else", () => {
    for (const input of [
      "",
      "hello",
      `${ORIGIN}/unlock/short`,
      `${ORIGIN}/unlock/${KEY}/extra`,
      `${ORIGIN}/other/${KEY}`,
      `javascript:/unlock/${KEY}`,
      `ftp://team.example.com/unlock/${KEY}`,
      `${KEY} ${KEY}`,
    ])
      expect(parseAccessLink(input), input).toBeUndefined();
  });
});

describe("roster", () => {
  it("keeps valid entries in hire order with their server status", () => {
    const roster = parseRoster({
      employees: [
        employee({
          id: "copywriter",
          name: "Copywriter",
          order: 3,
          status: "in_training",
        }),
        employee({ portrait: "data:image/svg+xml;charset=utf-8,%3Csvg%3E" }),
        employee({
          id: "youtube-strategist",
          name: "YouTube strategist",
          order: 5,
          paid: true,
          status: "in_training",
        }),
        { id: "Bad Id", name: "x", order: 2 },
        { id: "no-name", order: 2 },
      ],
    });
    expect(roster.map((entry) => [entry.id, entry.status, entry.paid])).toEqual(
      [
        ["manager", "available", false],
        ["copywriter", "in_training", false],
        ["youtube-strategist", "in_training", true],
      ],
    );
    expect(roster[0]?.portrait).toMatch(/^data:image\/svg\+xml/);
  });

  it("reads an unknown status as in training and drops unsafe portraits", () => {
    const [entry] = parseRoster({
      employees: [
        employee({
          status: "released" as never,
          portrait: "javascript:alert(1)",
        }),
      ],
    });
    expect(entry?.status).toBe("in_training");
    expect(entry?.portrait).toBeUndefined();
  });

  it("fetches from the team server origin", async () => {
    const request = respond(200, { employees: [employee()] });
    await expect(fetchRoster(request, ORIGIN)).resolves.toHaveLength(1);
    expect(request.mock.calls[0]?.[0].url).toBe(`${ORIGIN}/v1/roster`);
  });

  it("throws when the server is unreachable or answers badly", async () => {
    await expect(fetchRoster(respond(500, "oops"), ORIGIN)).rejects.toThrow();
    await expect(
      fetchRoster(respond(200, "not json"), ORIGIN),
    ).rejects.toThrow();
  });
});

describe("unlock", () => {
  it("returns the cards a key unlocks", async () => {
    const request = respond(200, { employees: [{ id: "manager", card }] });
    const result = await unlock(request, ORIGIN, KEY);
    expect(result).toEqual({ ok: true, cards: new Map([["manager", card]]) });
    expect(request.mock.calls[0]?.[0].url).toBe(
      `${ORIGIN}/v1/unlock?key=${KEY}`,
    );
  });

  it.each([
    [404, { error: "unknown" }, "unknown"],
    [404, { error: "revoked" }, "revoked"],
    [403, { error: "in_training", employee: "copywriter" }, "in_training"],
    [429, { error: "rate_limited" }, "rate_limited"],
    [503, { error: "card_unavailable" }, "unavailable"],
    [500, "server error", "network"],
    [200, { employees: [{ id: "manager", card: { name: "" } }] }, "unknown"],
  ])("maps %i %j to %s", async (status, body, reason) => {
    const result = await unlock(respond(status, body), ORIGIN, KEY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe(reason);
  });

  it("reports a network failure without the key in it", async () => {
    const request = vi.fn(async () => {
      throw new Error(`connect failed for ${ORIGIN}/v1/unlock?key=${KEY}`);
    });
    const result = await unlock(request, ORIGIN, KEY);
    expect(result).toEqual({ ok: false, reason: "network" });
    expect(JSON.stringify(result)).not.toContain(KEY);
  });
});

describe("KeyStore", () => {
  const memory = () => {
    const items = new Map<string, string>();
    return {
      getItem: (name: string) => items.get(name) ?? null,
      setItem: (name: string, value: string) => void items.set(name, value),
      items,
    };
  };

  it("remembers several keys and forgets one", () => {
    const storage = memory();
    const keys = new KeyStore(storage);
    const other = "ZyXwVuTsRqPoNmLkJiHgFeDcBa987654";
    keys.save(KEY, ["manager"]);
    keys.save(other, ["copywriter"]);
    keys.save(KEY, ["manager"]);
    expect(new KeyStore(storage).list()).toEqual([
      { key: other, employees: ["copywriter"] },
      { key: KEY, employees: ["manager"] },
    ]);
    keys.forget(other);
    expect(keys.list().map((saved) => saved.key)).toEqual([KEY]);
  });

  it("ignores broken storage", () => {
    const storage = memory();
    storage.items.set(STORAGE_KEY, "{not json");
    expect(new KeyStore(storage).list()).toEqual([]);
    storage.items.set(
      STORAGE_KEY,
      JSON.stringify({ keys: [{ key: "short" }, { key: KEY }] }),
    );
    expect(new KeyStore(storage).list()).toEqual([{ key: KEY, employees: [] }]);
    expect(new KeyStore(undefined).list()).toEqual([]);
  });
});

describe("cardState", () => {
  const none = new Set<string>();
  it("is In training for an employee the server has not released", () => {
    expect(
      cardState(employee({ status: "in_training" }), new Map(), none),
    ).toEqual({ kind: "in_training" });
    expect(
      cardState(
        employee({ status: "in_training" }),
        new Map([["manager", card]]),
        none,
      ),
    ).toEqual({
      kind: "in_training",
    });
  });

  it("is Locked until a key unlocks the card", () => {
    expect(cardState(employee(), new Map(), none)).toEqual({ kind: "locked" });
  });

  it("is Employ me with the unlocked card", () => {
    expect(cardState(employee(), new Map([["manager", card]]), none)).toEqual({
      kind: "employ",
      card,
    });
  });

  it("is Hired when an agent has the employee's exact name", () => {
    const names = agentNames([{ name: "Manager" }]);
    expect(cardState(employee(), new Map([["manager", card]]), names)).toEqual({
      kind: "hired",
    });
    expect(
      cardState(employee({ status: "in_training" }), new Map(), names),
    ).toEqual({ kind: "hired" });
    expect(
      cardState(employee(), new Map(), agentNames([{ name: "Manager 2" }])),
    ).toEqual({ kind: "locked" });
  });

  it("matches the card's name too, when it differs from the roster's", () => {
    const renamed = { ...card, name: "Avery" };
    expect(
      cardState(
        employee(),
        new Map([["manager", renamed]]),
        agentNames([{ name: "Avery" }]),
      ),
    ).toEqual({
      kind: "hired",
    });
  });
});

describe("hire", () => {
  type FakeType = {
    key: string;
    title: string;
    remote?: boolean;
    adopt?: (carry: { instructions?: string }, config: object) => object;
    defaults: () => { config: object };
  };
  const claude: FakeType = {
    key: CLAUDE_TYPE,
    title: "Claude",
    adopt: (carry, config) => ({ ...config, instructions: carry.instructions }),
    defaults: () => ({ config: { model: "", instructions: "" } }),
  };
  const codex: FakeType = { ...claude, key: CODEX_TYPE, title: "Codex" };

  function fakeAgents({
    types = [claude],
    agents = [] as { name: string }[],
    status = "ready",
  }: {
    types?: FakeType[];
    agents?: { name: string }[];
    status?: string;
  } = {}) {
    const create = vi.fn(async (input: { name: string }) => ({
      ...input,
      pubkey: "p",
    }));
    const service = {
      types: () => types,
      snapshot: () => ({ status, agents }),
      create,
    } as unknown as HireAgents;
    return { service, create };
  }

  it("creates the agent with the card's exact name and instructions", async () => {
    const { service, create } = fakeAgents();
    await hire(service, card, CLAUDE_TYPE);
    expect(create).toHaveBeenCalledWith({
      type: CLAUDE_TYPE,
      name: "Manager",
      config: { model: "", instructions: card.instructions },
    });
  });

  it("gives the agent the employee's portrait as its picture", async () => {
    const { service, create } = fakeAgents();
    const picture = portraitUrl("https://team.example.com", "manager");
    await hire(service, card, CLAUDE_TYPE, picture);
    expect(picture).toBe("https://team.example.com/v1/portrait/manager");
    expect(create.mock.calls[0]?.[0]).toMatchObject({ picture });
  });

  it("can hire as Codex", async () => {
    const { service, create } = fakeAgents({ types: [claude, codex] });
    await hire(service, card, CODEX_TYPE);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ type: CODEX_TYPE });
  });

  it("refuses an employee who is already hired", async () => {
    const { service, create } = fakeAgents({ agents: [{ name: "Manager" }] });
    await expect(hire(service, card, CLAUDE_TYPE)).rejects.toMatchObject({
      reason: "already_hired",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses before the workspace is connected", async () => {
    const { service } = fakeAgents({ status: "loading" });
    await expect(hire(service, card, CLAUDE_TYPE)).rejects.toMatchObject({
      reason: "not_connected",
    });
  });

  it("explains how to get Claude when no harness is on", async () => {
    const { service } = fakeAgents({ types: [] });
    const error = await hire(service, card, CLAUDE_TYPE).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(HireError);
    expect(error.reason).toBe("no_harness");
    expect(error.message).toMatch(/turn on Claude/);
  });

  it("wraps a failed create in a clear message", async () => {
    const { service, create } = fakeAgents();
    create.mockRejectedValueOnce(new Error("relay offline"));
    await expect(hire(service, card, CLAUDE_TYPE)).rejects.toMatchObject({
      reason: "failed",
      message: "Couldn't hire Manager (relay offline). Try again.",
    });
  });

  it("lists Claude before Codex, and only local types with instructions", () => {
    expect(
      harnesses(fakeAgents({ types: [codex, claude] }).service).map(
        (type) => type.key,
      ),
    ).toEqual([CLAUDE_TYPE, CODEX_TYPE]);
    const { adopt: _adopt, ...noInstructions } = codex;
    expect(
      harnesses(
        fakeAgents({ types: [{ ...claude, remote: true }, noInstructions] })
          .service,
      ),
    ).toEqual([]);
  });
});
