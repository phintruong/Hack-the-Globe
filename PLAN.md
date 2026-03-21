# AI Sign Language Interview Platform — Technical Plan

## Context

Hackathon project (24-36 hour build) for an AI-powered interview platform for deaf/hard-of-hearing users. Two modes: (1) async training with STAR feedback, (2) real-time interview assistant with sign-to-speech and speech-to-text. Greenfield repo — nothing exists yet.

---

## 1. SYSTEM ARCHITECTURE

```
                         ┌───────────────────────────┐
                         │        FRONTEND            │
                         │   Next.js 14 (App Router)  │
                         │                            │
                         │  ┌──────────────────────┐  │
                         │  │ Webcam + MediaPipe    │  │  ← client-side inference
                         │  │ Hand Landmarks        │  │
                         │  │ + Fingerpose Classify  │  │
                         │  │ + Text Formatter      │  │  ← client-side deterministic
                         │  └──────────────────────┘  │
                         └────────────┬───────────────┘
                                      │
                               Socket.IO (WebSocket)
                                      │
                         ┌────────────┴───────────────┐
                         │      BACKEND SERVER         │
                         │   Node.js + Express         │
                         │   + Socket.IO Server        │
                         └────────────┬───────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                  │
             ┌──────┴──────┐  ┌──────┴──────┐  ┌───────┴──────┐
             │  Deepgram   │  │  OpenAI     │  │  ElevenLabs  │
             │  STT Stream │  │  GPT-4o-mini│  │  TTS API     │
             └─────────────┘  └─────────────┘  └──────────────┘
```

**Key decisions:**
- **Hand tracking runs 100% client-side** (MediaPipe WASM @ 30fps) — zero network latency
- **Socket.IO over WebSocket** (not WebRTC) — simpler, reliable, auto-reconnect
- **Deepgram for STT** (streaming, sub-300ms latency, $200 free credits)
- **OpenAI GPT-4o-mini** for LLM (STAR feedback + answer polishing)
- **ElevenLabs for TTS** (realistic voice output, streaming)

---

## 2. TECH STACK

| Layer | Tool | Package |
|---|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS, shadcn/ui | `next@14`, `tailwindcss`, `shadcn-ui` |
| Hand Detection | MediaPipe Hand Landmarker (WASM, client-side) | `@mediapipe/tasks-vision` |
| Gesture Classification | Fingerpose (rule-based ASL letter matching) | `fingerpose` |
| Webcam | react-webcam | `react-webcam` |
| Real-time | Socket.IO | `socket.io` + `socket.io-client` |
| Backend | Express + Node.js 20 | `express` |
| Speech-to-Text | Deepgram Nova-2 streaming | `@deepgram/sdk` |
| Text-to-Speech | ElevenLabs (realistic voice) | `elevenlabs` |
| LLM (STAR + Polish) | OpenAI GPT-4o-mini | `openai` |
| Dev Tools | TypeScript, pnpm workspaces, concurrently | `typescript`, `concurrently` |

---

## 3. FEATURE SCOPING

### MUST BUILD (Demo MVP)

1. **Webcam + hand skeleton overlay** (MediaPipe)
2. **ASL fingerspelling** — 10 reliable letters: A, B, C, D, I, L, O, V, W, Y
3. **Letter → word accumulation** with space/backspace gestures
4. **Smart text formatting** (client-side, deterministic — NO LLM):
   - Auto-spacing into words (dictionary lookup for word boundaries)
   - Basic rule-based autocorrect (common misspellings)
   - Capitalize first letter of sentences
   - Add punctuation (period at end of sentences)
   - **Confidence-gated**: if avg detection confidence < 60%, skip aggressive formatting → just space-separate raw letters
   - Example (high confidence): `HELLOMYNAMEISJOHN` → `"Hello, my name is John."`
   - Example (low confidence): `HELO MY NAM` → `"helo my nam"` (no autocorrect to avoid mangling)
