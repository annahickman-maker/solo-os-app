import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { Agents } from "../../features/agents/service";
import { UsersIcon } from "../../shared/design-system/icons/index";
import { Button } from "../../shared/design-system/ui/Button";
import { FullPageSurface } from "../../shared/design-system/ui/FullPageSurface";
import { Input } from "../../shared/design-system/ui/Input";
import {
  PanelHeader,
  PanelHeaderLabel,
} from "../../shared/design-system/ui/PanelHeader";
import { SOLO_OS_COURSE_URL, TEAM_COPY } from "./config";
import styles from "./Team.module.css";
import {
  agentNames,
  type Card,
  type CardState,
  cardState,
  type Employee,
  fetchRoster,
  harnesses,
  hire,
  HireError,
  type KeyStore,
  noHarnessMessage,
  parseAccessLink,
  type Request,
  unlock,
  unlockMessage,
} from "./team";

/** What outlives one visit to the page while the app runs: the roster and
 * unlocked cards, so reopening the page doesn't ask the server again. */
export type TeamCache = {
  roster?: Employee[];
  cards: Map<string, Card>;
  /** Saved keys already checked this run. */
  checked: Set<string>;
};

export function newTeamCache(): TeamCache {
  return { cards: new Map(), checked: new Set() };
}

export type TeamPageProps = {
  agents: Agents;
  request: Request;
  origin: string;
  keys: KeyStore;
  cache: TeamCache;
};

type Notice = Readonly<{ tone: "error" | "success" | "info"; text: string }>;

