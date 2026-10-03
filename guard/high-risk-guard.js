#!/usr/bin/env node
// PreToolUse (Bash) guard: denies high-risk commands in every permission mode,
// including bypassPermissions. The user runs them manually with `!` instead.
//
// Denied:
//   - git push to main/master (explicit refspec or current branch), --force,
//     --force-with-lease, +refspec, --all, --mirror
//   - wrangler deploy / npm|pnpm|yarn|bun run deploy without --env dev
//     (deploy:dev scripts are allowed)
//   - wrangler d1 migrations apply --remote without --env dev
//   - wrangler d1 execute --remote without --env dev
//   - wrangler secret put|delete|bulk and wrangler delete without --env dev
//   - wrangler r2 object|bucket delete and wrangler d1 delete without --env dev
//   - gh pr merge, and gh api calls that merge (PUT .../pulls/N/merge,
//     POST .../merges, GraphQL merge mutations)
//   - piping into a shell (`... | sh`, `... | bash`): the script is unanalyzable
//   - recursive rm outside temp dirs
// Everything else passes through untouched (exit 0, no output).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROTECTED_BRANCHES = new Set(["main", "master"]);
const SHELLS = new Set(["bash", "sh", "zsh", "dash", "ksh", "fish"]);
const TEMP_ROOTS = [
    "/tmp",
    "/private/tmp",
    "/var/folders",
    "/private/var/folders",
    os.tmpdir(),
    process.env.TMPDIR,
]
    .filter(Boolean)
    .map((p) => path.resolve(p));

// Splits a shell string into command segments of tokens. Handles quotes and
// the separators ; && || | & and newlines. Not a full shell parser.
// A segment that receives a pipe (`a | b`) gets `pipedIn = true`.
function parseSegments(cmd) {
    const segments = [];
    let tokens = [];
    let cur = "";
    let hasCur = false;
    let quote = null;
    let pipedIn = false;
    const pushToken = () => {
        if (hasCur) tokens.push(cur);
        cur = "";
        hasCur = false;
    };
    const pushSegment = (nextPiped = false) => {
        pushToken();
        if (tokens.length) {
            tokens.pipedIn = pipedIn;
            segments.push(tokens);
        }
        tokens = [];
        pipedIn = nextPiped;
    };
    for (let i = 0; i < cmd.length; i++) {
        const c = cmd[i];
        if (quote) {
            if (c === quote) quote = null;
            else if (c === "\\" && quote === '"' && i + 1 < cmd.length) cur += cmd[++i];
            else cur += c;
            continue;
        }
        if (c === "'" || c === '"') {
            quote = c;
            hasCur = true;
        } else if (c === "\\" && i + 1 < cmd.length) {
            cur += cmd[++i];
            hasCur = true;
        } else if (c === "|") {
            if (cmd[i + 1] === "|") {
                i++;
                pushSegment(false);
            } else {
                if (cmd[i + 1] === "&") i++; // |& pipes stderr too
                pushSegment(true);
            }
        } else if (c === ";" || c === "\n" || c === "&" || c === "(" || c === ")") {
            pushSegment();
        } else if (/\s/.test(c)) {
            pushToken();
        } else {
            cur += c;
            hasCur = true;
        }
    }
    pushSegment();
    return segments;
}

// Drops leading env assignments and wrappers (sudo, env, npx, command, exec, time).
function stripPrefixes(tokens) {
    let t = [...tokens];
    for (;;) {
        if (!t.length) return t;
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0])) t.shift();
        else if (["sudo", "env", "command", "exec", "time", "nohup"].includes(t[0])) t.shift();
        else if (["npx", "bunx"].includes(t[0])) {
            t.shift();
            while (t.length && t[0].startsWith("-")) t.shift();
        } else if (t[0] === "pnpm" && ["exec", "dlx"].includes(t[1])) t = t.slice(2);
        else return t;
    }
}

function isDevEnv(args) {
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if ((a === "--env" || a === "-e") && args[i + 1] === "dev") return true;
        if (a === "--env=dev" || a === "-e=dev") return true;
    }
    return false;
}

