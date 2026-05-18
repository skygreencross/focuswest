# Audio narration

The deck's floating audio player auto-detects MP3 files in this folder. Drop a file matching a section ID and the player wires it up automatically — no code changes needed.

## File naming

One MP3 per section, named exactly after the section's `id`:

```
cover.mp3        ← Cover
snapshot.mp3     ← Snapshot
team.mp3         ← Team
platform.mp3     ← Platform
values.mp3       ← Founder values
buyers.mp3       ← Buyer strategy
process.mp3      ← Process
risks.mp3        ← Risks & mitigations
drivers.mp3      ← Value drivers
valuation.mp3    ← Valuation
comparables.mp3  ← Comparable transactions
scenarios.mp3    ← Scenarios
waterfall.mp3    ← Founder takeaway
terms.mp3        ← Engagement terms
roadmap.mp3      ← Roadmap
```

The deck probes one of these on load. If it exists, the player surfaces and HEAD-checks the rest. Sections without an MP3 just don't surface the player when scrolled into view.

## Recommended workflow

1. Open `NARRATION_SCRIPTS.md` in the parent folder.
2. Copy any section's script.
3. Paste into your TTS provider (ElevenLabs, OpenAI TTS, PlayHT, etc.).
4. Generate with a single consistent voice across all sections.
5. Download the MP3 and save it here with the matching filename.

The player picks it up on the next page load.

## Voice settings (suggested)

- **Voice**: pick one of the partners' voices (Skyler, Conor, or Jared) for authenticity, or a "Senior advisor, warm but credentialed" preset
- **Speed**: 0.95–1.0× (natural pace, not rushed)
- **Stability** (ElevenLabs): 0.5–0.6
- **Clarity / similarity boost** (ElevenLabs): 0.7–0.8
- **Style exaggeration** (ElevenLabs): 0.2–0.3 (some inflection, not theatrical)

## ElevenLabs CLI example

```bash
# Install: pip install elevenlabs
# Set your API key: export ELEVEN_API_KEY=...

elevenlabs tts \
  --voice "Antoni" \
  --model "eleven_turbo_v2_5" \
  --text "$(cat ../NARRATION_SCRIPTS.md | section 'cover')" \
  --output ./cover.mp3
```

(The above is illustrative — write the actual script to a file and pass it via `--text-file`.)

## OpenAI TTS one-liner per section

```bash
curl https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1-hd",
    "voice": "onyx",
    "input": "PASTE SCRIPT HERE"
  }' \
  --output cover.mp3
```

Repeat for each section. Recommended voices: `onyx` (deeper, more senior-banker feel) or `echo` (smoother, more advisory). Avoid `nova` and `shimmer` for this deck — they read too consumer-y.
