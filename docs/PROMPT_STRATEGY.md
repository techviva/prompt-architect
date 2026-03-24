# Prompt Strategy — Prompt Architect

## Philosophy
Generated prompts should be:
1. **Specific** — Clearly state the task, not vague
2. **Structured** — Use sections, lists, constraints
3. **Platform-aware** — Leverage platform-specific capabilities
4. **Self-contained** — Include all necessary context
5. **Actionable** — The AI can start working immediately

## Template Architecture

### Template Types
Each platform has templates for:
- `initial` — First prompt for a new task
- `withAttachments` — When files/context are provided
- `research` — When web research is needed
- `continuation` — Picking up from a previous conversation
- `revision` — Requesting changes to previous output

### Template Structure
Templates are composed of sections, not string concatenation:
```typescript
interface PromptTemplate {
  platform: Platform
  type: TemplateType
  sections: TemplateSection[]
  buildPrompt(context: PromptContext): string
}

interface TemplateSection {
  key: string
  label: string
  required: boolean
  render(context: PromptContext): string | null
}
```

### Sections (ordered)
1. **Role/Persona** — Who the AI should be
2. **Context** — Background and situation
3. **Task** — What to do (from transcript + analysis)
4. **Requirements** — Specific constraints and expectations
5. **Methodology** — How to approach the work
6. **Output Format** — Expected deliverable structure
7. **Quality Criteria** — How to evaluate the result
8. **Warnings** — Things to avoid or be careful about

## Platform-Specific Strategies

### ChatGPT
- Use markdown formatting
- Explicit step-by-step instructions for complex tasks
- Leverage "think step by step" for reasoning
- Reference web browsing capability when research needed
- Use code blocks for structured output requests

### Claude
- Use XML tags for structured sections
- Leverage long context window for detailed instructions
- Use `<thinking>` references for complex reasoning
- Explicit artifact requests when appropriate
- Detailed quality criteria (Claude responds well to specificity)

### Gemini
- Reference grounding/search capabilities
- Use clear section headers
- Leverage multimodal capabilities when relevant
- Structured output requests via JSON schema hints

### Generic
- Platform-agnostic markdown
- No platform-specific features assumed
- Clear, universal formatting
- Maximum portability

## Complexity-Aware Prompting

### Low Complexity (1-2)
- Single, focused prompt
- Minimal scaffolding
- Direct task statement

### Medium Complexity (3)
- Structured sections
- Clear requirements
- Suggested approach

### High Complexity (4-5)
- Detailed methodology
- Phased approach suggestion
- Explicit quality criteria
- Risk awareness
- Recommendation to break into sub-tasks

## Continuation Prompt Strategy
When generating continuation prompts:
1. Reference the original task briefly
2. Summarize what was accomplished (from user's continuation context)
3. State what needs to change or continue
4. Maintain consistency with original prompt's style and structure

## Revision Prompt Strategy
When generating revision prompts:
1. Reference the original request
2. Clearly state what needs to change
3. Preserve what should stay the same
4. Use diff-like language ("instead of X, do Y")

## Prompt Quality Checks
Before finalizing, validate:
- Prompt length is reasonable for the platform
- No contradictory instructions
- All analysis findings are addressed
- Missing information is flagged, not assumed
- Complexity level matches prompt detail level