function currentBranch(dir) {
    try {
        return execFileSync("git", ["-C", dir, "symbolic-ref", "--short", "HEAD"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch {
        return null;
    }
}

function checkGit(args, cwd) {
    let dir = cwd;
    let i = 0;
    while (i < args.length && args[i].startsWith("-")) {
        if (args[i] === "-C") dir = path.resolve(dir, args[++i] ?? ".");
        else if (args[i] === "-c") i++;
        i++;
    }
    if (args[i] !== "push") return null;
    const rest = args.slice(i + 1);
    const positional = [];
    // Options whose value is the next argument (not a remote or refspec).
    const VALUE_OPTS = new Set(["-o", "--push-option", "--repo", "--receive-pack", "--exec"]);
    for (let j = 0; j < rest.length; j++) {
        const a = rest[j];
        // Shell redirections (`2>&1` is split at `&`, leaving `2>`): never refspecs.
        if (/^\d*(>>?|<)/.test(a)) {
            if (/^\d*(>>?|<)$/.test(a)) j++; // operator alone: its target is the next token
            continue;
        }
        if (VALUE_OPTS.has(a)) {
            j++;
            continue;
        }
        if (a === "-f" || a === "--force" || a.startsWith("--force-with-lease") || a === "--force-if-includes")
            return "git push --force";
        if (a === "--all" || a === "--mirror") return `git push ${a}`;
        if (/^-[a-zA-Z]*f[a-zA-Z]*$/.test(a) && !a.startsWith("--")) return "git push --force";
        if (!a.startsWith("-")) positional.push(a);
    }
    const refspecs = positional.slice(1);
    for (const spec of refspecs) {
        if (spec.startsWith("+")) return "git push with a +force refspec";
        const dst = (spec.includes(":") ? spec.split(":").pop() : spec).replace(/^refs\/heads\//, "");
        const src = spec.includes(":") ? spec.split(":")[0] : spec;
        const target = dst === "HEAD" || src === "HEAD" && !spec.includes(":") ? currentBranch(dir) : dst;
        if (PROTECTED_BRANCHES.has(target)) return `git push to ${target}`;
    }
    if (refspecs.length === 0) {
        const branch = currentBranch(dir);
        if (PROTECTED_BRANCHES.has(branch)) return `git push from ${branch}`;
    }
    return null;
}

function checkWrangler(args) {
    const sub = args.filter((a) => !a.startsWith("-"));
    if (sub.includes("deploy") && !isDevEnv(args)) return "wrangler deploy to production (no --env dev)";
    if (sub[0] === "d1" && sub[1] === "migrations" && sub[2] === "apply" && args.includes("--remote") && !isDevEnv(args))
        return "remote D1 migration outside dev";
    if (sub[0] === "d1" && sub[1] === "execute" && args.includes("--remote") && !isDevEnv(args))
        return "remote D1 execute outside dev";
    if (sub[0] === "secret" && ["put", "delete", "bulk"].includes(sub[1]) && !isDevEnv(args))
        return `wrangler secret ${sub[1]} to production`;
    if (sub[0] === "delete" && !isDevEnv(args)) return "wrangler delete outside dev";
    if (sub[0] === "r2" && ["object", "bucket"].includes(sub[1]) && sub[2] === "delete" && !isDevEnv(args))
        return `wrangler r2 ${sub[1]} delete outside dev`;
    if (sub[0] === "d1" && sub[1] === "delete" && !isDevEnv(args)) return "wrangler d1 delete outside dev";
    return null;
}

function checkGh(args) {
    const positional = args.filter((a) => !a.startsWith("-"));
    const prIdx = positional.indexOf("pr");
    if (prIdx !== -1 && positional[prIdx + 1] === "merge") return "gh pr merge (merges into the PR base branch)";
    if (positional[0] !== "api") return null;
    // gh api flags that take a value; their values are not the endpoint
    const VALUE_FLAGS = new Set(["-X", "--method", "-f", "--raw-field", "-F", "--field", "-H", "--header",
        "--input", "-q", "--jq", "-t", "--template", "--hostname", "--cache", "-p", "--preview"]);
    let method = null;
    let hasFields = false;
    let endpoint = "";
    for (let i = args.indexOf("api") + 1; i < args.length; i++) {
        const a = args[i];
        if (a === "-X" || a === "--method") method = (args[i + 1] || "").toUpperCase();
        else if (a.startsWith("--method=")) method = a.slice(9).toUpperCase();
        else if (/^-X[A-Za-z]+$/.test(a)) method = a.slice(2).toUpperCase();
        if (["-f", "-F", "--field", "--raw-field", "--input"].includes(a) || /^--(raw-)?field=/.test(a)) hasFields = true;
        if (VALUE_FLAGS.has(a)) i++;
        else if (!a.startsWith("-") && !endpoint) endpoint = a;
    }
    // gh api switches from GET to POST as soon as fields are passed
    const effective = method || (hasFields ? "POST" : "GET");
    if (/(^|\/)pulls\/[^/]+\/merge\/?$/.test(endpoint) && effective === "PUT") return "gh api PR merge";
    if (/(^|\/)merges\/?$/.test(endpoint) && effective === "POST") return "gh api branch merge";
    if (endpoint === "graphql" && /\b(mergePullRequest|mergeBranch|enablePullRequestAutoMerge)\b/.test(args.join(" ")))
        return "gh api GraphQL merge mutation";
    return null;
}

function checkRunDeploy(tool, args) {
    // npm run deploy | npm run-script deploy | pnpm deploy | yarn deploy | bun run deploy
    let script = null;
    if (["run", "run-script"].includes(args[0])) script = args.find((a, idx) => idx > 0 && !a.startsWith("-"));
    else if (tool !== "npm" && args[0] && !args[0].startsWith("-")) script = args[0];
    if (!script) return null;
    if (!/^deploy(:|$)/.test(script)) return null;
    if (/^deploy:dev$/.test(script) || isDevEnv(args)) return null;
    return `${tool} run ${script} (production deploy)`;
}

function isUnderTemp(p, cwd) {
    if (/[$`*?]/.test(p) || p.startsWith("~")) return false;
    const abs = path.resolve(cwd, p);
    return TEMP_ROOTS.some((root) => abs === root ? false : abs.startsWith(root + path.sep));
}

function checkRm(args, cwd) {
    let recursive = false;
    const targets = [];
    let endOfOpts = false;
    for (const a of args) {
        if (!endOfOpts && a === "--") endOfOpts = true;
        else if (!endOfOpts && a.startsWith("--")) recursive ||= a === "--recursive";
        else if (!endOfOpts && a.startsWith("-") && a.length > 1) recursive ||= /[rR]/.test(a);
        else targets.push(a);
    }
    if (!recursive) return null;
    const outside = targets.filter((t) => !isUnderTemp(t, cwd));
    return outside.length ? `recursive rm outside temp dirs: ${outside.join(" ")}` : null;
}

function checkSegment(tokens, cwd, depth) {
    const t = stripPrefixes(tokens);
    if (!t.length) return null;
    const [cmd, ...args] = t;
    const base = path.basename(cmd);
    if (SHELLS.has(base)) {
        // `-c`, or combined short flags that include it (`-lc`, `-ec`)
        const idx = args.findIndex((a) => a === "-c" || (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(a) && !a.startsWith("--")));
        if (idx !== -1 && args[idx + 1] && depth < 3) return checkCommand(args[idx + 1], cwd, depth + 1);
        // `curl ... | sh` runs a script this guard cannot see
        if (idx === -1 && tokens.pipedIn) return `piping into ${base} (unanalyzable script)`;
        return null;
    }
    if (base === "gh") return checkGh(args);
    if (base === "eval" && depth < 3) return checkCommand(args.join(" "), cwd, depth + 1);
    if (base === "git") return checkGit(args, cwd);
    if (base === "wrangler") return checkWrangler(args);
    if (["npm", "pnpm", "yarn", "bun"].includes(base)) return checkRunDeploy(base, args);
    if (base === "rm") return checkRm(args, cwd);
    return null;
}

export function checkCommand(command, cwd = process.cwd(), depth = 0) {
    let dir = cwd;
    for (const seg of parseSegments(command)) {
        const s = stripPrefixes(seg);
        // Track `cd X && ...` so relative paths and git branch lookups resolve correctly.
        if ((s[0] === "cd" || s[0] === "z") && s[1] && !/[$`~]/.test(s[1])) {
            dir = path.resolve(dir, s[1]);
            continue;
        }
        const reason = checkSegment(seg, dir, depth);
        if (reason) return reason;
    }
    return null;
}

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    let payload;
    try {
        payload = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
        process.exit(0);
    }
    const command = payload?.tool_input?.command;
    if (payload?.tool_name !== "Bash" || typeof command !== "string") process.exit(0);
    const reason = checkCommand(command, payload.cwd || process.cwd());
    if (!reason) process.exit(0);
    process.stdout.write(
        JSON.stringify({
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: `Blocked by high-risk-guard: ${reason}. Do not retry or work around this. Ask the user to run it themselves with the \`!\` prefix if they want it.`,
            },
        }) + "\n"
    );
    process.exit(0);
}

// pathToFileURL + realpath: a plain `file://${argv[1]}` comparison silently
// fails (guard becomes a no-op) when the path has spaces or symlinks.
function isMainModule() {
    try {
        return import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
    } catch {
        return false;
    }
}

if (isMainModule()) main();
