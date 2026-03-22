# VIBE - Voice Inclusion for Better Employment

An AI-powered interview platform that translates ASL hand signs into spoken answers in real time, built for deaf and hard-of-hearing candidates.

## Architecture

```
                        +------------------+
                        |   Next.js 14     |
                        |   (App Router)   |
                        |   Port 3000      |
                        +--------+---------+
                                 |
              +------------------+------------------+
              |                  |                   |
   +----------v-----+  +--------v--------+  +-------v--------+
   | MediaPipe +     |  | Socket.IO       |  | Supabase Auth  |
   | Fingerpose      |  | WebSocket       |  | (JWT, SSR)     |
   | (client-side)   |  | Client          |  +-------+--------+
   +----------+------+  +--------+--------+          |
              |                  |                    |
              |         +--------v--------+           |
              |         |   Express       |           |
              |         |   Socket.IO     |           |
              |         |   Port 3001     |           |
              |         +--------+--------+           |
              |                  |                    |
              |    +-------------+-------------+      |
              |    |             |             |       |
         +----v---v--+  +-------v---+  +------v------+
         | OpenAI    |  | Deepgram  |  | ElevenLabs  |
         | GPT-4o-   |  | nova-2    |  | TTS         |
         | mini      |  | STT       |  | (+ OpenAI   |
         |           |  |           |  |  fallback)  |
         +-----------+  +-----------+  +------+------+
                                              |
                                       +------v------+
                                       | Supabase    |
                                       | PostgreSQL  |
                                       +-------------+
```

**Monorepo**: pnpm workspaces with two packages - `client/` (Next.js 14) and `server/` (Express + Socket.IO). TypeScript throughout.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14, Tailwind, shadcn/ui | App Router for file-based routing, shadcn for accessible components |
| Real-time | Socket.IO | Auto-reconnect, event namespacing, room management (simpler than WebRTC for our use case) |
| Hand Detection | MediaPipe HandLandmarker + Fingerpose | GPU-accelerated, runs entirely client-side, zero privacy risk |
| 3D Visualization | React Three Fiber / Three.js | Interactive knowledge graph with orbit controls and particle effects |
| STT | Deepgram (nova-2) | Low-latency live streaming, smart formatting, VAD |
| TTS | ElevenLabs (flash v2.5) + OpenAI fallback | Natural voice output with graceful degradation |
| LLM | OpenAI GPT-4o-mini | STAR evaluation, answer polish, puzzle generation, AI suggestions |
| Auth + DB | Supabase | PostgreSQL, JWT auth, row-level security |
| Drag & Drop | @dnd-kit | Accessible drag interactions for the Puzzle Builder |
| PDF Parsing | pdfjs-dist | Client-side resume extraction |

## Project Structure

```
client/src/
  app/                    # Next.js pages
    page.tsx              # Landing page
    auth/                 # Supabase email/password auth
    profile/              # Resume upload + 3D knowledge graph
    training/             # Training dashboard + question pages
    live/                 # Live interview mode (three-panel)
  components/             # 40+ React components
    WebcamFeed.tsx        # 640x480 video capture
    HandLandmarkRenderer  # Canvas overlay (21 landmarks + skeleton)
    WordBuilder.tsx       # Letter accumulation + autocomplete
    PuzzleBuilder.tsx     # Drag-and-drop STAR puzzle
    KnowledgeGraph3D.tsx  # Three.js 5-tier hierarchical graph
    SpeechToTextPanel.tsx # Deepgram live transcript display
    SignToSpeechPanel.tsx # Text -> polish -> TTS pipeline
    QuickPhrases.tsx      # 12 instant phrase buttons
    OptionSelector.tsx    # A/B/C/D gesture or click selection
    FeedbackPanel.tsx     # STAR progress bars + improvements
  hooks/
    useMediaPipe.ts       # HandLandmarker init (GPU, ~3fps throttle)
    useFingerpose.ts      # ASL gesture classification (16 letters)
    useLetterStabilizer.ts# 500ms stability gate
    useSocket.ts          # Socket.IO client management
    useAudioCapture.ts    # MediaRecorder (opus/webm, 250ms chunks)
    usePuzzleBuilder.ts   # Puzzle state + Socket.IO events
  lib/
    asl-gestures.ts       # 16 ASL letter definitions (Fingerpose format)
    text-formatter.ts     # Greedy longest-match segmentation (5000-word dict)
    word-dictionary.ts    # Top 5000 English words
    predictive-text.ts    # Autocomplete suggestions
    parse-pdf.ts          # Resume PDF parsing

server/src/
  index.ts                # Express + Socket.IO setup
  handlers/
    training.handler.ts   # training:submit -> STAR eval + polish
    live.handler.ts       # STT/TTS/suggestions, session state machine
    puzzle.handler.ts     # Puzzle option generation + block stitching
    profile.handler.ts    # Resume -> knowledge graph
    module.handler.ts     # Training module CRUD
    report.handler.ts     # Analytics / reports
  services/
    openai.service.ts     # STAR eval, puzzle eval, answer polish
    deepgram.service.ts   # Live STT (nova-2, 48kHz, opus)
    elevenlabs.service.ts # Rachel TTS + OpenAI fallback
    knowledge-graph.service.ts  # Resume -> structured KG
    kg-retrieval.service.ts     # Filter KG by question type
    session.service.ts    # Live session tracking
    translation.service.ts# Multi-language (EN/ES/FR/ZH)
```

