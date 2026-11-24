// Builds the Solo OS desktop app from this checkout, on the member's own
// computer. One build, one variant: the `soloos` Cargo feature and
// VITE_SOLOOS_SELF_HOSTED, with src-tauri/tauri.soloos.conf.json.
//
//   bin/node scripts/soloos-build.mjs [tauri build options]   (macOS)
//   node scripts/soloos-build.mjs [tauri build options]       (Windows)
//
// scripts/soloos-build.sh is the same build for an Apple silicon Mac.
// Run it with Node 24. On a Mac that is bin/node, and Rust comes from bin/
// too; on Windows, Node and Rust are installed first (README.md).
//
// The app lands in target/debug/bundle/macos/Solo Command Centre.app on a Mac, and as an
// installer in target\debug\bundle\nsis on Windows. It is a debug build, as
// every Solo OS build is: it is made on the computer that runs it, and is
// signed for that computer only.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const windows = process.platform === "win32";
const mac = process.platform === "darwin";
const root = fileURLToPath(new URL("../", import.meta.url));
const config = "src-tauri/tauri.soloos.conf.json";

// The pnpm version package.json names is installed with the npm beside this
// Node into a folder of its own, which goes first on PATH. This Node's own
// folder comes next: bin/node is a Hermit launcher that puts bin/ back at the
// front for everything it starts, and Hermit has no pnpm for an Intel Mac.
const tools = join(root, "target", "soloos-tools");
const launchers = windows ? tools : join(tools, "bin");
const bin = join(root, "bin");
const env = {
  ...process.env,
  PATH: [
    launchers,
    dirname(process.execPath),
    ...(!windows && existsSync(bin) ? [bin] : []),
    process.env.PATH,
  ].join(delimiter),
  // Empty, not unset: an unset build compiles in the default sign-in server.
  BUZZ_BUILD_FEDERATED_IDENTITY_CONFIG: "",
  BUZZ_BUILDERLAB_URL: "",
  // Solo OS never updates itself from Buzz's release feed. build.rs ignores
  // these for the soloos feature anyway; clearing them keeps the intent plain.
  BUZZ_UPDATER_PUBLIC_KEY: "",
  BUZZ_UPDATER_ENDPOINT: "",
  VITE_SOLOOS_SELF_HOSTED: "true",
};

function run(command, list) {
  const result = spawnSync(command, list, {
    cwd: root,
    stdio: "inherit",
    // Launchers are .cmd files on Windows, which only a shell can start.
    shell: windows,
    env,
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const read = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));

// Tauri merges a config's window list as a whole, so the window title is set
// on this platform's own list: macOS and Windows/Linux keep their own window
// settings, and only the title changes.
const platformConfig = mac
  ? "src-tauri/tauri.macos.conf.json"
  : windows
    ? "src-tauri/tauri.windows.conf.json"
    : "src-tauri/tauri.linux.conf.json";
const windowsList = (
  read(platformConfig).app?.windows ??
  read("src-tauri/tauri.conf.json").app.windows
).map((window) => ({ ...window, title: "Solo Command Centre" }));
// A file, not a JSON argument, so no shell has to quote it.
mkdirSync(tools, { recursive: true });
const titled = join(tools, "window-title.conf.json");
writeFileSync(titled, JSON.stringify({ app: { windows: windowsList } }));

// The Windows shell splits unquoted paths at spaces.
const quote = (value) => (windows ? `"${value}"` : value);
const { packageManager } = read("package.json");
run(quote(join(dirname(process.execPath), "npm")), [
  "install",
  "--global",
  "--prefix",
  quote(tools),
  "--no-fund",
  "--no-audit",
  packageManager,
]);
run("pnpm", ["install", "--frozen-lockfile"]);
run("pnpm", [
  "tauri",
  "build",
  "--debug",
  "--bundles",
  mac ? "app" : windows ? "nsis" : "deb",
  "--config",
  config,
  "--config",
  quote(titled),
  ...args,
]);
