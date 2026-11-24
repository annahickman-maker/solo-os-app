# Solo OS and upstream Buzz

Solo OS is one build variant on top of [Buzz by Block](https://github.com/block/buzz-app)
(Apache-2.0). This branch starts from the upstream stable release tag **v1.0.6**
(commit `be9373d0`). Every Solo OS change sits in separate files where it can, and
otherwise behind one switch on each side, so a new upstream release merges with
few conflicts and a plain build of this repository is still plain Buzz:

| Side | Switch | Set by |
| --- | --- | --- |
| Rust | Cargo feature `soloos` on the app crate (`src-tauri`), which enables `buzz-credential-store/soloos`; read everywhere as `buzz_credential_store::SOLOOS` | `src-tauri/tauri.soloos.conf.json` (`build.features`) |
| Web | `VITE_SOLOOS_SELF_HOSTED=true`, read everywhere as `SOLOOS` from `src/soloos.ts` | `scripts/soloos-build.mjs` |
| Bundle | `src-tauri/tauri.soloos.conf.json`: product name Solo OS, identifier `com.soloos.app`, URL scheme `soloos`, icons in `src-tauri/icons/solo-os/` | `scripts/soloos-build.mjs` (`--config`) |

Release tags for members are named `soloos-vX.Y.Z` (README.md, step 1 and
**Updating to a newer version**). Tag a release only from a commit whose Solo OS
build has been built and opened on a Mac.

## What the variant changes

- **Names.** Keychain items, lock files and sessions use `com.soloos.app.*`
  (identity, identity-store, federated-session, agents, previous-agents,
  claude-api-key, jev-key, previous-jev-key, external-app-pairing.v1) and
  `.com.soloos.app.credential-locks` / `.com.soloos.app.instance.lock` in the
  home folder, so Solo OS and Buzz can be installed side by side and never share
  a key, agents or plugins. Its plugin folder lives under its own identifier and
  ignores `BUZZODZ_*` overrides.
- **Sign-in.** No Builderlab plugin, sign-in server or old-Buzz identity import.
  First run offers **Set up my workspace** (create a key, then show the owner's
  public key on **Connect your workspace**) or **I have an invite**. Claude
  agents sign in with a Claude account (`claude auth login`).
- **Links.** The OS hands Solo OS `soloos://` links; inside the app they become
  the same `buzz:` locators every build uses.
- **Look.** First-run card steps only: the Solo OS mark and the Solo OS dashboard
  palette (`src/shared/design-system/styles/soloos.css`). The shell is Buzz's.
- **Team.** A bundled **Team** page (`soloos.team`, in the dock) where members
  hire the Solo OS employees with the access links from their course. It talks
  only to the team server origin in `src/bundled/soloos-team/config.ts`, which
  its manifest declares; see that folder and the `solo-os-team-server` repo.
- **Updates.** Solo OS never reads Buzz's updater settings (see **Updates**).
- **Local workspace.** `scripts/soloos-local/` runs the workspace in Docker
  (project `soloos`, `https://localhost:18490`, settings in
  `Solo OS Local Workspace`), with backups, encrypted off-site backups and
  restore. It runs Block's published relay image, pinned by digest in
  `scripts/soloos-local/common.mjs` (`IMAGE`, `TAGS`) and `compose.yml`.

## Upstream files the variant touches

Added files (no merge conflicts possible; review them when upstream renames
what they import):

- `src/soloos.ts`
- `src/bundled/claude-code/soloos-auth.ts`, `soloos-auth.test.ts`
- `src/features/identity/OnboardingScreen.test.tsx`
- `src/shared/design-system/styles/soloos.css`
- `src/bundled/soloos-team/*` (the Team page)
- `src-tauri/tauri.soloos.conf.json`, `src-tauri/icons/solo-os/*`
- `public/soloos-mark.svg`, `public/soloos-mark-dark.svg`
- `scripts/soloos-build.sh`, `scripts/soloos-build.mjs`, `scripts/soloos-local/*`
- `UPSTREAM.md`

Modified upstream files. These are the only places a merge can conflict. Each
change is a `SOLOOS` branch beside the upstream value, unless noted.

| File | Change |
| --- | --- |
| `crates/credential-store/Cargo.toml` | `soloos` feature |
| `crates/credential-store/src/lib.rs` | `SOLOOS`, `SESSION_SERVICE_PREFIX`, identity service names |
| `crates/credential-store/src/tests.rs` | Solo OS names; release-name test reads the functions |
| `crates/agent-controller/src/credentials.rs` | agent key service names |
| `crates/agent-controller/src/credentials/bundle_lock.rs` | lock folder name |
| `crates/agent-controller/src/credentials/tests.rs` | tests read `SERVICE` instead of the literal |
| `crates/plugin-manager/src/lib.rs` | drop Builderlab, pairing as Essentials, add the Team page (`soloos.team`, on by default); catalog test parser |
| `src-tauri/Cargo.toml` | `soloos` feature |
| `src-tauri/build.rs` | updater reads `SOLOOS_UPDATER_*` for the soloos feature |
| `src-tauri/src/claude_key.rs`, `jev.rs`, `host_mcp/pairing.rs`, `sign_out.rs`, `federated_identity/store.rs` | service and lock names |
| `src-tauri/src/deep_links.rs` | `soloos:` OS scheme; config test |
| `src-tauri/src/legacy_communities.rs` | no old-Buzz communities |
| `src-tauri/src/lib.rs` | own plugin folder; leave Buzz's CLI shortcut alone |
| `src-tauri/src/identity/tests.rs` | Solo OS identity name |
| `src/bundled/index.ts` | drop Builderlab, pairing as Essentials, add the Team page |
| `src/bundled/discovery.test.ts` | Builderlab only outside Solo OS |
| `src/bundled/claude-code/index.ts` | Claude account sign-in |
| `src/bundled/claude-code/auth.tsx` | two fields typed `string` so a subclass may override them (no behaviour change) |
| `src/features/identity/Welcome.tsx` | self-hosted first run (`selfHosted` prop, default `SOLOOS`) |
| `src/features/identity/ConnectChoice.tsx`, `LegacyIdentityOffer.tsx`, `CommunityUrlField.tsx`, `Wireframe.tsx` | optional props used by that flow |
| `src/features/identity/OnboardingScreen.tsx` | Solo OS mark and scope; optional footnote |
| `src/features/identity/IdentitySetup.module.css` | `.footnote`, `.soloosMark` (appended) |
| `src/features/identity/identity.test.tsx`, `src/features/communities/CommunityLanding.test.tsx` | tests for the flow (appended) |
| `src/features/communities/CommunityLanding.tsx` | owner's code on **Connect your workspace** |
| `src/shared/design-system/styles/tokens.css` | `[data-soloos-scope]` added to the two dark role blocks |
| `src/shared/design-system/styles/globals.css` | `@import "./soloos.css"` |
| `src/shared/design-system/DESIGN.md` | one paragraph on the Solo OS first-run scope |
| `scripts/build-goose-acp.mjs` | download timeout 20 minutes instead of 2 (slow connections stopped member builds); safe to drop if upstream changes it |
| `README.md` | replaced by the member setup guide (take ours) |
| `NOTICE.md` | Solo OS section added at the top (keep upstream's text below it) |

Keep this table current: `git diff --name-status <upstream tag> HEAD` lists the
files, and every `M` line must appear here.

## Merging a new upstream release

Use a stable tag (`vX.Y.Z`, never a `-preview` or `-beta` one).

```sh
git remote add upstream https://github.com/block/buzz-app.git   # once
git fetch upstream tag vX.Y.Z --no-tags
git switch -c merge-vX.Y.Z
git merge vX.Y.Z
```

Then:

1. **Resolve conflicts** in the files listed above. Keep upstream's change and
   re-apply the Solo OS branch beside it. For `README.md` keep ours; for
   `NOTICE.md` keep our Solo OS section and upstream's text below it.
2. **Find new names that must differ.** Upstream may add keychain services, lock
   files or app-wide folders. Search for them and give each a `SOLOOS` branch
   with a `com.soloos.app.*` name:

   ```sh
   git grep -nE '"(xyz\.block\.buzz|dev\.local\.buzz)[^"]*"' -- '*.rs' ':!*test*'
   ```

   Every hit that names a keychain service or a lock must either have a
   `buzz_credential_store::SOLOOS` branch or be per-identifier already.
3. **Check the self-hosted first run** still matches upstream's `Welcome.tsx`
   flow, and that `src/bundled/index.ts` still lists Builderlab, pairing and the
   Team page the way the Solo OS filter expects (the Rust test
   `native_catalog_matches_desktop_bundles` parses that file).
4. **Check the relay image.** If upstream's desktop needs a newer relay, update
   `IMAGE` and `TAGS` in `scripts/soloos-local/common.mjs` (and the matching
   image lines in `compose.yml`) to a published `ghcr.io/block/buzz` build,
   pinned by digest.
5. **Verify:** `pnpm typecheck`, `pnpm lint`, `pnpm vitest run` with and without
   `VITE_SOLOOS_SELF_HOSTED=true`, `cargo test -p buzz-credential-store
   --features soloos`, `cargo test --manifest-path src-tauri/Cargo.toml --features soloos deep_links`,
   then build with `./scripts/soloos-build.sh` and run README steps 3 to 6 on a
   Mac with a fresh workspace (`SOLOOS_HOME` and `SOLOOS_PROJECT` point the
   scripts at a scratch workspace so a real one is untouched).
6. Merge to the Solo OS main branch, update the base tag at the top of this
   file, and tag `soloos-vX.Y.Z`.

## Updates

Solo OS never pulls Buzz's updates. Upstream registers its updater only when a
build sets `BUZZ_UPDATER_PUBLIC_KEY` and `BUZZ_UPDATER_ENDPOINT`; for the `soloos`
feature `src-tauri/build.rs` ignores those two and reads
`SOLOOS_UPDATER_PUBLIC_KEY` and `SOLOOS_UPDATER_ENDPOINT` instead, and
`scripts/soloos-build.mjs` clears the Buzz pair as well. Members' builds set
neither, so the updater plugin is not registered and **Check for updates**
reports that updates are unavailable. Members update by rebuilding from the
newest `soloos-v*` tag (README.md).

To add a Solo OS release feed later:

1. Make an updater key pair with `pnpm tauri signer generate` and keep the
   private key in the release machine's secrets.
2. Build signed release bundles (not the members' debug builds) with
   `SOLOOS_UPDATER_PUBLIC_KEY` and `SOLOOS_UPDATER_ENDPOINT` set, and pass the
   same values as config: `--config '{"plugins":{"updater":{"pubkey":"...","endpoints":["https://.../latest.json"]}}}'`
   (upstream's `scripts/candidate-version.mjs` shows the shape).
3. Publish `latest.json` and the signed bundles at that endpoint, on a host the
   Solo OS project controls. Never point it at Buzz's feed.
4. Add the endpoint's host to the `connect-src` list in the Solo OS config only
   if the webview, not the native updater, needs to reach it.