export function TeamPage({
  agents,
  request,
  origin,
  keys,
  cache,
}: TeamPageProps) {
  const subscribe = useCallback(
    (listener: () => void) => agents.subscribe(listener),
    [agents],
  );
  const snapshot = useSyncExternalStore(subscribe, () => agents.snapshot());
  // `types()` changes when a harness plugin is turned on or off; snapshots
  // change with it, so read it on each render.
  const choices = harnesses(agents);
  const [roster, setRoster] = useState<Employee[] | undefined>(cache.roster);
  const [rosterError, setRosterError] = useState(false);
  const [cards, setCards] = useState<ReadonlyMap<string, Card>>(
    () => new Map(cache.cards),
  );
  const [link, setLink] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const [hiring, setHiring] = useState<string>();
  const [harness, setHarness] = useState<string>();
  const chosen = choices.find((choice) => choice.key === harness) ?? choices[0];

  const addCards = useCallback(
    (found: ReadonlyMap<string, Card>) => {
      for (const [id, card] of found) cache.cards.set(id, card);
      setCards(new Map(cache.cards));
    },
    [cache],
  );

  const loadRoster = useCallback(() => {
    setRosterError(false);
    fetchRoster(request, origin).then(
      (employees) => {
        cache.roster = employees;
        setRoster(employees);
      },
      () => setRosterError(true),
    );
  }, [cache, origin, request]);

  useEffect(() => {
    if (!cache.roster) loadRoster();
  }, [cache, loadRoster]);

  // Saved keys unlock their cards again once per run.
  useEffect(() => {
    let live = true;
    const pending = keys
      .list()
      .filter((saved) => !cache.checked.has(saved.key));
    (async () => {
      for (const saved of pending) {
        cache.checked.add(saved.key);
        const result = await unlock(request, origin, saved.key);
        if (!live) return;
        if (result.ok) {
          keys.save(saved.key, [...result.cards.keys()]);
          addCards(result.cards);
        } else if (result.reason === "revoked" || result.reason === "unknown") {
          keys.forget(saved.key);
          setNotice({
            tone: "error",
            text: "One of your saved access links has been turned off. Paste the current link from the lesson.",
          });
        } else if (
          result.reason === "network" ||
          result.reason === "rate_limited"
        ) {
          // Try again on the next visit.
          cache.checked.delete(saved.key);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [addCards, cache, keys, origin, request]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (unlocking) return;
    const key = parseAccessLink(link);
    if (!key) {
      setNotice({
        tone: "error",
        text: "Paste the whole access link from the lesson. It ends in /unlock/ and a long code.",
      });
      return;
    }
    setUnlocking(true);
    setNotice(undefined);
    const result = await unlock(request, origin, key);
    setUnlocking(false);
    if (result.ok) {
      keys.save(key, [...result.cards.keys()]);
      cache.checked.add(key);
      addCards(result.cards);
      setLink("");
      const names = [...result.cards.values()]
        .map((card) => card.name)
        .join(" and ");
      setNotice({
        tone: "success",
        text: `Unlocked ${names}. Choose Employ me on their card.`,
      });
      return;
    }
    if (result.reason === "in_training") {
      // Kept, so the employee unlocks by itself once released.
      keys.save(key, result.employee ? [result.employee] : []);
      setLink("");
    }
    setNotice({ tone: "error", text: unlockMessage(result.reason) });
  };

  const employ = async (employee: Employee, card: Card) => {
    if (hiring || !chosen) return;
    setHiring(employee.id);
    setNotice(undefined);
    try {
      await hire(agents, card, chosen.key);
      setNotice({
        tone: "success",
        text: `${card.name} is on your team. Find them in your agents and say hello.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof HireError
            ? error.message
            : `Couldn't hire ${card.name}. Try again.`,
      });
    } finally {
      setHiring(undefined);
    }
  };

  const names = agentNames(snapshot.agents);
  return (
    <div className={styles.root}>
      <FullPageSurface aria-label={TEAM_COPY.title}>
        <div className={styles.frame}>
          <PanelHeader
            title={
              <PanelHeaderLabel
                title={TEAM_COPY.title}
                icon={<UsersIcon size="1rem" />}
              />
            }
          />
          <div className={styles.scroll}>
            <div className={styles.content}>
              <header className={styles.hero}>
                <h1 className={styles.headline}>{TEAM_COPY.headline}</h1>
                <p className={styles.intro}>{TEAM_COPY.intro}</p>
              </header>

              <form
                className={styles.unlock}
                onSubmit={submit}
                aria-label="Unlock an employee"
              >
                <label className={styles.label} htmlFor="soloos-team-link">
                  Access link
                </label>
                <div className={styles.unlockRow}>
                  <Input
                    id="soloos-team-link"
                    value={link}
                    onValueChange={(value) => setLink(String(value))}
                    placeholder="Paste the link from your lesson"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    type="submit"
                    variant="prominent"
                    loading={unlocking}
                    disabled={!link.trim()}
                  >
                    Unlock
                  </Button>
                </div>
                {notice && (
                  <p
                    className={styles.notice}
                    data-tone={notice.tone}
                    role={notice.tone === "error" ? "alert" : "status"}
                  >
                    {notice.text}
                  </p>
                )}
              </form>

              {choices.length === 0 ? (
                <p className={styles.notice} data-tone="info" role="note">
                  {noHarnessMessage}
                </p>
              ) : (
                choices.length > 1 && (
                  <div className={styles.harness}>
                    <label
                      className={styles.label}
                      htmlFor="soloos-team-harness"
                    >
                      Hire as
                    </label>
                    <select
                      id="soloos-team-harness"
                      className={styles.select}
                      value={chosen?.key}
                      onChange={(event) => setHarness(event.target.value)}
                    >
                      {choices.map((choice) => (
                        <option key={choice.key} value={choice.key}>
                          {choice.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}

              {!roster ? (
                rosterError ? (
                  <div className={styles.notice} data-tone="error" role="alert">
                    <p>
                      Couldn't reach the Solo OS team server. Check your
                      internet connection.
                    </p>
                    <Button variant="subtle" size="sm" onClick={loadRoster}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <p className={styles.muted} role="status">
                    Loading your team...
                  </p>
                )
              ) : (
                <ol className={styles.grid} aria-label="Your Solo OS team">
                  {roster.map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      state={cardState(employee, cards, names)}
                      busy={hiring === employee.id}
                      canHire={!!chosen && !hiring}
                      onEmploy={employ}
                    />
                  ))}
                </ol>
              )}

              <footer className={styles.footer}>
                <a href={SOLO_OS_COURSE_URL} target="_blank" rel="noreferrer">
                  {TEAM_COPY.course}
                </a>
              </footer>
            </div>
          </div>
        </div>
      </FullPageSurface>
    </div>
  );
}

function EmployeeCard({
  employee,
  state,
  busy,
  canHire,
  onEmploy,
}: {
  employee: Employee;
  state: CardState;
  busy: boolean;
  canHire: boolean;
  onEmploy: (employee: Employee, card: Card) => void;
}) {
  return (
    <li
      className={styles.card}
      data-state={state.kind}
      aria-label={employee.name}
    >
      <div className={styles.portrait}>
        {employee.portrait ? (
          <img src={employee.portrait} alt="" width={64} height={64} />
        ) : (
          <span aria-hidden="true">{employee.name.slice(0, 1)}</span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.order}>{employee.order}</span>
          <h2 className={styles.name}>{employee.name}</h2>
          {employee.paid && <span className={styles.badge}>Paid</span>}
        </div>
        {employee.role && employee.role !== employee.name && (
          <p className={styles.role}>{employee.role}</p>
        )}
        {employee.description && (
          <p className={styles.description}>{employee.description}</p>
        )}
        <div className={styles.action}>
          {state.kind === "hired" && (
            <span className={styles.hired} role="status">
              Hired
            </span>
          )}
          {state.kind === "in_training" && (
            <>
              <Button variant="subtle" size="sm" disabled>
                In training
              </Button>
              <span className={styles.muted}>Coming soon</span>
            </>
          )}
          {state.kind === "locked" && (
            <>
              <Button variant="subtle" size="sm" disabled>
                Locked
              </Button>
              <span className={styles.muted}>
                Paste the link from their lesson
              </span>
            </>
          )}
          {state.kind === "employ" && (
            <Button
              variant="prominent"
              size="sm"
              loading={busy}
              disabled={!canHire}
              onClick={() => onEmploy(employee, state.card)}
            >
              Employ me
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
