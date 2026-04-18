---
description: 4D Framework guide for non-technical users working with AI coding assistants
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

# HOPLA Guide for Non-Technical Users

> A guided framework for working effectively with your AI coding assistant.

## The 4D Framework

### 📝 Description — Communicate Clearly
Tell the AI what you need with rich context:
- What problem are you solving?
- Who is the user/audience?
- What does success look like?
- What constraints exist (budget, timeline, tech)?

**Tip**: The more specific you are, the better the output. "Add a login page" → "Add a login page with email/password, Google OAuth, and a forgot password flow that matches our brand colors."

### 🔍 Discernment — Evaluate Critically
Don't accept AI output at face value:
- Does this match what you asked for?
- Does it make sense for your users?
- Is the quality acceptable?
- Would you be comfortable showing this to stakeholders?

**Tip**: Ask the AI to explain its reasoning. If you don't understand the explanation, ask for a simpler one.

### 🤝 Delegation — Choose What AI Does vs. You
Three categories for every task:

| Category | Examples |
|----------|---------|
| **AI handles** | Writing boilerplate, research, first drafts, data analysis |
| **AI assists, you review** | Feature plans, PRDs, code reviews, documentation |
| **You handle** | Final decisions, stakeholder communication, business strategy |

### ✅ Diligence — Take Responsibility
- **Creation diligence**: Verify outputs before sharing
- **Deployment diligence**: Test before using in production
- **Transparency diligence**: Document when AI was used

## Your Available Commands

### For Planning & Product
- `/hopla:create-prd` — Create a Product Requirements Document through guided conversation
- `/hopla:plan-feature` — Create an implementation plan (AI researches, you approve)
- `/hopla:review-plan` — Review a plan before execution

### For Oversight
- `/hopla:system-review` — Analyze how well the AI followed the plan
- `/hopla:guide` — Show this guide again

## Getting Started

1. Start with `/hopla:create-prd` to define your project scope
2. Use `/hopla:plan-feature "your feature idea"` to plan each feature
3. Review the plan with `/hopla:review-plan`
4. Hand off to a developer for execution, or ask the AI to execute

## Tips for Better Results
- One request at a time — don't overload with multiple asks
- Be specific about what you want, not how to build it
- If the output isn't right, say what's wrong rather than starting over
- Use the review loop: the AI expects your feedback before proceeding
