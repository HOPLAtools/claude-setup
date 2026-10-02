#!/usr/bin/env node
// PreToolUse hook: blocks tool calls that would expose the CONTENTS of dotenv
// files (.env, .env.local, .env.production.local, ...). Template files
// (.env.example, .env.sample, ...) are allowed with every tool. Bash commands
// are tokenized and blocked only when a command READS a dotenv file; commands
// that merely MENTION the name (echo, git add, grep patterns, comments,
// commit messages, heredoc prose) pass. Bash writes are not blocked.
// `.dev.vars` (Cloudflare) is blocked for Read, Grep and Edit/MultiEdit only.
//
// Accident prevention, not a sandbox: see SECURITY.md "Known limits".
// Fails open on malformed input or parser errors. hooks.json matcher must
// include Bash so Bash calls reach this script.

// --- path predicates -------------------------------------------------------

const TEMPLATE_SUFFIXES = new Set(["example", "sample", "template", "dist", "defaults", "tpl", "tmpl"]);
// .env or .env.<suffix>[.<suffix>...]; case-insensitive because macOS filesystems are.
const DOTENV_NAME = /^\.env(\.[\w-]+)*$/i;

function baseName(p) {
    return p.split(/[\\/]/).pop();
}

// Templates document variable names and hold no secrets: allowed when the LAST suffix is a template word.
function isDotenvName(name) {
    if (!DOTENV_NAME.test(name)) return false;
    const parts = name.toLowerCase().split("."); // ".env.local" -> ["", "env", "local"]
    return !(parts.length > 2 && TEMPLATE_SUFFIXES.has(parts[parts.length - 1]));
}

function isEnvPath(p) {
    return typeof p === "string" && p !== "" && isDotenvName(baseName(p));
}

function isDevVarsPath(p) {
    return typeof p === "string" && p !== "" && baseName(p).toLowerCase() === ".dev.vars";
}

function globToRegExp(g) {
    let re = "";
    for (const ch of g) re += ch === "*" ? "[^/]*" : ch === "?" ? "[^/]" : /[.+^${}()|\\]/.test(ch) ? "\\" + ch : ch;
    return new RegExp("^" + re + "$", "i");
}

