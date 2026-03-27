#!/usr/bin/env node
// PreToolUse hook: blocks reads/greps targeting .env files

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }

    const toolCall = JSON.parse(Buffer.concat(chunks).toString());
    const filePath = toolCall.tool_input?.file_path || toolCall.tool_input?.path || "";

    if (filePath.includes(".env")) {
        process.stderr.write(
            `Access denied: Reading .env files is blocked to prevent accidental secret exposure. ` +
            `If you need environment variable names, check the README or ask the user.\n`
        );
        process.exit(2);
    }

    process.exit(0);
}

main();
