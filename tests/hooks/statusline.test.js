// Tests for hooks/statusline.js (3.4): model (Fable highlighted), effort,
// the persistent `ultracode` setting, fast mode and the prompt-cache state,
// before the existing git and plan segments. Every payload field is optional;
// malformed input renders nothing. Each test runs with its own HOME (never the
// real ~/.claude/) and TZ=UTC so the cache expiry time is stable.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTempDir, rmDir, writeJson, writeText } from "../helpers/fixtures.js";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "statusline.js");
const RED = "\x1b[31m";

function render(payload, { home, project } = {}) {
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    const res = spawnSync("node", [HOOK], {
        input: raw,
        encoding: "utf8",
        cwd: project,
        env: { ...process.env, HOME: home, TZ: "UTC" },
    });
    assert.equal(res.status, 0, res.stderr);
    return res.stdout;
}

// A temp HOME and a non-git project dir; `fn` gets both.
function withDirs(fn) {
    const home = makeTempDir("hopla-statusline-home-");
    const project = makeTempDir("hopla-statusline-proj-");
    try {
        return fn({ home, project });
    } finally {
        rmDir(home);
        rmDir(project);
    }
}

const payload = (project, extra = {}) => ({
    cwd: project,
    workspace: { current_dir: project, project_dir: project },
    model: { id: "claude-opus-5-5", display_name: "Opus" },
    ...extra,
});

test("statusline: renders the model even outside a git repo", () => withDirs((d) => {
    const out = render(payload(d.project), d);
    assert.match(out, /Opus/);
}));

test("statusline: a Fable model is highlighted in red", () => withDirs((d) => {
    const out = render(payload(d.project, { model: { id: "claude-fable-5-1", display_name: "Fable" } }), d);
    assert.match(out, /Fable/);
    assert.ok(out.slice(0, out.indexOf("Fable")).includes(RED), "Fable must be wrapped in the red code");
    const opus = render(payload(d.project), d);
    assert.ok(!opus.slice(0, opus.indexOf("Opus")).includes(RED), "other models are not red");
}));

test("statusline: shows effort.level and nothing when it is absent", () => withDirs((d) => {
    assert.match(render(payload(d.project, { effort: { level: "high" } }), d), /effort:high/);
    assert.doesNotMatch(render(payload(d.project), d), /effort/);
}));

test("statusline: a warm cache shows its TTL and expiry time", () => withDirs((d) => {
    // 1738429200 = 2025-02-01T17:00:00Z
    const out = render(payload(d.project, {
        prompt_cache: { warm: true, caching_observed: true, ttl: "1h", expires_at: 1738429200 },
    }), d);
    assert.match(out, /cache 1h/);
    assert.match(out, /17:00/);
}));

test("statusline: a cold cache says cold; no caching or no prompt_cache shows nothing", () => withDirs((d) => {
    const cold = render(payload(d.project, {
        prompt_cache: { warm: false, caching_observed: true, ttl: "1h", expires_at: null },
    }), d);
    assert.match(cold, /cache cold/);
    const off = render(payload(d.project, { prompt_cache: { warm: false, caching_observed: false } }), d);
    assert.doesNotMatch(off, /cache/);
    assert.doesNotMatch(render(payload(d.project), d), /cache/);
}));

test("statusline: fast mode shows `fast`", () => withDirs((d) => {
    assert.match(render(payload(d.project, { fast_mode: true }), d), /fast/);
    assert.doesNotMatch(render(payload(d.project, { fast_mode: false }), d), /fast/);
}));

test("statusline: `ultracode: true` in the user settings shows ultracode", () => withDirs((d) => {
    writeJson(path.join(d.home, ".claude", "settings.json"), { ultracode: true });
    assert.match(render(payload(d.project), d), /ultracode/);
}));

test("statusline: the project's local settings override the user's ultracode", () => withDirs((d) => {
    writeJson(path.join(d.home, ".claude", "settings.json"), { ultracode: true });
    writeJson(path.join(d.project, ".claude", "settings.local.json"), { ultracode: false });
    assert.doesNotMatch(render(payload(d.project), d), /ultracode/);
}));

test("statusline: an invalid settings file is ignored", () => withDirs((d) => {
    writeText(path.join(d.home, ".claude", "settings.json"), "{ not json");
    const out = render(payload(d.project), d);
    assert.match(out, /Opus/);
    assert.doesNotMatch(out, /ultracode/);
}));

test("statusline: malformed stdin renders nothing and exits 0", () => withDirs((d) => {
    assert.equal(render("not json", d), "");
}));

test("statusline: no hook output reaches a real home (HOME is honored)", () => withDirs((d) => {
    render(payload(d.project), d);
    assert.ok(!fs.existsSync(path.join(d.home, ".claude", "settings.json")), "the statusline never writes settings");
}));
