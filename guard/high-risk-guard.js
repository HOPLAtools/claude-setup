#!/usr/bin/env node
// PreToolUse (Bash) guard for high-risk commands, in every permission mode,
// including bypassPermissions.
//
// Asks (Claude Code shows an approval dialog; the command runs only if the user
// approves — for actions the user may have requested):
//   - git push to main/master (explicit refspec or current branch)
//   - wrangler deploy / npm|pnpm|yarn|bun run deploy without --env dev
//     (scripts whose name ends in :dev are allowed)
//   - wrangler d1 migrations apply --remote without --env dev
//   - wrangler d1 execute --remote without --env dev, unless --command is
//     read-only (SELECT / EXPLAIN / PRAGMA without =)
//   - wrangler secret put|delete|bulk and wrangler delete without --env dev
//   - wrangler r2 object|bucket delete and wrangler d1 delete without --env dev
//   - gh pr merge, and gh api calls that merge (PUT .../pulls/N/merge,
//     POST .../merges, GraphQL merge mutations)
//   - recursive rm of a resolvable path outside temp dirs
// Denied (never runs):
//   - git push --force, --force-with-lease, -f, +refspec, --all, --mirror
//   - piping into a shell (`... | sh`, `... | bash`): the script is unanalyzable
//   - recursive rm of /, the home directory, or a target it cannot resolve
//     ($UNKNOWN, $(...), backticks). Variables assigned earlier in the same
//     command (T=/tmp/x, export S=..., T=$(mktemp -d)) are resolved.
// A heredoc body is data, except when it is fed to a shell (bash <<EOF).
// Everything else passes through untouched (exit 0, no output). Never "allow".

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
// A heredoc (`cmd <<EOF … EOF`, `<<-`, quoted delimiters) is not tokenized:
// its body is attached to the segment that declared it as `heredocs`
// ({body, terminated}). Every segment also records:
//   sep        what led to it: "start", ";", "\n", "&&", "||", "|", "&", "(", ")"
//   depth      parenthesis depth at its start (0 = top level)
//   gluedAfter it was closed by `)` immediately followed by more of the word
//   herestrings  values of `<<<` words; procSubst — it reads a `<(…)`
// `#` at the start of a word starts a comment that runs to the end of the line.
function parseSegments(cmd) {
    const segments = [];
    let tokens = [];
    let cur = "";
    let hasCur = false;
    let quote = null;
    let pipedIn = false;
    let sep = "start";
    let depth = 0;
    let pendingHeredocs = [];
    // Reads one shell word starting at j, removing quotes and backslashes as
    // bash does for a heredoc delimiter or a here-string. Returns {word, end}.
    const readWord = (j) => {
        let word = "";
        let q = null;
        for (; j < cmd.length; j++) {
            const ch = cmd[j];
            if (q) {
                if (ch === q) q = null;
                else word += ch;
            } else if (ch === "'" || ch === '"') q = ch;
            else if (ch === "\\" && j + 1 < cmd.length) word += cmd[++j];
            else if (/[\s;|&<>()]/.test(ch)) break;
            else word += ch;
        }
        return { word, end: j };
    };
    // Consumes the bodies of the pending heredocs that start at `start`;
    // returns the index of the last character consumed.
    const readHeredocBodies = (start) => {
        let pos = start;
        for (const h of pendingHeredocs) {
            const body = [];
            let terminated = false;
            while (pos < cmd.length) {
                const nl = cmd.indexOf("\n", pos);
                const line = cmd.slice(pos, nl === -1 ? cmd.length : nl);
                pos = nl === -1 ? cmd.length : nl + 1;
                if ((h.dash ? line.replace(/^\t+/, "") : line) === h.delim) {
                    terminated = true;
                    break;
                }
                body.push(line);
            }
            h.owner.heredocs = [...(h.owner.heredocs || []), { body: body.join("\n"), terminated }];
        }
        pendingHeredocs = [];
        return pos - 1;
    };
    const pushToken = () => {
        if (hasCur) tokens.push(cur);
        cur = "";
        hasCur = false;
    };
    const pushSegment = (nextSep, { nextPiped = false, glued = false } = {}) => {
        pushToken();
        if (tokens.length || tokens.heredocs || tokens.herestrings) {
            tokens.pipedIn = pipedIn;
            tokens.sep ??= sep;
            tokens.depth ??= depth;
            if (glued) tokens.gluedAfter = true;
            segments.push(tokens);
        }
        tokens = [];
        pipedIn = nextPiped;
        sep = nextSep;
    };
    for (let i = 0; i < cmd.length; i++) {
        const c = cmd[i];
        if (quote) {
            if (c === quote) quote = null;
            else if (c === "\\" && quote === '"' && i + 1 < cmd.length) cur += cmd[++i];
            else cur += c;
            continue;
        }
        if (!tokens.length && !hasCur) {
            tokens.sep ??= sep;
            tokens.depth ??= depth;
        }
        if (c === "'" || c === '"') {
            quote = c;
            hasCur = true;
        } else if (c === "\\" && i + 1 < cmd.length) {
            cur += cmd[++i];
            hasCur = true;
        } else if (c === "#" && !hasCur) {
            // comment: skip to the end of the line (the newline still separates)
            while (i + 1 < cmd.length && cmd[i + 1] !== "\n") i++;
        } else if (c === "|") {
            if (cmd[i + 1] === "|") {
                i++;
                pushSegment("||");
            } else {
                if (cmd[i + 1] === "&") i++; // |& pipes stderr too
                pushSegment("|", { nextPiped: true });
            }
        } else if (c === "<" && cmd[i + 1] === "<" && cmd[i + 2] === "<") {
            // here-string: its value is the next word
            pushToken();
            let j = i + 3;
            while (cmd[j] === " " || cmd[j] === "\t") j++;
            const { word, end } = readWord(j);
            tokens.herestrings = [...(tokens.herestrings || []), word];
            i = end - 1;
        } else if (c === "<" && cmd[i + 1] === "<") {
            // heredoc: read the delimiter; the body starts after the next newline
            pushToken();
            let j = i + 2;
            const dash = cmd[j] === "-";
            if (dash) j++;
            while (cmd[j] === " " || cmd[j] === "\t") j++;
            const { word, end } = readWord(j);
            pendingHeredocs.push({ delim: word, dash, owner: tokens });
            i = end - 1;
        } else if (c === "\n" && pendingHeredocs.length) {
            pushSegment("\n");
            i = readHeredocBodies(i + 1);
        } else if (c === "&") {
            if (cmd[i + 1] === "&") {
                i++;
                pushSegment("&&");
            } else pushSegment("&");
        } else if (c === ";" || c === "\n") {
            pushSegment(c);
        } else if (c === "(") {
            // `<(…)` / `>(…)`: process substitution feeding this segment
            if (hasCur && (cur === "<" || cur === ">")) {
                tokens.procSubst = true;
                cur = "";
                hasCur = false;
            }
            pushSegment("(");
            depth++;
        } else if (c === ")") {
            const next = cmd[i + 1];
            pushSegment(")", { glued: next !== undefined && !/[\s;&|)\n]/.test(next) });
            depth = Math.max(0, depth - 1);
        } else if (/\s/.test(c)) {
            pushToken();
        } else {
            cur += c;
            hasCur = true;
        }
    }
    pushSegment("end");
    if (pendingHeredocs.length) readHeredocBodies(cmd.length);
    return segments;
}