5. **Text input fallback** — typing as backup, always visible
6. **Training Mode**:
   - Display interview question → user signs/types answer
   - Submit → GPT-4o-mini returns **structured STAR feedback** (JSON):
     - `overall_score` (0–10)
     - `situation`, `task`, `action`, `result`: each with score (0–10) + 1-sentence feedback
     - `improvements`: 3 specific bullets (detect missing components, vague language, suggest measurable impact)
   - Submit → GPT-4o-mini also returns **"Improved Version"** (answer polishing):
     - Same answer, rewritten professionally
     - Example: `"i worked team project we did good"` → `"I worked on a team project where we collaborated effectively to deliver strong results."`
7. **Live Mode — Sign-to-Speech** (with smart auto-polish):
   - **Short text (< 20 chars)**: skip polish → send directly to ElevenLabs (fast path, ~200-400ms)
   - **Longer text (>= 20 chars)**: raw text → OpenAI polish → polished text → ElevenLabs (full path, ~1-1.5s)
   - Simple in-memory cache: if same text was polished before → reuse cached result (no duplicate OpenAI calls)
   - User sees preview of polished text before it speaks
   - This is the key demo moment: messy input becomes eloquent speech
8. **Live Mode — Speech-to-Text**: Deepgram STT → live transcript with interim/final indicators
9. **Live Mode — AI Suggestion hint** (lightweight):
   - After each final Deepgram transcript (interviewer finishes speaking)
   - Server makes a small OpenAI call: "Given this interview question, what is ONE key thing a strong answer should include? (max 10 words)"
   - Returns 1 short hint (max 10 words): e.g., "Include a measurable outcome" or "Specify your individual contribution"
   - Displayed as a small subtle hint line below the transcript — no extra UI complexity
10. **Quick Phrase buttons** (direct to ElevenLabs, no LLM):
    - "Thank you for the question"
    - "Can you repeat that?"
    - "Let me think for a moment"
    - On click: text → ElevenLabs → play audio immediately
11. **Confidence indicators**:
    - Sign detection: confidence % (0–100) + current detected letter displayed clearly
    - STT: interim transcript (faded/italic) vs final transcript (solid text)
12. **Status indicators** in Live Mode:
    - "Listening..." (Deepgram active)
    - "Converting..." (processing text)
    - "Speaking..." (TTS playing audio)
13. **Demo Mode toggle** — when ON:
    - Pre-fill answers (skip sign detection)
    - Still runs OpenAI feedback + ElevenLabs TTS + Deepgram STT normally
    - Seamless — looks like a real session
14. **Mode selection landing page**

### SIMPLIFIED APPROACH (Sign Recognition)

Full ASL is impossible in 24h. Our approach:
- **Fingerspelling only** (static hand poses for A-Z alphabet)
- Start with 10 most distinguishable letters, expand if time
- **Smart text formatting** handles the raw letter stream → readable text (deterministic, no LLM)
- **Text input fallback** always visible
- **Quick phrase buttons** bypass signing entirely for common responses
- **Demo Mode** pre-fills text to guarantee smooth presentation

### FALLBACKS

| Component | Primary | Fallback |
|---|---|---|
| Sign detection fails | MediaPipe + fingerpose | Text input box |
| ElevenLabs fails | ElevenLabs TTS | OpenAI TTS (`tts-1`) |
| Deepgram fails | Deepgram Nova-2 | Browser `SpeechRecognition` API |
| OpenAI fails | GPT-4o-mini | Static error message + retry button |

### OUT OF SCOPE
- Full dynamic ASL sign recognition
- Mobile/tablet optimization
- User accounts/persistence
- Video recording

---

## 4. DATA FLOW PIPELINES

### Training Mode (Async)

