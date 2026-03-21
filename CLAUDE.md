# UniVoice — AI Interview Platform

Hackathon project: AI interview platform for deaf/hard-of-hearing users. Training mode (STAR feedback) + Live mode (sign-to-speech, speech-to-text). See `PLAN.md` for full technical spec. See `PHASES.md` for dev checklist. Brand name: **UniVoice**.

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind + shadcn/ui — `client/` (port 3000)
- **Backend**: Express + Socket.IO — `server/` (port 3001)
- **CV**: MediaPipe + Fingerpose (client-side only, never send video to server)
- **APIs**: Deepgram (STT), ElevenLabs (TTS, fallback: OpenAI TTS), OpenAI GPT-4o-mini (LLM)

## Commands

```bash
pnpm dev                     # both client + server
pnpm --filter client dev     # frontend only
pnpm --filter server dev     # backend only
```

## Key Rules

- TypeScript + pnpm workspaces throughout
- All hand detection + text formatting runs client-side (deterministic, no LLM)
- Text formatting is confidence-gated: < 60% skips autocorrect
- Short text (< 20 chars) skips LLM polish → straight to TTS
- STAR eval + answer polish always run as `Promise.all()`
- 24 ASL letters supported (all static signs): A–Y excluding J and Z (require motion)
- Text input fallback always visible
- Chrome-only target
