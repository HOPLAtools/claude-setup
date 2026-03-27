# MCP Integration Guide

## When to Use This Guide
Reference this guide when planning features that involve external tools or services available via MCP.

## MCP in the PIV Loop

### During Planning (`/hopla-plan-feature`)
- Check what MCP servers are configured (listed in CLAUDE.md under "MCP Servers")
- For each external integration point, specify which MCP tool to use
- Example: "Step 3: Use Playwright MCP to verify the component renders correctly"

### During Execution (`/hopla-execute`)
- Before starting, verify MCP servers are available and responsive
- When a task involves an MCP tool, use it explicitly (don't fall back to manual alternatives)
- If an MCP server is unavailable, document it and skip that validation step

### During Validation (`/hopla-validate`)
- Use Playwright MCP for E2E browser validation if configured
- Use database MCPs to verify data state after migrations
- Document which validations were done via MCP vs. manual

## Common MCP Patterns
- **Playwright**: Browser automation for E2E testing and visual verification
- **Database (Supabase, D1, etc.)**: Schema management, data verification
- **API testing**: Endpoint verification, response validation
- **File systems**: Cross-system file operations

## Adding MCP to Your Project
1. Configure MCP servers in `.claude/settings.json` or `.claude/settings.local.json`
2. List them in your project's CLAUDE.md under the "MCP Servers" section
3. Pre-approve permissions in settings to avoid repeated prompts