```
Step 1: UI displays interview question
        "Tell me about a time you solved a difficult problem"

Step 2: Sign capture (client-side, no network)
        Webcam frame (every 33ms)
        → MediaPipe HandLandmarker.detectForVideo()
        → 21 hand landmarks → Fingerpose GestureEstimator.estimate()
        → Confidence score displayed (0-100%)
        → If confidence > 8.5/10 AND stable for 500ms → accept letter
        → Letter appended to raw buffer

Step 3: Smart text formatting (client-side, deterministic, confidence-gated)
        IF avg confidence > 60%:
          Raw: "HELLOMYNAMEISJOHN"
          → Word boundary detection (dictionary lookup)
          → Autocorrect common misspellings
          → Capitalize + punctuate
          → Formatted: "Hello, my name is John."
        IF avg confidence < 60%:
          → Skip aggressive formatting
          → Just space-separate raw letters
          → "helo my nam" (no autocorrect to avoid mangling uncertain input)

Step 4: User clicks "Submit" (or types via fallback)
        Client emits "training:submit" { question, formattedAnswer }

Step 5: Server calls OpenAI GPT-4o-mini — TWO parallel calls:

        Call A: STAR Evaluation
        → Returns JSON:
          {
            overall_score: 7,
            situation: { score: 8, feedback: "Clear context provided" },
            task: { score: 6, feedback: "Role could be more specific" },
            action: { score: 7, feedback: "Good detail on steps taken" },
            result: { score: 5, feedback: "Add measurable impact (e.g., % improvement)" },
            improvements: [
              "Add a measurable result (e.g., time saved, % improvement)",
              "Clarify your specific role vs team effort",
              "Include what you learned from the experience"
            ]
          }

        Call B: Answer Polishing
        → Returns: professionally rewritten version of the same answer
        → Input:  "i worked team project we did good"
        → Output: "I led a cross-functional team project where we
                   collaborated effectively to deliver strong results."

Step 6: Server emits "training:feedback" { starEval, polishedAnswer }
        → UI renders STAR score bars + improvements + polished version side-by-side
```

### Live Mode — Sign-to-Speech with Auto-Polish (User → Interviewer)

```
Step 1: Continuous fingerspelling (same as Training Steps 2-3)
        Letters accumulate → smart formatting → readable sentence
        Confidence % shown for each detection

Step 2: User reviews formatted text → clicks "Send"
        Client emits "live:sign-text" { text }
        Status: "Converting..."

Step 3: Server decides polish path:
        IF text.length < 20 → SKIP polish (fast path)
          Send raw text directly to ElevenLabs
        IF text.length >= 20 → POLISH (full path)
          Check cache: if same text was polished before → reuse cached result
          Otherwise: OpenAI polish → cache result
          Raw: "i have experience with project management and team lead"
          Polished: "I have extensive experience in project management and team leadership."
          Server emits "live:polished-preview" { original, polished }

Step 4: Server → ElevenLabs TTS with final text (polished or raw)
        POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream
        Returns audio chunks progressively

Step 5: Server streams audio back via "live:audio-chunk"
        Status: "Speaking..."
        Client shows polished text as subtitle while audio plays

Step 6: Client plays audio through speakers
        Interviewer hears eloquent, professional speech
        Status clears when done

KEY DEMO MOMENT: messy signed input → polished professional speech
```

### Live Mode — Quick Phrases (Direct → ElevenLabs)

```
Step 1: User clicks quick phrase button (e.g., "Thank you for the question")
Step 2: Client emits "live:quick-phrase" { text }
Step 3: Server → ElevenLabs TTS → audio back → plays immediately
        No LLM involved. Instant path.
```

### Live Mode — Speech-to-Text (Interviewer → User)

```
Step 1: Client captures mic audio
        MediaRecorder, 250ms chunks, webm/opus
        Status: "Listening..."

Step 2: Client streams chunks via "live:audio-in"

Step 3: Server pipes to Deepgram WebSocket
        wss://api.deepgram.com/v1/listen?model=nova-2&interim_results=true

Step 4: Deepgram returns interim + final transcripts

Step 5: Server relays via "live:transcript" { text, is_final }

Step 6: UI displays:
        → Interim results: faded/italic text (may change)
        → Final results: solid text (appended to conversation history)
        → Large, readable font for accessibility

Step 7: AI Suggestion (fires after each final transcript)
        Server → OpenAI GPT-4o-mini (lightweight call):
        System: "Given this interview question, what is ONE key thing
                 a strong answer should include? (max 10 words)"
        User: "{interviewer's question}"
        → Returns: "Include a measurable outcome" or "Specify your individual contribution"
        Server emits "live:suggestion" { hint }
        → UI shows as small subtle hint line below transcript
```

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Scaffolding (Hours 0–2)