// Drops leading env assignments, shell keywords and wrappers (sudo, env, npx,
// command, exec, time).
function stripPrefixes(tokens) {
    let t = [...tokens];
    for (;;) {
        if (!t.length) return t;
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0])) t.shift();
        else if (["then", "do", "else", "elif", "if", "while", "until", "!", "{"].includes(t[0])) t.shift();
        else if (["sudo", "env", "command", "builtin", "exec", "time", "nohup"].includes(t[0])) t.shift();
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
        if (args[i] === "-C") {
            const target = args[++i] ?? ".";
            dir = path.isAbsolute(target) ? target : dir === null ? null : path.resolve(dir, target);
        }
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
        // after a `cd` the guard cannot resolve, the current branch is unknown
        if (dir === null) return "git push from an unknown directory";
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
    if (sub[0] === "d1" && sub[1] === "execute" && args.includes("--remote") && !isDevEnv(args)
        && !optionValues(args, "--command").every(isReadOnlySql))
        return "remote D1 execute outside dev";
    if (sub[0] === "secret" && ["put", "delete", "bulk"].includes(sub[1]) && !isDevEnv(args))
        return `wrangler secret ${sub[1]} to production`;
    if (sub[0] === "delete" && !isDevEnv(args)) return "wrangler delete outside dev";
    if (sub[0] === "r2" && ["object", "bucket"].includes(sub[1]) && sub[2] === "delete" && !isDevEnv(args))
        return `wrangler r2 ${sub[1]} delete outside dev`;
    if (sub[0] === "d1" && sub[1] === "delete" && !isDevEnv(args)) return "wrangler d1 delete outside dev";
    return null;
}