## Core Technical Pipelines

### ASL Detection Pipeline (Client-Side)

No video ever leaves the user's device.

```
Webcam (640x480)
  -> MediaPipe HandLandmarker (GPU, ~3fps throttle)
  -> 21 hand landmarks per frame
  -> Fingerpose classification (16 ASL letters)
  -> 500ms stability gate (prevents jitter false positives)
  -> Letter accumulation
  -> Greedy longest-match segmentation (5000-word dictionary)
  -> Confidence gate (< 60% avg = skip autocorrect)
  -> Final text output
```

**Supported letters**: A, B, C, D, F, G, H, I, K, L, P, Q, V, W, X, Y

Excluded: E/S/T (indistinguishable fists), J/Z (require motion), M/N (identical to A), R/U (same as V), O (matches C).

### Live Interview Pipeline (WebSocket)

```
Interviewer speaks
  -> useAudioCapture (250ms opus/webm chunks)
  -> Socket.IO: live:audio-in
  -> Deepgram nova-2 (48kHz, smart formatting, VAD)
  -> Socket.IO: live:transcript {text, isFinal}
  -> If isFinal: trigger AI suggestions (4 options: Short/Detailed/Clarification/Pivot)

Candidate signs or types
  -> Text < 20 chars: skip polish, direct to TTS (fast path)
  -> Text >= 20 chars: GPT-4o-mini polish -> preview -> TTS
  -> ElevenLabs TTS (Rachel voice, flash v2.5) || OpenAI TTS fallback
  -> Socket.IO: live:audio-chunk {base64, mimeType}
  -> HTML5 <audio> playback
```

### Training Pipeline

```
User answers question (sign or text)
  -> Socket.IO: training:submit
  -> Promise.all([
       GPT-4o-mini STAR evaluation (S/T/A/R scored 0-100 + improvements),
       GPT-4o-mini answer polish (preserves meaning, improves articulation)
     ])
  -> Socket.IO: training:feedback
  -> FeedbackPanel renders scores + side-by-side comparison
```

### Puzzle Builder Pipeline

```
Resume uploaded -> GPT-4o-mini extracts structured KG
  -> puzzle:generate-options (4 experience tiles from KG)
  -> User selects one
  -> puzzle:generate-blocks (story fragments tagged S/T/A/R)
  -> User drags blocks into slots (@dnd-kit)
  -> puzzle:stitch (AI generates filler words, shown in purple)
  -> Final coherent STAR answer
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| All CV client-side | Zero privacy risk, zero network latency in detection loop |
| Socket.IO over WebRTC | No peer-to-peer media needed; auto-reconnect + event namespacing out of the box |
| 16 ASL letters (not 26) | Only letters with unique curl+direction signatures; fewer letters, much higher accuracy |
| 500ms stability gate | Prevents jitter-induced false positives |
| Confidence gate (< 60%) | Low-confidence input skips autocorrect to prevent mangling |
| Short text fast path (< 20 chars) | Skips LLM polish for instant TTS on quick responses |
| STAR eval + polish as Promise.all() | Parallel requests cut feedback latency ~50% |
| ElevenLabs -> OpenAI TTS fallback | Graceful degradation, never hard-fails |
| Deepgram 8s keep-alive ping | Prevents silent WebSocket drop after ~10-12s idle |
| Connection generation tracking | Invalidates stale callbacks, prevents ghost transcripts |
| Greedy longest-match (no LLM) | Deterministic, instant text segmentation |

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/profile` | Create/update profile + build knowledge graph |
| GET | `/api/profile/:userId` | Fetch profile + knowledge graph |
| GET | `/api/modules` | List training modules |
| GET | `/api/modules/:id` | Module details |
| GET | `/api/reports/:moduleId` | Module analytics report |

