

## Plan: Improve AI Detection Score

### Current State

The system already has:
- Anti-AI vocabulary in the generation prompt (banned words, contractions, varied sentence lengths)
- Auto-humanize pass if AI detection > 60%
- AI detection self-check using Gemini Flash

### Problem

The AI detection score is unreliable because:
1. **Self-assessment is weak** — using one AI model to judge another AI's output is circular. Real detectors (Turnitin, GPTZero) use statistical models, not LLMs.
2. **Single humanize pass** — one rewrite may not be enough.
3. **No re-check after humanize** — the system never verifies the humanized version scores better.
4. **Temperature is default** — more randomness = harder to detect.

### Proposed Improvements

#### 1. Multi-pass humanization with re-check loop
After auto-humanize, re-run the AI detection check on the humanized text. If still above 40%, humanize again (max 2 additional passes). This iterative approach progressively reduces detectable patterns.

#### 2. Increase generation temperature
Set `temperature: 1.1` on the main generation call (currently default ~1.0). Higher temperature introduces more lexical randomness — a key signal real detectors look for (perplexity).

#### 3. Add "burstiness" instruction to the prompt
Real human writing has high "burstiness" — alternating between complex and simple sentences. Add explicit instruction to the system prompt targeting this specific metric that detectors measure.

#### 4. Inject deliberate imperfections
Add instructions to occasionally:
- Use slightly awkward phrasing that a student would leave in
- Include a minor self-correction mid-paragraph
- Have one paragraph that feels slightly off-topic before refocusing
- Use filler phrases: "to be fair", "in a way", "if anything"

#### 5. Lower auto-humanize threshold to 40%
Currently triggers at 60%. Lowering to 40% ensures more assignments get humanized.

#### 6. Post-humanize verification in generation report
After the final pass, re-run AI detection on the final content and store the updated score in `generation_metadata` so the user sees the actual post-humanize score.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-assignment/index.ts` | Add temperature, burstiness prompt, multi-pass humanize loop with re-check, lower threshold to 40%, store final scores |

### Notes
- The internal AI detection check is a rough heuristic, not a substitute for real detectors. The most impactful improvement is the prompt engineering (burstiness, imperfections, temperature) rather than the check-and-rewrite loop.
- Each additional humanize pass costs an extra API call (~3-5 seconds latency per pass).