// Every value of a repeated option (`--command a --command b`); [null] when absent,
// so a missing --command (e.g. --file) never counts as read-only.
function optionValues(args, name) {
    const values = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === name) values.push(args[i + 1] ?? null);
        else if (args[i].startsWith(`${name}=`)) values.push(args[i].slice(name.length + 1));
    }
    return values.length ? values : [null];
}

// Every statement is a SELECT, EXPLAIN or a PRAGMA read (no `=`), and no
// statement-level write keyword appears anywhere. Conservative: a write
// keyword inside a string literal makes the query count as a write.
function isReadOnlySql(sql) {
    if (typeof sql !== "string" || !sql.trim()) return false;
    if (/\b(INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE|ATTACH|DETACH|VACUUM|REINDEX)\b/i.test(sql)) return false;
    const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
    return statements.every((s) => /^(SELECT|EXPLAIN)\b/i.test(s) || (/^PRAGMA\b/i.test(s) && !s.includes("=")));
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
    if (/(^|:)dev$/.test(script) || isDevEnv(args)) return null;
    return `${tool} run ${script} (production deploy)`;
}

// A path `mktemp` would create (resolves under the OS temp dir).
const MKTEMP_PATH = path.join(os.tmpdir(), "hopla-guard-mktemp");
const VAR_REF = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;

