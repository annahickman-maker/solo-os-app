// Solo OS Team: the page where a member meets the Solo OS employees and hires
// them, one access link at a time. Bundled only in the Solo OS build
// (src/bundled/index.ts, behind SOLOOS).
import type { PluginModule } from "../../plugins/api";
import { SOLO_OS_TEAM_ORIGIN, TEAM_COPY } from "./config";
import { KeyStore } from "./team";
import { newTeamCache, TeamPage } from "./TeamPage";

export const inject = ["pages", "agents", "host"];

/** Two people, in the page list and dock. */
export const TEAM_ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.8 14.3c2.3.2 4 1.8 4.7 4.7"/></svg>',
)}`;

export const apply: PluginModule["apply"] = (ctx) => {
  const { agents, host } = ctx;
  const keys = new KeyStore(
    typeof localStorage === "undefined" ? undefined : localStorage,
  );
  // Lives while the plugin is on, so reopening the page is instant.
  const cache = newTeamCache();
  const request = (input: Parameters<typeof host.request>[0]) =>
    host.request(input);
  ctx.pages.register({
    id: "team",
    title: TEAM_COPY.title,
    layout: "workspace",
    primary: true,
    placement: "dock",
    icon: TEAM_ICON,
    component: () => (
      <TeamPage
        agents={agents}
        request={request}
        origin={SOLO_OS_TEAM_ORIGIN}
        keys={keys}
        cache={cache}
      />
    ),
  });
};
