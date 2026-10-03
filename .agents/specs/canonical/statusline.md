# Statusline

> Current behavior of the system. From `hopla-3-4-0` (archived 2026-10-03).

## Requirements

### REQ-STATUSLINE-001: The statusline shows model, effort, ultracode setting and cache state
- Scenario: Fable session — Given a payload with `model.display_name` "Fable" and `effort.level` "high", When the statusline renders, Then it shows the model highlighted in red and `high`.
- Scenario: cache — Given `prompt_cache.warm` true, `ttl` "1h" and an `expires_at`, When it renders, Then it shows a warm 1h cache with its expiry time; Given `warm` false and `caching_observed` true, Then it shows the cache as cold.
- Scenario: ultracode setting — Given `"ultracode": true` in `~/.claude/settings.json`, When it renders, Then it shows `⚡ultracode`.