- `pnpm create next-app@14 client --typescript --tailwind --eslint --src-dir --app`
- Install client deps: `socket.io-client @mediapipe/tasks-vision fingerpose react-webcam`
- Set up shadcn/ui (button, card, badge, tabs, progress)
- Create server: Express + Socket.IO + dotenv + cors
- Install server deps: `openai @deepgram/sdk elevenlabs`
- Set up pnpm workspace + `concurrently` dev script
- Create `.env.example` with `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`
- Create page structure: landing, training, live

### Phase 2: Hand Detection + Text Formatting (Hours 2–6)

- `WebcamFeed` component with canvas overlay
- Initialize MediaPipe HandLandmarker (model from Google CDN, GPU delegate)
- `requestAnimationFrame` loop: detect → draw landmarks on canvas
- Integrate fingerpose: convert landmarks → estimate ASL letter
- Build 10 ASL gesture definitions (A, B, C, D, I, L, O, V, W, Y)
- Letter stabilization: require 500ms same letter before accepting
- **Confidence indicator**: display detection confidence % + current letter
- `WordBuilder` component: accumulate letters → raw text
- **Smart text formatter** (client-side, deterministic):
  - Word boundary detection using simple dictionary (top 5000 English words)
  - Basic autocorrect (edit-distance-1 corrections)
  - Capitalize sentence starts + add periods
- Text input fallback always visible

### Phase 3: Training Mode (Hours 6–10)

- Training page with question display (10 hardcoded behavioral questions)
- `AnswerBuilder` UI: detected letter + confidence % + current word + formatted answer + text fallback
- Submit button → Socket.IO → server
- Server: **two parallel OpenAI calls**:
  - Call A: STAR evaluation → structured JSON with scores + improvements
  - Call B: Answer polishing → professionally rewritten version
- `FeedbackPanel`:
  - STAR score bars (0–10 per component)
  - 3 specific improvement bullets
  - Side-by-side: original answer vs polished version
- Error handling + loading states

### Phase 4: Live Mode (Hours 10–16)

- Split-screen layout: sign panel (left) + transcript panel (right)
- **Sign-to-Speech pipeline**:
  - Formatted text preview before sending
  - "Send" button → ElevenLabs TTS → stream audio → play through speakers
  - Status indicators: "Converting..." → "Speaking..."
- **Speech-to-Text pipeline**:
  - Mic capture (MediaRecorder, 250ms chunks)
  - → Deepgram streaming → live transcript
  - Interim results (faded) vs final results (solid)
  - Status: "Listening..."
- **Quick phrase buttons** (5 pre-built):
  - "Thank you for the question"
  - "Can you repeat that?"
  - "Let me think for a moment"
  - "Yes, that's correct"
  - "I'd like to add..."
  - Each: click → ElevenLabs TTS → audio immediately (no LLM)
- Conversation history log
- Deepgram WebSocket lifecycle: open/keepalive/close per session

### Phase 5: Polish + Demo Mode (Hours 16–20)

- **Demo Mode toggle**:
  - When ON: pre-fills answers, skips sign detection
  - Still runs full OpenAI + ElevenLabs + Deepgram pipeline
  - Seamless — indistinguishable from real session
- Fallback wiring:
  - ElevenLabs fails → fall back to OpenAI TTS
  - Deepgram fails → fall back to browser SpeechRecognition
- Loading states, error boundaries everywhere
- Style polish: large accessible text, consistent spacing, color contrast
- End-to-end testing on Chrome
- Practice scripted demo flow

### Phase 6: Buffer (Hours 20–24)

- Bug fixes from testing
- Performance optimization if needed
- README with setup instructions

---

## 6. CODE STRUCTURE