// base = basename of a shell operand. Shells never expand * onto dotfiles, so a glob must start with "." (shellDotRule).
function isDotenvToken(base, shellDotRule = true) {
    if (isDotenvName(base)) return true;
    if (!/[*?[{]/.test(base)) return false;
    if (/^\.env[^/]*[*?[{]/i.test(base)) return true; // .env*  .env.*  .env{,.bak}
    if (/^\*+$/.test(base)) return false;
    if (shellDotRule && !base.startsWith(".")) return false;
    try {
        return globToRegExp(base).test(".env"); // .e*  .??v  .*
    } catch {
        return false;
    }
}

// Operand may be "path", "rev:path" (git), "--opt=path", "if=path" (dd), "@path" (curl) or "host:path" (scp).
function isEnvOperand(tok) {
    if (typeof tok !== "string" || !tok) return false;
    return tok.split(/[:=@]/).some((piece) => isDotenvToken(baseName(piece)));
}

const globPieces = (glob) => (typeof glob === "string" ? glob.split(/[,\s{}]+/).filter((p) => p && !p.startsWith("!")) : []);

// Grep tool "glob" such as ".env*", "**/.env", "{.env,.env.local}". Negations ("!.env") are ignored.
function grepGlobTargetsDotenv(glob) {
    return globPieces(glob).some((p) => isDotenvToken(baseName(p), false));
}

function grepGlobTargetsDevVars(glob) {
    return globPieces(glob).some((p) => {
        const base = baseName(p);
        if (base.toLowerCase() === ".dev.vars") return true;
        if (!/[*?[{]/.test(base) || /^\*+$/.test(base)) return false;
        try {
            return globToRegExp(base).test(".dev.vars");
        } catch {
            return false;
        }
    });
}

function deny(message) {
    process.stderr.write(message + "\n");
    process.exit(2);
}

// --- shell tokenizer -------------------------------------------------------
// parseInto pushes every simple command at any nesting level ($(...), backticks,
// (...), <(...), substitutions inside UNQUOTED heredoc bodies) into `out` as
// {words, inputs, outputs, heredocs}. Heredoc bodies are consumed at the next
// newline of the same nesting level and never tokenized as commands.

function newSeg() {
    return { words: [], inputs: [], outputs: [], heredocs: [] };
}

function scanExpansions(text, out) {
    for (let k = 0; k < text.length; k++) {
        if (text[k] === "\\") { k++; continue; }
        if (text[k] === "$" && text[k + 1] === "(") k = parseInto(text, k + 2, ")", out) - 1;
        else if (text[k] === "`") k = parseInto(text, k + 1, "`", out) - 1;
    }
}

function readHeredocBodies(src, i, pending, out) {
    for (const hd of pending) {
        const lines = [];
        while (i < src.length) {
            let nl = src.indexOf("\n", i);
            if (nl === -1) nl = src.length;
            const line = src.slice(i, nl);
            i = Math.min(nl + 1, src.length);
            if ((hd.strip ? line.replace(/^\t+/, "") : line) === hd.delim) break;
            lines.push(line);
        }
        hd.body = lines.join("\n");
        if (!hd.literal) scanExpansions(hd.body, out);
    }
    pending.length = 0;
    return i;
}

function parseInto(src, start, stop, out) {
    let i = start;
    let seg = newSeg();
    let word = null;
    let redir = null;
    let depth = 0;
    let quote = null;
    const pending = [];
    const w = () => (word ||= { t: "", q: false });
    const flush = () => {
        if (!word) return;
        const cur = word;
        word = null;
        if (redir) {
            const kind = redir;
            redir = null;
            if (kind === "in") seg.inputs.push(cur.t);
            else if (kind === "out") seg.outputs.push(cur.t);
            else if (kind === "heredoc" || kind === "heredoc-strip") {
                const hd = { delim: cur.t, literal: cur.q, strip: kind === "heredoc-strip", body: "" };
                seg.heredocs.push(hd);
                pending.push(hd);
            }
            return;
        }
        seg.words.push(cur.t);
    };
    const end = () => {
        flush();
        redir = null;
        if (seg.words.length || seg.inputs.length || seg.outputs.length || seg.heredocs.length) out.push(seg);
        seg = newSeg();
    };
    const sub = (close, skip) => {
        w();
        i = parseInto(src, i + skip, close, out);
        w().t += "$";
    };
    while (i < src.length) {
        const c = src[i];
        if (quote === "'") { if (c === "'") quote = null; else w().t += c; i++; continue; }
        if (quote === '"') {
            if (c === '"') { quote = null; i++; continue; }
            if (c === "\\") {
                const n = src[i + 1];
                if (n !== undefined && '$`"\\\n'.includes(n)) { if (n !== "\n") w().t += n; i += 2; } else { w().t += c; i++; }
                continue;
            }
            if (c === "$" && src[i + 1] === "(") { sub(")", 2); continue; }
            if (c === "`") { sub("`", 1); continue; }
            w().t += c; i++; continue;
        }
        if (c === "'") { quote = "'"; w().q = true; i++; continue; }
        if (c === '"') { quote = '"'; w().q = true; i++; continue; }
        if (c === "$" && (src[i + 1] === "'" || src[i + 1] === '"')) { i++; continue; }
        if (c === "$" && src[i + 1] === "(") { sub(")", 2); continue; }
        if (c === "`") { if (stop === "`") { end(); return i + 1; } sub("`", 1); continue; }
        if (c === "\\") {
            const n = src[i + 1];
            if (n === "\n") { i += 2; continue; }
            if (n !== undefined) { w().t += n; word.q = true; i += 2; continue; }
            i++; continue;
        }
        if (c === "#" && !word) { while (i < src.length && src[i] !== "\n") i++; continue; }
        if (c === "\n") { end(); i++; if (pending.length) i = readHeredocBodies(src, i, pending, out); continue; }
        if (c === ")") {
            if (depth > 0) { depth--; end(); i++; continue; }
            if (stop === ")") { end(); return i + 1; }
            end(); i++; continue;
        }
        if (c === "(") { depth++; end(); i++; continue; }
        if (c === "&" && src[i + 1] === ">") { flush(); i++; continue; }
        if (c === ";" || c === "|" || c === "&") { end(); i++; continue; }
        if (c === "<" || c === ">") {
            if (src[i + 1] === "(") { end(); depth++; i += 2; continue; }
            if (word && !word.q && /^\d+$/.test(word.t)) word = null; else flush();
            const r3 = src.slice(i, i + 3);
            const op = r3 === "<<<" ? "<<<" : r3 === "<<-" ? "<<-" : /^(<<|<&|>&|<>|>>|>\|)/.test(r3) ? r3.slice(0, 2) : c;
            i += op.length;
            redir = op === "<" || op === "<>" ? "in" : op === "<<" ? "heredoc" : op === "<<-" ? "heredoc-strip"
                : op === "<<<" || op === "<&" || op === ">&" ? "ignore" : "out";
            continue;
        }
        if (/\s/.test(c)) { flush(); i++; continue; }
        w().t += c; i++;
    }
    end();
    return i;
}

// --- rule engine -----------------------------------------------------------

const RESERVED = new Set(["if", "then", "else", "elif", "do", "while", "until", "!", "{", "}", "time"]);
const WRAPPERS = new Map([
    ["sudo", new Set(["-u", "-g", "-h", "-p", "-C", "-D", "-R", "-T", "-U"])], ["doas", new Set(["-u", "-C"])],
    ["env", new Set(["-u", "-C", "-S"])], ["command", new Set()], ["builtin", new Set()], ["exec", new Set(["-a"])],
    ["nohup", new Set()], ["nice", new Set(["-n"])], ["ionice", new Set(["-c", "-n", "-p"])],
    ["timeout", new Set(["-k", "-s"])], ["stdbuf", new Set(["-i", "-o", "-e"])],
    ["xargs", new Set(["-a", "-I", "-n", "-P", "-s", "-d", "-E", "-L"])],
]);
const READERS = new Set(("cat tac rev less more most head tail bat batcat nl strings xxd hexdump od base64 base32 cut sort uniq " +
    "paste column fold fmt pr expand unexpand diff cmp comm sdiff colordiff vi vim nvim view nano emacs code subl").split(" "));
const COPIERS = new Set(["cp", "mv", "scp", "rsync", "install", "dd"]);
const PATTERN_FIRST = new Map([
    ["grep", "efmABCdD"], ["egrep", "efmABCdD"], ["fgrep", "efmABCdD"], ["zgrep", "efmABCdD"],
    ["rg", "efgtTmABCjMrEd"], ["ag", "ABCGgm"], ["ack", "ABC"],
    ["awk", "fFv"], ["gawk", "fFv"], ["mawk", "fFv"], ["sed", "efl"], ["gsed", "efl"],
]);
// File filters whose value selects which files are searched (grep --include, rg -g/--glob).
const FILTER_LONG_OPTS = new Set(["--include", "--glob", "--iglob"]);
const filterTargetsDotenv = (v) => typeof v === "string" && grepGlobTargetsDotenv(v);
const LONG_VALUE_OPTS = new Set(["--iglob", "--include", "--exclude", "--exclude-dir", "--include-dir", "--max-count", "--glob", "--type",
    "--type-not", "--context", "--after-context", "--before-context", "--regexp", "--expression", "--file"]);
const SHELLS = new Set(["bash", "sh", "zsh", "dash", "ksh", "fish"]);
const INTERPRETERS = new Set(["python", "python2", "python3", "node", "nodejs", "deno", "bun", "ruby", "perl", "php", "tsx", "ts-node", "lua", "Rscript"]);
const GIT_READ = new Set(["show", "diff", "log", "blame", "annotate", "cat-file", "grep", "difftool", "format-patch", "archive"]);
const EXEC_FLAGS = new Set(["-exec", "-execdir", "-ok", "-okdir"]);
// dotenv path as a string literal inside a call: open('.env'), Path(".env").read_text(), readFileSync(path.join(d, '.env'))
const CODE_LITERAL = /[\w.]\([^()\n]{0,120}?["'`]((?:[^"'`\s]*\/)?\.env(?:\.[\w-]+)*)["'`]/gi;

function stripPrefix(words) {
    const rest = words.slice();
    const dropped = [];
    while (rest.length) {
        const head = rest[0];
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(head) || RESERVED.has(head)) { rest.shift(); continue; }
        const name = baseName(head);
        const valueOpts = WRAPPERS.get(name);
        if (!valueOpts) break;
        rest.shift();
        while (rest.length && rest[0].startsWith("-") && rest[0] !== "-") {
            const opt = rest.shift();
            if (valueOpts.has(opt) && rest.length) dropped.push(rest.shift());
        }
        if (name === "timeout" && rest.length) rest.shift();
    }
    return { words: rest, dropped };
}

function copyReadsEnv(cmd, args) {
    if (cmd === "dd") return args.some((a) => a.startsWith("if=") && isEnvOperand(a));
    const sources = [];
    let dest = null;
    for (let k = 0; k < args.length; k++) {
        const a = args[k];
        if (a === "-t" || a === "--target-directory") dest = args[++k] ?? "";
        else if (a.startsWith("--target-directory=")) dest = a.slice(19);
        else if (a.startsWith("-") && a !== "-") continue;
        else sources.push(a);
    }
    if (dest === null) dest = sources.pop() ?? "";
    // Copying a dotenv file onto another dotenv path stays protected; anywhere else it escapes this hook.
    return sources.some(isEnvOperand) && !isEnvOperand(dest);
}

function patternFirstReadsEnv(cmd, args) {
    const valueLetters = PATTERN_FIRST.get(cmd);
    let explicit = false;
    let endOpts = false;
    let patternSeen = false;
    for (let k = 0; k < args.length; k++) {
        const a = args[k];
        if (!endOpts && a === "--") { endOpts = true; continue; }
        if (!endOpts && a.startsWith("-") && a !== "-") {
            if (a.startsWith("--")) {
                const eq = a.indexOf("=");
                const name = eq === -1 ? a : a.slice(0, eq);
                if (name === "--regexp" || name === "--expression" || name === "--file") explicit = true;
                if (name === "--file") { if (isEnvOperand(eq === -1 ? args[++k] : a.slice(eq + 1))) return true; continue; }
                if (FILTER_LONG_OPTS.has(name) && filterTargetsDotenv(eq === -1 ? args[k + 1] : a.slice(eq + 1))) return true;
                if (LONG_VALUE_OPTS.has(name) && eq === -1) k++;
                continue;
            }
            const letters = a.slice(1);
            if (/^[A-Za-z]+$/.test(letters)) {
                if (/[ef]/.test(letters)) explicit = true;
                const last = letters[letters.length - 1];
                if (valueLetters.includes(last)) {
                    const v = args[++k];
                    if (last === "f" && isEnvOperand(v)) return true;
                    if (last === "g" && cmd === "rg" && filterTargetsDotenv(v)) return true;
                }
            }
            continue;
        }
        if (!explicit && !patternSeen) { patternSeen = true; continue; } // first operand is the pattern/program, not a file
        if (isEnvOperand(a)) return true;
    }
    return false;
}

function codeReadsDotenv(code) {
    for (const m of code.matchAll(CODE_LITERAL)) if (isEnvOperand(m[1])) return true;
    return false;
}

function interpreterReadsEnv(isShell, args, seg, depth) {
    for (let k = 0; k < args.length - 1; k++) {
        const flag = args[k];
        const inline = isShell ? /^-[A-Za-z]*c$/.test(flag) : /^(--eval|--print|-[A-Za-z]*[ecpr])$/.test(flag);
        if (inline && (isShell ? commandReadsEnv(args[k + 1], depth + 1) : codeReadsDotenv(args[k + 1]))) return true;
    }
    for (const hd of seg.heredocs) {
        if (isShell ? commandReadsEnv(hd.body, depth + 1) : codeReadsDotenv(hd.body)) return true; // stdin script
    }
    return args.some((a, k) => !/^--env-file(-if-exists)?(=|$)/.test(a) &&
        !/^--env-file(-if-exists)?$/.test(args[k - 1] ?? "") && isEnvOperand(a));
}

function segmentReadsEnv(seg, depth) {
    if (seg.inputs.some(isEnvOperand)) return true; // cmd < .env, any command
    const { words, dropped } = stripPrefix(seg.words);
    if (dropped.some(isEnvOperand)) return true; // xargs -a .env
    if (!words.length) return false;
    const cmd = baseName(words[0]);
    const args = words.slice(1);
    if (cmd === "source" || cmd === ".") return args.some(isEnvOperand);
    if (READERS.has(cmd)) return args.some(isEnvOperand);
    if (PATTERN_FIRST.has(cmd)) return patternFirstReadsEnv(cmd, args);
    if (COPIERS.has(cmd)) return copyReadsEnv(cmd, args);
    if (cmd === "git") return args.some((a) => GIT_READ.has(a)) && args.some(isEnvOperand);
    if (cmd === "find") return args.some((a) => EXEC_FLAGS.has(a)) && args.some(isEnvOperand);
    if (cmd === "eval") return commandReadsEnv(args.join(" "), depth + 1);
    const isShell = SHELLS.has(cmd);
    if (isShell || INTERPRETERS.has(cmd)) return interpreterReadsEnv(isShell, args, seg, depth);
    return false;
}

function commandReadsEnv(command, depth = 0) {
    if (typeof command !== "string" || !command || depth > 4) return false;
    const segments = [];
    parseInto(command, 0, null, segments);
    return segments.some((s) => segmentReadsEnv(s, depth));
}

// --- entry point -----------------------------------------------------------

const FILE_DENY = "Access denied: reading or editing dotenv files (.env, .env.local, ...) is blocked to prevent accidental secret exposure. " +
    "Template files such as .env.example are allowed. If you need variable names, read .env.example or ask the user.";
const DEV_VARS_DENY = "Access denied: reading or editing .dev.vars (local Cloudflare secrets, a dotenv-style file) is blocked to prevent accidental secret exposure. " +
    "If you need variable names, check wrangler config or ask the user.";
const BASH_DENY = "Access denied: this Bash command reads the contents of a dotenv file, which is blocked to prevent secret exposure. " +
    "Commands that only mention the name (echo, git add, grep patterns, .env.example) are allowed. " +
    "If you need variable names, read .env.example or ask the user.";

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);

    let toolCall;
    try {
        toolCall = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
        // Malformed input — fail open so we never block legitimate tool use
        process.exit(0);
    }

    const name = toolCall?.tool_name || "";
    const input = toolCall?.tool_input || {};

    // Read / Grep / Glob / Edit / Write — check file_path, path and the Grep glob
    const filePath = input.file_path || input.path || "";
    if (isEnvPath(filePath) || (name === "Grep" && grepGlobTargetsDotenv(input.glob))) deny(FILE_DENY);
    if ((name === "Read" || name === "Edit" || name === "MultiEdit" || name === "Grep") &&
        (isDevVarsPath(filePath) || (name === "Grep" && grepGlobTargetsDevVars(input.glob)))) deny(DEV_VARS_DENY);

    // Bash — block only commands that read a dotenv file
    if (name === "Bash") {
        let reads = false;
        try {
            reads = commandReadsEnv(input.command);
        } catch {
            // parser bug: fail open
        }
        if (reads) deny(BASH_DENY);
    }

    process.exit(0);
}

main();
