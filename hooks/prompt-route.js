#!/usr/bin/env node
// UserPromptSubmit hook: scan the user's prompt for skill keywords and inject
// a short routing hint. Keeps skill suggestions visible mid-session even after
// compaction or long conversations where the initial skill list gets buried.

const SKILL_TRIGGERS = [
    {
        skill: "git",
        patterns: [
            /\bcommit\b/i,
            /save (my |the )?changes/i,
            /\bcreate (a )?pr\b/i,
            /pull request/i,
            /\bpush\b/i,
            /merge request/i,
        ],
    },
    {
        skill: "worktree",
        patterns: [
            /\bworktree\b/i,
            /isolated branch/i,
            /parallel (feature|development)/i,
        ],
    },
    {
        skill: "prime",
        patterns: [
            /\borient(\b| yourself)/i,
            /catch me up/i,
            /get context/i,
            /load project/i,
            /what is this project/i,
        ],
    },
    {
        skill: "brainstorm",
        patterns: [
            /\bbrainstorm\b/i,
            /explore (options|approaches)/i,
            /how should we/i,
            /trade[- ]offs?/i,
        ],
    },
    {
        skill: "debug",
        patterns: [
            /\bbug\b/i,
            /\berror\b/i,
            /\bdebug\b/i,
            /not working/i,
            /\bfailing\b/i,
            /\bbroken\b/i,
            /\bno funciona\b/i,
        ],
    },
    {
        skill: "verify",
        patterns: [
            /\bverify\b/i,
            /all tests? pass/i,
            /\blisto\b/i,
            /\bterminé\b/i,
            /\bya está\b/i,
        ],
    },
    {
        skill: "code-review",
        patterns: [
            /review (the |my )?code/i,
            /code review/i,
            /audit (the |my )?code/i,
        ],
    },
    {
        skill: "execution-report",
        patterns: [
            /generate (the |a )?report/i,
            /document what was done/i,
            /execution report/i,
        ],
    },
    {
        skill: "tdd",
        patterns: [
            /\btdd\b/i,
            /test[- ]first/i,
            /red[- ]green[- ]refactor/i,
        ],
    },
];

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);

    let input;
    try {
        input = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
        // Malformed payload — skip silently so we never block legitimate prompts
        process.exit(0);
    }

    // Cap prompt length so regex matching stays cheap on large paste-ins
    const prompt = (input.prompt || "").slice(0, 4000);
    if (!prompt) process.exit(0);

    const matched = [];
    for (const { skill, patterns } of SKILL_TRIGGERS) {
        if (patterns.some((p) => p.test(prompt))) matched.push(skill);
    }

    if (matched.length === 0) process.exit(0);

    const list = matched.map((s) => `\`${s}\``).join(", ");
    const plural = matched.length > 1;
    process.stdout.write(
        `📦 HOPLA routing hint: this prompt matches skill${plural ? "s" : ""} ${list}. ` +
        `Use ${plural ? "them" : "it"} if applicable to the current task.`
    );
    process.exit(0);
}

main();
