# VIBE — Architecture & Feature Overview

AI-powered interview platform for deaf/hard-of-hearing users. Training mode (STAR feedback) + Live mode (sign-to-speech, speech-to-text).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind + shadcn/ui |
| Backend | Express + Socket.IO |
| CV/ML | MediaPipe HandLandmarker + Fingerpose (client-side only) |
| 3D Viz | Three.js + React Three Fiber |
| STT | Deepgram (nova-2, live streaming) |
| TTS | ElevenLabs (Rachel voice, flash v2.5) → OpenAI TTS fallback |
| LLM | OpenAI GPT-4o-mini |
| Auth/DB | Supabase (Auth + Postgres) |
| Monorepo | pnpm workspaces |

---

## Directory Structure

```
├── client/                             # Next.js frontend (port 3000)
│   └── src/
│       ├── app/
│       │   ├── page.tsx                # Landing page
│       │   ├── auth/page.tsx           # Sign up / Sign in
│       │   ├── profile/page.tsx        # Resume upload + knowledge graph
│       │   ├── training/
│       │   │   ├── page.tsx            # Training dashboard
│       │   │   └── [moduleId]/[questionId]/page.tsx  # Practice page
│       │   └── live/
│       │       └── page.tsx            # Live interview mode
│       ├── components/
│       │   ├── WebcamFeed.tsx          # 640×480 video capture
│       │   ├── HandLandmarkRenderer.tsx # Hand skeleton overlay
│       │   ├── LetterDisplay.tsx       # Detected letter + confidence
│       │   ├── WordBuilder.tsx         # Letter accumulation → words
│       │   ├── TextFallbackInput.tsx   # Manual text input (always visible)
│       │   ├── SpeechToTextPanel.tsx   # Deepgram STT display
│       │   ├── SignToSpeechPanel.tsx   # Text → polish → TTS
│       │   ├── QuickPhrases.tsx        # Instant phrase buttons
│       │   ├── OptionSelector.tsx      # A/B/C/D gesture + click selection
│       │   ├── ConversationLog.tsx     # Chat history
│       │   ├── FeedbackPanel.tsx       # STAR scores + polished answer
│       │   ├── QuestionCard.tsx        # Question display
│       │   ├── TrainingSidebar.tsx     # Module list + progress
│       │   ├── KnowledgeGraph3D.tsx    # 3D knowledge graph (Three.js)
│       │   ├── AslGuide.tsx            # ASL letter reference
│       │   ├── DemoModeToggle.tsx      # Demo mode controls
│       │   ├── TranscriptDisplay.tsx   # Interim/final transcript
│       │   ├── DitherCanvas.tsx        # Decorative background effect
│       │   └── ui/                     # shadcn/ui (Button, Card, Badge, etc.)
│       ├── hooks/
│       │   ├── useMediaPipe.ts         # HandLandmarker init (GPU, VIDEO)
│       │   ├── useFingerpose.ts        # ASL gesture estimation
│       │   ├── useLetterStabilizer.ts  # 500ms stability gating
│       │   ├── useSocket.ts            # Socket.IO client
│       │   ├── useAudioCapture.ts      # MediaRecorder (opus, 250ms)
│       │   ├── useSpeechRecognition.ts # Browser STT fallback
│       │   └── useTrainingProgress.ts  # localStorage progress tracking
│       ├── context/
│       │   └── AuthContext.tsx          # Supabase auth provider
│       ├── lib/
│       │   ├── supabase.ts             # Supabase client factory
│       │   ├── text-formatter.ts       # Confidence-gated text processing
│       │   ├── asl-gestures.ts         # 16 ASL letter definitions
│       │   ├── word-dictionary.ts      # Top 5000 English words
│       │   ├── questions.ts            # Training modules (4 modules, 10 questions)
│       │   ├── parse-pdf.ts            # PDF text extraction (pdfjs-dist)
│       │   ├── predictive-text.ts      # Autocomplete suggestions
│       │   └── utils.ts               # Tailwind helpers
│       ├── types/                      # Type declarations (fingerpose, mediapipe)
│       └── middleware.ts               # Auth route protection
│
├── server/                             # Express backend (port 3001)
│   └── src/
│       ├── index.ts                    # Express + Socket.IO setup
│       ├── handlers/
│       │   ├── training.handler.ts     # training:submit → STAR eval + polish
│       │   ├── live.handler.ts         # STT, TTS, AI suggestions
│       │   └── profile.handler.ts      # POST/GET /api/profile
│       ├── services/
│       │   ├── openai.service.ts       # GPT-4o-mini (eval, polish, suggestions)
│       │   ├── deepgram.service.ts     # Live STT (nova-2, opus, 48kHz)
│       │   ├── elevenlabs.service.ts   # TTS (Rachel) + OpenAI fallback
│       │   └── knowledge-graph.service.ts  # Resume → structured knowledge graph
│       └── lib/
│           └── supabase.ts             # Supabase server client
│
├── PLAN.md                             # Full technical specification
├── PHASES.md                           # 10-phase development checklist
└── CLAUDE.md                           # Project rules & stack summary
```

---

## Features

### 1. ASL Hand Detection & Letter Recognition

- **MediaPipe HandLandmarker** detects 21 hand landmarks per frame (GPU, VIDEO mode, ~3fps)
- **Fingerpose** classifies landmarks into **16 ASL letters**: A, B, C, D, F, G, H, I, K, L, P, Q, V, W, X, Y
  - Excluded: E/S/T (indistinguishable fists), O (same as C), M/N (same as A), R/U (same as V), J/Z (require motion)
- **500ms stability gate** — letter must be held for 500ms before registering
- Hand skeleton drawn on canvas overlay via `HandLandmarkRenderer`