```
Hack-the-Globe/
├── pnpm-workspace.yaml
├── package.json                    # root scripts: "dev" via concurrently
├── .gitignore
├── .env.example                    # OPENAI_API_KEY, DEEPGRAM_API_KEY, ELEVENLABS_API_KEY
│
├── client/                         # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # root layout
│   │   │   ├── page.tsx            # landing: mode selection
│   │   │   ├── training/page.tsx   # training mode
│   │   │   └── live/page.tsx       # live interview mode
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui (button, card, etc.)
│   │   │   ├── camera/
│   │   │   │   ├── WebcamFeed.tsx
│   │   │   │   └── HandLandmarkRenderer.tsx
│   │   │   ├── sign-recognition/
│   │   │   │   ├── SignDetector.tsx
│   │   │   │   ├── LetterDisplay.tsx       # + confidence %
│   │   │   │   ├── WordBuilder.tsx
│   │   │   │   ├── TextFormatter.tsx       # auto-space, autocorrect, capitalize
│   │   │   │   └── TextFallbackInput.tsx
│   │   │   ├── training/
│   │   │   │   ├── QuestionCard.tsx
│   │   │   │   ├── AnswerBuilder.tsx
│   │   │   │   ├── FeedbackPanel.tsx       # STAR scores + improvements
│   │   │   │   ├── StarScoreChart.tsx
│   │   │   │   └── PolishedAnswer.tsx      # side-by-side original vs improved
│   │   │   └── live/
│   │   │       ├── SignToSpeechPanel.tsx
│   │   │       ├── SpeechToTextPanel.tsx
│   │   │       ├── QuickPhrases.tsx        # 5 pre-built phrase buttons
│   │   │       ├── StatusIndicator.tsx     # Listening/Converting/Speaking
│   │   │       ├── AudioPlayer.tsx
│   │   │       ├── TranscriptDisplay.tsx   # interim (faded) + final (solid)
│   │   │       ├── ConversationLog.tsx
│   │   │       └── DemoModeToggle.tsx      # toggle + pre-fill logic
│   │   ├── hooks/
│   │   │   ├── useMediaPipe.ts
│   │   │   ├── useFingerpose.ts
│   │   │   ├── useLetterStabilizer.ts
│   │   │   ├── useSocket.ts
│   │   │   ├── useAudioCapture.ts
│   │   │   └── useAudioPlayback.ts
│   │   ├── lib/
│   │   │   ├── socket.ts           # Socket.IO client singleton
│   │   │   ├── mediapipe.ts        # MediaPipe init config
│   │   │   ├── text-formatter.ts   # auto-space, autocorrect, capitalize, punctuate
│   │   │   ├── word-dictionary.ts  # top 5000 English words for boundary detection
│   │   │   ├── asl-gestures/       # fingerpose gesture definitions
│   │   │   │   ├── index.ts
│   │   │   │   └── letters/        # one file per letter (A-Z)
│   │   │   └── constants.ts        # thresholds, timing, quick phrases
│   │   └── types/index.ts
│   └── public/
│
└── server/                         # Express + Socket.IO backend
    └── src/
        ├── index.ts                # entry: Express + Socket.IO setup
        ├── config.ts               # env var loading
        ├── socket/
        │   ├── index.ts            # event router
        │   ├── training.handler.ts
        │   └── live.handler.ts
        ├── services/
        │   ├── openai.service.ts      # GPT-4o-mini (STAR eval + answer polish)
        │   ├── elevenlabs.service.ts  # TTS streaming
        │   ├── deepgram.service.ts    # streaming STT wrapper
        │   └── star-evaluator.ts      # STAR prompt + response parsing
        ├── prompts/
        │   ├── star-evaluation.ts     # STAR system prompt
        │   └── answer-polish.ts       # answer polishing system prompt
        └── types/index.ts
```

---

## 7. KEY CODE SNIPPETS

### Webcam + MediaPipe Hand Detection (client)

```typescript
// hooks/useMediaPipe.ts
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export function useMediaPipe() {
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);

  useEffect(() => {
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
          delegate: "GPU",
        },
        numHands: 1,
        runningMode: "VIDEO",
      });
      setHandLandmarker(landmarker);
    }
    init();
  }, []);

  const detect = useCallback((video: HTMLVideoElement, timestamp: number) => {
    if (!handLandmarker) return null;
    return handLandmarker.detectForVideo(video, timestamp);
  }, [handLandmarker]);

  return { detect, ready: !!handLandmarker };
}
```

