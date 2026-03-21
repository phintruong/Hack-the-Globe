# Development Phases

Complete each phase fully before moving to the next. Each produces a working, testable state.

---

## Phase 1: Project Scaffolding
**Goal**: Monorepo with both apps starting.

- [ ] pnpm workspace config
- [ ] Next.js 14 app in `client/` (TypeScript, Tailwind, App Router)
- [ ] Client deps: `socket.io-client`, `@mediapipe/tasks-vision`, `fingerpose`, `react-webcam`
- [ ] shadcn/ui setup (button, card, badge, tabs, progress)
- [ ] Express + Socket.IO server in `server/`
- [ ] Server deps: `openai`, `@deepgram/sdk`, `elevenlabs`, `dotenv`, `cors`
- [ ] Root `package.json` with `concurrently` dev script
- [ ] `.env.example` + `.gitignore`
- [ ] Page stubs: landing `/`, training `/training`, live `/live`
- [ ] Verify `pnpm dev` starts both (3000 + 3001)

**Done**: `pnpm dev` runs, landing page renders, Socket.IO connects.

---

## Phase 2: Webcam + Hand Detection
**Goal**: Hand skeleton overlay + letter detection with confidence.

- [ ] `WebcamFeed` component (react-webcam, 640x480)
- [ ] `useMediaPipe` hook (HandLandmarker, GPU, VIDEO mode)
- [ ] `requestAnimationFrame` detection loop
- [ ] `HandLandmarkRenderer` (21 landmarks + connections on canvas)
- [ ] Fingerpose integration (MediaPipe → fingerpose format)
- [ ] 10 ASL gesture definitions (A, B, C, D, I, L, O, V, W, Y)
- [ ] `useFingerpose` hook
- [ ] `LetterDisplay` (detected letter + confidence %)
- [ ] `useLetterStabilizer` (500ms stability required)

**Done**: Skeleton overlay visible, letter + confidence shown, stabilization works.

---

## Phase 3: Text Building + Formatting
**Goal**: Letters → words → formatted text.

- [ ] `WordBuilder` component (letter accumulation)
- [ ] Space/backspace gestures or buttons
- [ ] `text-formatter.ts` (confidence-gated, deterministic)
- [ ] `word-dictionary.ts` (top 5000 words)
- [ ] `segmentIntoWords()` (greedy longest-match)
- [ ] Auto-capitalize + punctuate
- [ ] Low confidence (< 60%) → raw passthrough
- [ ] `TextFallbackInput` (always visible)

**Done**: Spelling → formatted text. Low-confidence stays raw. Text fallback works.

---

## Phase 4: Training Mode — Backend
**Goal**: STAR feedback + polish from server.

- [ ] `openai.service.ts` (client init)
- [ ] STAR evaluation prompt + response parsing
- [ ] Answer polish prompt
- [ ] `evaluateAnswer()` with `Promise.all()`
- [ ] `training.handler.ts` (`training:submit` → `training:feedback`)
- [ ] Wire into Socket.IO router

**Done**: Socket.IO text → STAR JSON + polished answer returned.

---

## Phase 5: Training Mode — Frontend
**Goal**: Full training UI with feedback.

- [ ] 10 hardcoded interview questions
- [ ] `QuestionCard` component
- [ ] `AnswerBuilder` (sign detection + text fallback + formatter)
- [ ] Submit → `training:submit`
- [ ] `FeedbackPanel` (STAR bars + improvements + polished answer side-by-side)
- [ ] Loading states + error handling

**Done**: Question → answer → submit → STAR scores + improvements + polished version.

---

## Phase 6: Live Mode — Speech-to-Text
**Goal**: Deepgram live transcription.

- [ ] `deepgram.service.ts` (streaming connection)
- [ ] `live.handler.ts` (`live:audio-in` → Deepgram → `live:transcript`)
- [ ] `useAudioCapture` (MediaRecorder, 250ms, webm/opus)
- [ ] `TranscriptDisplay` (interim faded, final solid)
- [ ] `SpeechToTextPanel` (mic toggle + transcript)
- [ ] "Listening..." status
- [ ] Deepgram lifecycle (open/keepalive/close)
- [ ] Fallback: browser SpeechRecognition

**Done**: Speech → live transcript with interim/final. "Listening..." shown.

---

## Phase 7: Live Mode — Sign-to-Speech
**Goal**: Text → polish → TTS voice output.

- [ ] `elevenlabs.service.ts` (Rachel voice, turbo model)
- [ ] OpenAI TTS fallback
- [ ] Smart polish (< 20 chars skip, >= 20 chars polish + cache)
- [ ] `live:sign-text` → polish → `live:polished-preview` → TTS → `live:audio-chunk`
- [ ] `SignToSpeechPanel` (preview + Send button)
- [ ] `useAudioPlayback` + `AudioPlayer`
- [ ] "Converting..." → "Speaking..." status

**Done**: Type/sign → Send → hear polished speech. Short = fast, long = preview shown.

---

## Phase 8: Quick Phrases + AI Suggestions
**Goal**: Instant phrases + post-question hints.

- [ ] `QuickPhrases` (5 buttons, direct to ElevenLabs, no LLM)
- [ ] `live:quick-phrase` handler
- [ ] AI suggestion after final transcript (GPT-4o-mini, max 10 words)
- [ ] Hint display below transcript
- [ ] `ConversationLog` (scrollable history)

**Done**: Quick phrases instant. AI hint after interviewer speaks. History scrolls.

---

## Phase 9: Live Mode Layout
**Goal**: All live components integrated.

- [ ] Split-screen: sign panel (left) + transcript (right)
- [ ] Wire all components on `/live`
- [ ] Landing page mode selection
- [ ] Accessible styling (large text, contrast, spacing)
- [ ] End-to-end test

**Done**: Full live conversation flow works in one view.

---

## Phase 10: Demo Mode + Polish
**Goal**: Demo-ready.

- [ ] `DemoModeToggle` (pre-fill answers, skip sign detection, run full pipeline)
- [ ] Fallbacks: ElevenLabs → OpenAI TTS, Deepgram → SpeechRecognition, OpenAI → error + retry
- [ ] Error boundaries + loading states everywhere
- [ ] Visual polish (shadcn/ui theme, accessible colors)
- [ ] Chrome testing
- [ ] Practice demo script (see PLAN.md)

**Done**: Demo mode seamless. Fallbacks work. Polished and professional.
