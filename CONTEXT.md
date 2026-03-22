# VIBE — Product Context

## Two-Product Suite

The core innovation across both products is the same: **the user owns their story, the AI just connects it.**

---

### Product 1 — SignPrep (Individual Prep Tool)

For deaf candidates to practice beforehand.

**Flow:**
1. Resume input (PDF upload)
2. AI generates A/B/C/D experience tiles from the resume
3. Candidate picks an experience
4. **STAR puzzle builder** — candidate drags their story pieces into Situation / Task / Action / Result slots
5. AI stitches filler words (shown in purple) to create a polished, natural-sounding answer
6. Hit "Generate" to see the full stitched answer
7. Feedback + score on the response

---

### Product 2 — AccessInterview (Corporate Add-On)

A tool corporations deploy during a live interview. Same puzzle mechanic, but answers are delivered to the interviewer in real time.

**Candidate Screen:**
1. Interviewer's question appears as text at the top (so the deaf candidate can read it)
2. Candidate taps A/B/C/D to pick their experience
3. Drags story pieces into STAR slots
4. Hits "Generate" — AI stitches filler words (purple)
5. Hits **"Send to interviewer"**

**Interviewer Screen:**
1. The candidate's full stitched answer pops into the chat thread as a message bubble (like a normal chat message)
2. AI voice pill appears at the bottom — the answer is spoken aloud via TTS
3. Small **"Accessibility mode on"** badge so the interviewer understands the format

**Demo toggle:** After going through the candidate screen all the way to "Send to interviewer," the view automatically switches to the interviewer screen to show the full flow.

---

## What We Have vs What We Need

### Already Built
- Landing page, auth (demo user), training dashboard, live interview page
- Resume PDF upload + parsing
- A/B/C/D option selector (AI generates options from resume, select via click or ASL gesture)
- ASL hand detection (MediaPipe + Fingerpose, 16 letters)
- Speech-to-text (Deepgram) — interviewer audio transcribed live
- Text-to-speech (ElevenLabs) — candidate answers spoken aloud
- STAR feedback scoring on training answers
- Quick phrases, conversation log, word builder
- Socket.IO real-time communication
- Multi-language support (EN/ES/FR/ZH)

### Missing — SignPrep (Product 1)
- [ ] **STAR puzzle builder UI** — drag-and-drop interface where candidate places story fragments into S/T/A/R slots (this is the core mechanic, not just a text box)
- [ ] **AI filler word stitching** — after puzzle is assembled, AI generates connecting/filler words (displayed in purple) to make the answer flow naturally
- [ ] **"Generate" button** — triggers the stitch and shows the full polished answer with filler words highlighted
- [ ] **Story fragment generation** — AI should break resume experiences into draggable story pieces, not just A/B/C/D text blobs

### Missing — AccessInterview (Product 2)
- [ ] **Interviewer view** — a separate screen/panel showing the chat thread where candidate answers appear as message bubbles
- [ ] **"Send to interviewer" button** — candidate reviews stitched answer, then explicitly sends it
- [ ] **AI voice pill on interviewer side** — visual indicator that TTS is playing the answer
- [ ] **"Accessibility mode on" badge** — small indicator on interviewer screen
- [ ] **Candidate/Interviewer toggle** — for demo purposes, auto-switch to interviewer view after sending
- [ ] **STAR puzzle mechanic in live mode** — same drag-and-drop puzzle from SignPrep, but embedded in the live interview flow
- [ ] **Question display at top of candidate screen** — interviewer's transcribed question shown prominently so candidate can read it before building their answer

### Nice-to-Haves (Not Blocking)
- [ ] Real Supabase auth (currently hardcoded demo user)
- [ ] Anthropic API integration for genuinely AI-generated tiles + filler words from real resume
- [ ] Pitch deck
- [ ] E2E tests