### Fingerpose ASL Letter Classification (client)

```typescript
// lib/asl-gestures/letters/letterA.ts
import { GestureDescription, Finger, FingerCurl, FingerDirection } from "fingerpose";

const letterA = new GestureDescription("A");
letterA.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
letterA.addDirection(Finger.Thumb, FingerDirection.VerticalUp, 1.0);
for (const finger of [Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  letterA.addCurl(finger, FingerCurl.FullCurl, 1.0);
}
export default letterA;
```

### Socket.IO + Deepgram Streaming STT (server)

```typescript
// services/deepgram.service.ts
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export function createDeepgramStream(onTranscript: (text: string, isFinal: boolean) => void) {
  const client = createClient(process.env.DEEPGRAM_API_KEY!);
  const connection = client.listen.live({
    model: "nova-2", language: "en", smart_format: true,
    interim_results: true, endpointing: 300,
  });
  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const text = data.channel.alternatives[0]?.transcript;
    if (text) onTranscript(text, data.is_final);
  });
  return connection;
}
```

### ElevenLabs TTS (server)

```typescript
// services/elevenlabs.service.ts
import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

export async function textToSpeech(text: string): Promise<Buffer> {
  const audio = await client.generate({
    voice: "Rachel",           // professional, clear voice
    text,
    model_id: "eleven_turbo_v2_5",  // lowest latency model
    output_format: "mp3_44100_128",
  });
  const chunks: Buffer[] = [];
  for await (const chunk of audio) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Fallback to OpenAI TTS if ElevenLabs fails
export async function textToSpeechFallback(text: string): Promise<Buffer> {
  const openai = new OpenAI();
  const response = await openai.audio.speech.create({
    model: "tts-1", voice: "alloy", input: text, response_format: "mp3",
  });
  return Buffer.from(await response.arrayBuffer());
}
```

### STAR Evaluation + Answer Polishing (server — two parallel calls)

```typescript
// services/star-evaluator.ts
export async function evaluateAnswer(question: string, answer: string) {
  // Run STAR evaluation and answer polishing in parallel
  const [starEval, polished] = await Promise.all([
    evaluateSTAR(question, answer),
    polishAnswer(answer),
  ]);
  return { starEval, polishedAnswer: polished };
}

async function evaluateSTAR(question: string, answer: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert interview coach. Evaluate using the STAR method.
Return JSON: {
  "overall_score": number (0-10),
  "situation": { "score": number (0-10), "feedback": "one sentence" },
  "task": { "score": number (0-10), "feedback": "one sentence" },
  "action": { "score": number (0-10), "feedback": "one sentence" },
  "result": { "score": number (0-10), "feedback": "one sentence" },
  "improvements": ["specific bullet 1", "specific bullet 2", "specific bullet 3"]
}
Detect missing STAR components. Flag vague language. Suggest measurable impact.`,
      },
      { role: "user", content: `Question: ${question}\nAnswer: ${answer}` },
    ],
  });
  return JSON.parse(response.choices[0].message.content!);
}

