/**
 * Whether this is the Solo OS build. `scripts/soloos-build.sh` sets
 * VITE_SOLOOS_SELF_HOSTED for the web side, as it sets the `soloos` Cargo
 * feature for the native side. A Solo OS build connects to a workspace its
 * owner runs (by default the local one from `scripts/soloos-local/`), with no
 * Builderlab sign-in. Every Solo OS-only branch in the UI reads this one flag.
 */
export const SOLOOS = import.meta.env.VITE_SOLOOS_SELF_HOSTED === "true";