// Expands $NAME / ${NAME} from the variables assigned earlier in the same
// command (plus HOME and TMPDIR) and a leading ~. Returns null when anything
// stays unresolved ($UNKNOWN, a bare $ left by $(...), backticks).
function expandPath(p, vars) {
    let unresolved = false;
    let out = p.replace(VAR_REF, (_, braced, bare) => {
        const name = braced || bare;
        if (Object.prototype.hasOwnProperty.call(vars, name)) {
            if (vars[name] == null) unresolved = true;
            return vars[name] ?? "";
        }
        if (name === "HOME") return os.homedir();
        if (name === "TMPDIR" && process.env.TMPDIR) return process.env.TMPDIR;
        unresolved = true;
        return "";
    });
    if (unresolved || /[$`]/.test(out)) return null;
    // brace expansion ({a,b}, {1..3}) can produce paths the guard never sees
    if (/\{[^}]*(,|\.\.)[^}]*\}/.test(out)) return null;
    if (out === "~" || out.startsWith("~/")) out = os.homedir() + out.slice(1);
    else if (out.startsWith("~")) return null; // ~user
    return out;
}

function isUnderTemp(abs) {
    return TEMP_ROOTS.some((root) => abs.startsWith(root + path.sep));
}

// deny: /, the home dir, or an unresolvable target; null: all targets in temp
// dirs; ask: anything else.
function checkRm(args, cwd, vars) {
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
    const outside = [];
    for (const t of targets) {
        const expanded = expandPath(t, vars);
        if (expanded === null) return `recursive rm of an unresolvable path: ${t}`;
        // a glob deletes inside its base directory
        const glob = expanded.search(/[*?[]/);
        const slash = glob === -1 ? -1 : expanded.lastIndexOf("/", glob);
        const base = glob === -1 ? expanded : slash === -1 ? "." : slash === 0 ? "/" : expanded.slice(0, slash);
        // after a `cd` the guard cannot resolve, a relative target is unknown
        if (cwd === null && !path.isAbsolute(base)) return `recursive rm of an unresolvable path: ${t}`;
        const abs = path.resolve(cwd ?? "/", base);
        if (abs === path.parse(abs).root || abs === os.homedir()) return `recursive rm of a protected path: ${t}`;
        if (!isUnderTemp(abs)) outside.push(t);
    }
    return outside.length ? `recursive rm outside temp dirs: ${outside.join(" ")}` : null;
}

// Reasons for commands that must never run; every other reason asks.
const DENY_REASONS = /^(git push --force|git push with a \+force refspec|git push --all|git push --mirror|piping into |shell reading |recursive rm of (an unresolvable|a protected) path)/;
const decide = (reason) => (reason ? { decision: DENY_REASONS.test(reason) ? "deny" : "ask", reason } : null);
// deny beats ask beats nothing
const worst = (a, b) => (a?.decision === "deny" ? a : b?.decision === "deny" ? b : a || b);

// Programs that read a heredoc as data, never as shell commands. A heredoc fed
// to anything else (a shell, `source`, an unknown program) is checked as commands.
const DATA_CONSUMERS = new Set(["cat", "tee", "python", "python3", "node", "deno", "ruby", "perl", "php",
    "jq", "sed", "awk", "grep", "wc", "head", "tail", "sort", "uniq", "diff", "patch", "base64", "sqlite3",
    "psql", "mysql", "git", "gh", "pbcopy", "swift"]);

function checkSegment(tokens, cwd, depth, vars) {
    const t = stripPrefixes(tokens);
    if (!t.length) return null;
    const [cmd, ...args] = t;
    const base = path.basename(cmd);
    if (SHELLS.has(base) || base === "source" || base === ".") {
        if (tokens.procSubst) return decide(`shell reading a process substitution (unanalyzable script)`);
        // `-c`, or combined short flags that include it (`-lc`, `-ec`)
        const idx = args.findIndex((a) => a === "-c" || (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(a) && !a.startsWith("--")));
        const script = idx !== -1 ? args[idx + 1] : null;
        // `curl ... | sh`, `curl ... | bash -c "$(cat)"`: a script this guard cannot see
        if (tokens.pipedIn && (!script || /\$\(|`/.test(script))) return decide(`piping into ${base} (unanalyzable script)`);
        let result = null;
        for (const s of tokens.herestrings || []) result = worst(result, depth < 3 ? classifyCommand(s, cwd, depth + 1) : null);
        if (script && depth < 3) result = worst(result, classifyCommand(script, cwd, depth + 1));
        return result;
    }
    if (base === "gh") return decide(checkGh(args));
    if (base === "eval" && depth < 3) return classifyCommand(args.join(" "), cwd, depth + 1);
    if (base === "git") return decide(checkGit(args, cwd));
    if (base === "wrangler") return decide(checkWrangler(args));
    if (["npm", "pnpm", "yarn", "bun"].includes(base)) return decide(checkRunDeploy(base, args));
    if (base === "rm") return decide(checkRm(args, cwd, vars));
    return null;
}

const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s;
const NAME = /^[A-Za-z_][A-Za-z0-9_]*/;
// Commands that may (re)set a variable named in their arguments.
const SETTERS = new Set(["declare", "local", "readonly", "typeset", "read", "unset", "mapfile", "readarray", "getopts"]);

// Marks every variable this segment may set (other than a trusted plain
// assignment) as unknown, so an earlier temp value is never trusted after it.
function invalidateWrites(seg, vars) {
    const s = stripPrefixes(seg);
    const forget = (word) => {
        const m = String(word).match(NAME);
        if (m) vars[m[0]] = null;
    };
    for (const w of seg) {
        // any other assignment (`{ T=…`, `then T=…`, `T+=…`, `T=x cmd`) → unknown
        const any = w.match(/^([A-Za-z_][A-Za-z0-9_]*)\+?=/);
        if (any) vars[any[1]] = null;
    }
    if (SETTERS.has(s[0])) s.slice(1).filter((w) => !w.startsWith("-")).forEach(forget);
    if ((s[0] === "for" || s[0] === "select") && s[1]) forget(s[1]);
    if (s[0] === "printf") {
        const v = s.indexOf("-v");
        if (v !== -1 && s[v + 1]) forget(s[v + 1]);
    }
}