async function polishAnswer(answer: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Rewrite this interview answer professionally. Keep the same meaning
and content but improve grammar, clarity, and professionalism. Return ONLY the improved text.`,
      },
      { role: "user", content: answer },
    ],
  });
  return response.choices[0].message.content!;
}
```

### Smart Text Formatter — confidence-gated (client — deterministic, no LLM)

```typescript
// lib/text-formatter.ts
import { DICTIONARY } from "./word-dictionary";

export function formatSignedText(raw: string, avgConfidence: number): string {
  // Low confidence → safe mode: just space-separate, no aggressive correction
  if (avgConfidence < 0.6) {
    return raw.toLowerCase().split("").join(""); // raw passthrough
  }
  // High confidence → full formatting
  const words = segmentIntoWords(raw.toLowerCase());
  if (words.length > 0) words[0] = capitalize(words[0]);
  let result = words.join(" ");
  if (result && !result.endsWith(".")) result += ".";
  return result;
}

function segmentIntoWords(text: string): string[] {
  const words: string[] = [];
  let i = 0;
  while (i < text.length) {
    let bestWord = text[i]; // fallback: single character
    let bestLen = 1;
    // Greedy: try longest dictionary match first
    for (let len = Math.min(text.length - i, 15); len >= 2; len--) {
      const candidate = text.substring(i, i + len);
      if (DICTIONARY.has(candidate)) {
        bestWord = candidate;
        bestLen = len;
        break;
      }
    }
    words.push(bestWord);
    i += bestLen;
  }
  return words;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

### Live Mode — AI Suggestion after STT (server — reuses openai.service)

```typescript
// In live.handler.ts — fires after each final Deepgram transcript
async function generateSuggestion(interviewerText: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 20,
    messages: [
      {
        role: "system",
        content: "Given this interview question, what is ONE key thing a strong answer should include? (max 10 words)",
      },
      { role: "user", content: interviewerText },
    ],
  });
  return response.choices[0].message.content!;
}

// Usage in STT handler:
// After final transcript received from Deepgram:
const hint = await generateSuggestion(finalTranscript);
socket.emit("live:suggestion", { hint }); // e.g., "Mention measurable impact"
```

### Live Mode — Smart Polish + Cache before TTS (server — reuses polishAnswer())

```typescript
// In live.handler.ts — Sign-to-Speech with conditional polish + cache
const polishCache = new Map<string, string>(); // simple in-memory cache