### 2. Text Building & Formatting

- Letters accumulate in `WordBuilder` with autocomplete suggestions from a 5000-word dictionary
- **Greedy longest-match segmentation** converts letter streams into words (e.g., `DAILYCOLD` → `DAILY COLD`)
- **Confidence gating**: average confidence < 60% → raw passthrough (no autocorrect)
- Space, Backspace, Clear controls + keyboard support
- Manual text fallback input always visible

### 3. Training Mode

**Pages:** `/training` (dashboard) → `/training/[moduleId]/[questionId]` (practice)

- 4 training modules with 10 total questions (Behavioral Basics, STAR Method, Common Questions, Advanced Answers)
- User answers via ASL sign detection or text input
- Answer submitted via Socket.IO (`training:submit`) to backend
- Backend runs two **parallel** GPT-4o-mini requests:
  - **STAR evaluation** — scores 0-100 for Situation, Task, Action, Result + 2-3 specific improvements
  - **Answer polish** — more articulate version preserving original meaning
- `FeedbackPanel` displays STAR progress bars, improvements, and side-by-side original vs. polished answer
- Progress tracked in localStorage per module/question
- **Demo mode** pre-fills answers for rapid testing

### 4. Live Interview Mode

**Page:** `/live` — three-panel layout

#### Panel 1: Speech-to-Text (Interviewer Speaking)
- `useAudioCapture` records at 250ms intervals (opus/webm)
- Audio chunks streamed to server via `live:audio-in`
- Server pipes to **Deepgram** live STT (nova-2, smart formatting, VAD, interim results)
- Interim (faded) and final (solid) transcripts displayed in real-time

#### Panel 2: Sign-to-Speech (Candidate Responding)
- Text input from ASL detection or manual typing
- **Short text (< 20 chars)**: skips LLM polish → direct to TTS
- **Longer text**: polished via GPT-4o-mini → preview shown → TTS
- **ElevenLabs** TTS (Rachel voice, eleven_flash_v2_5) with **OpenAI TTS** fallback
- Audio played via HTML5 `<audio>` element

#### Panel 3: AI Response Suggestions
- Triggered after final transcript from interviewer
- GPT-4o-mini generates **4 options** (A–D):
  - A: Short/direct — B: Detailed — C: Clarification — D: Pivot/context
- Selectable via ASL gesture (A/B/C/D letters detected on webcam, 500ms confirm) or click
- Selected option → TTS playback

#### Quick Phrases
- 12 instant buttons ("Yes", "No", "Could you repeat that?", etc.)
- Direct to TTS with no polish step

### 5. Profile & Knowledge Graph

**Page:** `/profile`

- Upload resume PDF (parsed via pdfjs-dist) or paste text
- Enter background/goals
- Backend builds **structured knowledge graph** via GPT-4o-mini:
  ```
  skills[], experiences[{role, company, duration, bullets[{text, keywords}]}],
  education[{degree, institution, year, keywords}],
  projects[{name, description, technologies, bullets}],
  strengths[], industries[], summary
  ```
- Stored in Supabase `profiles` table (JSONB)
- **3D visualization** using Three.js / React Three Fiber:
  - Hierarchical node graph (center → sections → items → bullets → keywords)
  - Color-coded by category, billboarded labels, orbit controls
  - Fullscreen mode, click for details panel
- Knowledge graph used to **personalize** STAR feedback and live suggestions

### 6. Authentication

- **Supabase Auth** (email/password)
- `AuthContext` manages session state + persistence
- `middleware.ts` protects `/training`, `/live`, `/profile` routes
- JWT tokens stored in cookies (SSR-safe via `@supabase/ssr`)

---

## API & Socket.IO Events

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/profile` | Create/update profile + build knowledge graph |
| GET | `/api/profile/:userId` | Fetch profile + knowledge graph |

### Socket.IO Events

#### Training
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `training:submit` | `{question, answer, userId?}` |
| Server → Client | `training:feedback` | `{success, feedback: {situation, task, action, result, improvements[], polishedAnswer}}` |

#### Live — Speech-to-Text
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `live:start-listening` | — |
| Client → Server | `live:audio-in` | `Buffer` (opus audio chunk) |
| Client → Server | `live:stop-listening` | — |
| Server → Client | `live:transcript` | `{text, isFinal}` |

#### Live — Text-to-Speech
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `live:sign-text` | `{text}` |
| Client → Server | `live:quick-phrase` | `{text}` |
| Client → Server | `live:select-option` | `{label, text}` |
| Server → Client | `live:polished-preview` | `{polished}` |
| Server → Client | `live:audio-chunk` | `{audio: base64, mimeType}` |

#### Live — AI Suggestions
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `live:suggest` | `{transcript}` |
| Server → Client | `live:suggestions` | `{options: [{label, text}]}` |

#### Live — Context
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `live:set-resume` | `{resume}` |

---

## Key Design Decisions

- **All CV runs client-side** — zero latency, no video sent to server, full privacy
- **Confidence gating (< 60%)** — prevents autocorrect from mangling low-confidence input
- **Short text fast path (< 20 chars)** — skips LLM polish for snappy TTS on quick phrases
- **STAR eval + polish as `Promise.all()`** — parallel requests cut feedback latency in half
- **ElevenLabs → OpenAI TTS fallback** — graceful degradation if primary TTS unavailable
- **Socket.IO over WebRTC** — simpler, auto-reconnect, no ICE/STUN complexity
- **Greedy longest-match segmentation** — deterministic word splitting without LLM
- **Chrome-only target** — WebGL GPU acceleration required for MediaPipe
