#!/usr/bin/env node
// PreToolUse hook: blocks reads/greps/Bash commands that expose .env secrets.
// Hooks.json matcher must include Bash so Bash calls reach this script.

function isEnvPath(p) {
    if (typeof p !== "string" || !p) return false;
    // Matches: .env, ./.env, path/.env, .env.local, .env.production, path/.env.X
    return /(^|\/)\.env(\.\w+)?$/.test(p);
}

function commandReadsEnv(cmd) {
    if (typeof cmd !== "string" || !cmd) return false;
    // Split on shell word separators so we inspect each argument/path token
    const tokens = cmd.split(/[\s<>|&;"'`()]+/);
    return tokens.some(isEnvPath);
}

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

    const name = toolCall.tool_name || "";
    const input = toolCall.tool_input || {};

    // Read / Grep / Glob / Edit / Write — check file_path or path
    const filePath = input.file_path || input.path || "";
    if (isEnvPath(filePath)) {
        process.stderr.write(
            `Access denied: reading or editing .env files is blocked to prevent accidental secret exposure. ` +
            `If you need env var names, check the README or ask the user.\n`
        );
        process.exit(2);
    }

    // Bash — inspect the command string for tokens that read an .env file
    if (name === "Bash" && commandReadsEnv(input.command)) {
        process.stderr.write(
            `Access denied: this Bash command reads a .env file, which is blocked to prevent secret exposure. ` +
            `If you need env var names, ask the user.\n`
        );
        process.exit(2);
    }

    process.exit(0);
}

main();