// Does any segment run a file as a script (`bash run.sh`, `source x`, `./run.sh`)?
// Then a heredoc that wrote that file may hold commands: scan every heredoc.
function runsScriptFile(segments) {
    return segments.some((seg) => {
        const [cmd, ...args] = stripPrefixes(seg);
        if (!cmd) return false;
        const base = path.basename(cmd);
        if (SHELLS.has(base) || base === "source" || base === ".") {
            return !args.some((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a)) && args.some((a) => !a.startsWith("-"));
        }
        return cmd.includes("/");
    });
}

function classifyCommand(command, cwd, depth) {
    let dir = cwd;
    let vars = {};
    let substFor = null; // NAME whose value is the $(...) that follows
    let worstResult = null;
    const segments = parseSegments(command);
    const scanAllHeredocs = runsScriptFile(segments);
    for (const seg of segments) {
        if (substFor) {
            // exactly NAME=$(mktemp ...) → a temp path; any other $(...) → unknown
            const name = substFor;
            substFor = null;
            if (seg.sep === "(" && stripPrefixes(seg)[0] === "mktemp" && !seg.gluedAfter) {
                vars[name] = MKTEMP_PATH;
                continue;
            }
            vars[name] = null;
        }
        // a heredoc body runs as commands unless a data program reads it whole
        const owner = path.basename(stripPrefixes(seg)[0] || "");
        for (const h of seg.heredocs || []) {
            if (h.terminated && DATA_CONSUMERS.has(owner) && !scanAllHeredocs) continue;
            worstResult = worst(worstResult, depth < 3 ? classifyCommand(h.body, dir, depth + 1) : null);
        }
        // `NAME=value` / `export NAME=value` on their own: remember them only at
        // top level and unconditionally (start, `;` or newline); otherwise unknown
        const words = seg[0] === "export" ? seg.slice(1) : seg;
        if (words.length && words.every((w) => ASSIGNMENT.test(w))) {
            const trusted = seg.depth === 0 && ["start", ";", "\n"].includes(seg.sep) && !seg.pipedIn;
            for (const w of words) {
                const [, name, value] = w.match(ASSIGNMENT);
                if (!trusted) vars[name] = null;
                else if (value === "$") substFor = name;
                else vars[name] = expandPath(value, vars);
            }
            continue;
        }
        invalidateWrites(seg, vars);
        const s = stripPrefixes(seg);
        // `eval …` / `source x` / `. x` can set any variable or change directory
        if (["eval", "source", "."].includes(path.basename(s[0] || ""))) {
            // every variable (HOME included) becomes unknown from here on
            const unknown = { value: null, writable: true, enumerable: true, configurable: true };
            vars = new Proxy({}, { get: () => null, has: () => true, getOwnPropertyDescriptor: () => unknown, set: () => true });
            dir = null;
        }
        // Track `cd X && ...` so relative paths and git branch lookups resolve
        // correctly; a `cd` the guard cannot resolve makes the directory unknown.
        if (s[0] === "cd" || s[0] === "z" || s[0] === "pushd") {
            const target = s.slice(1).find((a) => !a.startsWith("-"));
            const expanded = target === undefined ? os.homedir() : target === "-" ? null : expandPath(target, vars);
            dir = expanded === null ? null : path.isAbsolute(expanded) ? expanded : dir === null ? null : path.resolve(dir, expanded);
            continue;
        }
        worstResult = worst(worstResult, checkSegment(seg, dir, depth, vars));
        if (worstResult?.decision === "deny") return worstResult;
    }
    return worstResult;
}

// { decision: "ask" | "deny", reason } for a high-risk command, else null.
export function classify(command, cwd = process.cwd()) {
    return classifyCommand(command, cwd, 0);
}

// The reason when the guard would ask or deny, else null.
export function checkCommand(command, cwd = process.cwd()) {
    return classify(command, cwd)?.reason ?? null;
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
    const result = classify(command, payload.cwd || process.cwd());
    if (!result) process.exit(0);
    const permissionDecisionReason = result.decision === "deny"
        ? `Blocked by high-risk-guard: ${result.reason}. Do not retry or work around this. Ask the user to run it themselves with the \`!\` prefix if they want it.`
        : `high-risk-guard: ${result.reason}. Approve only if you asked for it.`;
    process.stdout.write(
        JSON.stringify({
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: result.decision,
                permissionDecisionReason,
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