socket.on("live:sign-text", async ({ text }) => {
  let finalText = text;

  // Only polish longer responses (short ones go straight to TTS)
  if (text.length >= 20) {
    // Check cache first
    if (polishCache.has(text)) {
      finalText = polishCache.get(text)!;
    } else {
      finalText = await polishAnswer(text);
      polishCache.set(text, finalText); // cache for reuse
    }
    socket.emit("live:polished-preview", { original: text, polished: finalText });
  }

  // Send final text (polished or raw) to ElevenLabs
  const audio = await textToSpeech(finalText);
  socket.emit("live:audio-chunk", audio);
});
```

---

## 8. PERFORMANCE + LATENCY

| Segment | Latency | Strategy |
|---|---|---|
| Hand detection (client) | ~33ms | `requestAnimationFrame`, GPU-accelerated MediaPipe WASM |
| Letter classification | <1ms | Rule-based fingerpose, no network |
| Text formatting (client) | <5ms | Deterministic dictionary lookup, confidence-gated |
| Letter stabilization | 500ms (intentional) | Prevents flickering; tunable constant |
| Socket.IO round-trip | 10-50ms | Persistent WebSocket connection |
| Deepgram STT | 100-300ms interim | Show interim results immediately (faded) |
| AI suggestion hint | 300-800ms | Small `max_tokens: 20` call, fires async after final transcript |
| OpenAI GPT-4o-mini | 1-3s | Acceptable for async training; two parallel calls |
| Live polish (>= 20 chars) | 500ms-1s | Reuses `polishAnswer()`, cached to avoid repeat calls |
| Live send (< 20 chars) | 200-400ms | **Fast path: skip polish → straight to ElevenLabs** |
| ElevenLabs TTS | 200-400ms first chunk | `eleven_turbo_v2_5` model optimized for latency |
| **Total live (short)** | **~200-400ms** | **No polish, direct to TTS** |
| **Total live (long)** | **~1-1.5s** | **Polish + TTS combined — "Converting..." status** |
| Quick phrases | 200-400ms | Pre-built text → ElevenLabs, no LLM delay (no polish) |

**Key rules:**
- Video at 640x480 (not 1080p) — sufficient for hand detection, faster
- Audio chunks every 250ms to Deepgram (balance latency vs overhead)
- Batch text for TTS (send full sentences, not individual words)
- All CV + text formatting runs client-side — never send video frames to server
- STAR eval + answer polishing run as `Promise.all()` — parallel, not sequential

---

## 9. DEMO STRATEGY (Tech Only)

### Must work live:
1. Webcam activates, hand skeleton draws in real-time (visual hook)
2. At least 5-10 ASL letters recognized with confidence % displayed
3. Spelling a short word → smart formatting produces readable sentence
4. Training mode: submit → STAR feedback with scores + improvement bullets + polished answer
5. Live mode: interviewer speaks → Deepgram transcript + AI suggestion hint appears
6. **Live mode: messy text → auto-polish → ElevenLabs speaks eloquent version** (KEY DEMO MOMENT)
7. Quick phrase buttons work instantly

### Safe to mock/fallback:
- Full 26-letter recognition → limit to 10 reliable letters + text input fallback
- Long sentences via fingerspelling → quick phrase buttons bypass signing entirely
- Complex signing → **Demo Mode ON** pre-fills text, still runs full AI pipeline

### Avoid failure:
1. **Text input fallback always visible** — seamless switch if signing fails
2. **Pre-load everything** 5 min before demo (MediaPipe model, camera/mic permissions)
3. **Chrome only** — most reliable for MediaPipe + Web APIs
4. **Pre-record backup video** of successful run-through
5. **Demo Mode toggle** — skips sign recognition, pre-fills answers, runs full pipeline
6. **Quick phrases** as instant fallback — always work, no signing required
7. **Test on demo room WiFi** — Deepgram/ElevenLabs/OpenAI need internet
8. **API keys in `.env`** (not committed) — no env setup during demo
9. **ElevenLabs → OpenAI TTS fallback** wired in — if one TTS fails, other takes over

### Demo script (3-5 min):
1. (30s) Landing page — explain the two modes, the problem we solve
2. (60s) Training Mode:
   - Show hand tracking skeleton drawing on webcam feed
   - Spell a short word → show smart formatting output
   - Submit answer → show STAR score bars + improvement bullets
   - Show polished answer side-by-side with original
3. (90s) Live Mode:
   - Team member speaks into mic → Deepgram transcript appears live (interim → final)
   - Hit quick phrase "Thank you for the question" → ElevenLabs voice plays
   - Sign/type a messy response → auto-polish → ElevenLabs speaks polished version
   - Show AI suggestion hint after interviewer speaks
   - Show status indicators cycling: Listening → Converting → Speaking
4. (30s) Impact statement — accessibility, inclusion, future potential

---

## 10. API FLOW SUMMARY

### Training Mode
```
Text → OpenAI GPT-4o-mini → STAR feedback (structured JSON)
Text → OpenAI GPT-4o-mini → Polished answer (rewritten professionally)
(Both calls run in parallel via Promise.all)
```

### Live Mode (User → Interviewer)
```
Text → OpenAI polish → polished text → ElevenLabs TTS → professional audio output
Quick Phrase → ElevenLabs directly → audio (no LLM, instant)
```

### Live Mode (Interviewer → User)
```
Audio → Deepgram (Nova-2 streaming) → live transcript (interim + final)
      → OpenAI suggestion (async, after final) → short hint displayed
```

---

## 11. VERIFICATION

To test end-to-end:
1. `pnpm dev` starts client (port 3000) + server (port 3001)
2. Open Chrome → `localhost:3000` → grant camera + mic permissions
3. **Training Mode**:
   - See hand skeleton overlay on webcam
   - Spell letters → verify confidence % shown
   - Verify smart formatting: raw letters → readable sentence
   - Submit → verify STAR JSON: scores, improvements, polished answer
4. **Live Mode**:
   - Speak into mic → verify Deepgram interim (faded) + final (solid) transcript
   - Click quick phrase → verify ElevenLabs audio plays immediately
   - Type/sign text → preview → send → verify ElevenLabs voice output
   - Verify status indicators cycle: Listening → Converting → Speaking
5. **Demo Mode**: toggle ON → verify pre-filled answers → verify full pipeline still runs
6. **Fallbacks**: kill ElevenLabs key → verify OpenAI TTS fallback activates
7. Check browser console for errors, network tab for Socket.IO frames