### Socket.IO Events

**Training**
- `training:submit` - Submit answer for STAR evaluation
- `training:feedback` - Receive scores + polished answer

**Live Session**
- `live:session-start` / `live:session-end` / `live:session-resume`
- `live:start-listening` / `live:audio-in` / `live:stop-listening`
- `live:transcript` - Real-time STT results (interim + final)
- `live:sign-text` - Send text for polish + TTS
- `live:quick-phrase` - Instant TTS (no polish)
- `live:suggest` / `live:suggestions` - AI response options
- `live:select-option` - Pick A/B/C/D suggestion
- `live:audio-chunk` - TTS audio delivery (base64)

**Puzzle**
- `puzzle:generate-options` / `puzzle:options-ready`
- `puzzle:generate-blocks` / `puzzle:blocks-ready`
- `puzzle:stitch` / `puzzle:stitched`

## Scalability

### Current Architecture Bottlenecks

The current design runs as a single Express server handling all WebSocket connections and API calls. This works for demo/hackathon scale but has clear limits:

1. **Single Socket.IO process** - all connections on one node
2. **No request queuing** - API calls to OpenAI/Deepgram/ElevenLabs go direct
3. **In-memory session state** - lost on server restart
4. **Client-side localStorage** - training progress tied to one browser

### Horizontal Scaling Path

```
                    +------------------+
                    |   Load Balancer  |
                    |   (sticky sess)  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
        +-----v----+  +-----v----+  +------v---+
        | Express  |  | Express  |  | Express  |
        | Node 1   |  | Node 2   |  | Node N   |
        +-----+----+  +-----+----+  +-----+----+
              |              |              |
        +-----v--------------v--------------v-----+
        |           Redis Adapter                  |
        |   (Socket.IO pub/sub across nodes)       |
        +-----+------------------------------------+
              |
        +-----v--------------+
        |  Redis              |
        |  - Session store    |
        |  - Socket.IO state  |
        |  - Rate limiting    |
        +-----+---------------+
              |
        +-----v--------------+
        |  Supabase           |
        |  PostgreSQL         |
        |  - Profiles         |
        |  - Sessions         |
        |  - Progress         |
        |  - Knowledge graphs |
        +---------------------+
```

**What needs to change for production scale:**

| Concern | Current | Scaled |
|---------|---------|--------|
| WebSocket distribution | Single process | Socket.IO Redis adapter for pub/sub across N nodes |
| Session state | In-memory Map | Redis with TTL expiry |
| Training progress | localStorage | Supabase `user_question_answers` table (schema already exists) |
| API rate limits | None | Redis-backed token bucket per user |
| TTS/STT connections | Direct per-request | Connection pooling with queue backpressure |
| Static assets | Next.js dev server | CDN (Vercel/Cloudflare) |
| Auth | Supabase (already scalable) | No change needed - row-level security handles multi-tenancy |

### Compute-Heavy Operations

The heaviest operations and how they scale:

| Operation | Where | Scaling Strategy |
|-----------|-------|-----------------|
| MediaPipe hand detection | Client GPU | Already distributed - runs on each user's device |
| Text segmentation | Client CPU | Already distributed - greedy algorithm, O(n^2) worst case on input length |
| Deepgram STT | External API | Per-connection WebSocket; scale by upgrading Deepgram tier |
| ElevenLabs TTS | External API | Stateless HTTP; scale with concurrent request limits |
| GPT-4o-mini (STAR eval) | External API | Stateless; scale with API tier + request queuing |
| Knowledge graph rendering | Client GPU (Three.js) | Already distributed; optimize with LOD for large graphs |

The client-side-first architecture means the server is lightweight - it's primarily a WebSocket relay + API orchestrator. A single node can handle ~1000 concurrent Socket.IO connections before needing horizontal scaling.

### On-Device Future

Key API dependencies that could move client-side to reduce server load and enable offline mode:

- **TTS**: Piper TTS via ONNX/WebAssembly (eliminates ElevenLabs dependency)
- **LLM polish**: WebLLM or similar for short text formatting (eliminates simple GPT calls)
- **STT**: Whisper.cpp via WebAssembly (eliminates Deepgram for offline practice)

This would reduce the server to auth + persistence only, with AI services as optional cloud enhancements.

## Environment Variables

```env
# Server (.env)
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Client (.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Run both client + server
pnpm dev

# Or individually
pnpm --filter client dev     # Frontend on :3000
pnpm --filter server dev     # Backend on :3001
```

Chrome-only target (WebGL + MediaPipe GPU required).

## Team

Built for Hack The Globe 2026.
