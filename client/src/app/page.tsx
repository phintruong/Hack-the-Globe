import Link from "next/link";
import DitherCanvas from "@/components/DitherCanvas";

export default function Home() {
  return (
    <div className="font-[Helvetica_Neue,Helvetica,Arial,sans-serif] leading-[1.4] overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-8 z-[100] flex justify-between items-center">
        <div className="text-[2rem] font-normal tracking-[-0.04em] text-[var(--landing-text)]">
          SignSpeak
        </div>
        <nav className="flex gap-4 max-md:hidden">
          <Link href="/training" className="btn-pill">
            Training
          </Link>
          <Link href="/live" className="btn-pill">
            Live Mode
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-[var(--landing-bg)]">
        <DitherCanvas />
        <div className="max-w-[1400px] mx-auto px-8 relative z-[2] w-full">
          <span className="landing-label">AI Interview Platform</span>
          <h1 className="text-[clamp(4rem,12vw,11rem)] leading-[0.9] mb-8 text-[var(--landing-text)] font-normal tracking-[-0.02em]">
            SIGN
            <br />
            SPEAK
          </h1>
          <p className="text-2xl max-w-[600px] text-[var(--landing-muted)] mb-12 font-light">
            Breaking communication barriers in interviews. AI-powered
            sign language recognition with real-time speech synthesis
            for deaf and hard-of-hearing candidates.
          </p>
          <Link href="/training" className="link-small">
            START TRAINING &#8853;
          </Link>
        </div>
      </section>

      {/* Feature Strip */}
      <section className="py-16 bg-[var(--landing-bg)] relative z-[5] border-t border-[var(--landing-border)]">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="flex-1 pr-8">
              <span className="landing-label">Recognition</span>
              <p className="text-xl leading-[1.3] text-[var(--landing-text)]">
                Client-side hand tracking at 30fps with zero server latency
                using MediaPipe.
              </p>
            </div>
            <div className="flex-1 pr-8">
              <span className="landing-label">Privacy</span>
              <p className="text-xl leading-[1.3] text-[var(--landing-text)]">
                All video processing stays on-device. No camera data ever
                leaves your browser.
              </p>
            </div>
            <div className="flex-1 text-right">
              <span className="landing-label">ASL Letters</span>
              <p className="text-xl leading-[1.3] text-[var(--landing-text)]">
                A, B, C, D, I, L, O, V, W, Y
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Big Text Section */}
      <section className="py-32 bg-white relative z-[5] border-t border-[var(--landing-border)]">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-3">
              <span className="landing-label">How It Works</span>
            </div>
            <div className="md:col-span-8 md:col-start-5 text-[2.5rem] max-md:text-2xl leading-[1.2] font-normal text-[var(--landing-text)]">
              Fingerspell into your webcam and watch your signs{" "}
              <span className="highlight">
                transform into natural speech
              </span>{" "}
              in real time. Practice interviews with{" "}
              <span className="highlight">STAR-method feedback</span> from AI,
              or go live with{" "}
              <span className="highlight">bidirectional communication</span>{" "}
              — sign-to-speech and speech-to-text working together.
              <br />
              <br />
              <Link href="/live" className="link-small mt-4">
                TRY LIVE MODE &#8853;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Section — Mode Selection */}
      <section className="h-[80vh] relative border-t border-b border-[var(--landing-border)] flex items-center justify-center overflow-hidden bg-[#ececec]">
        <div className="flex gap-16 max-md:flex-col max-md:gap-8">
          <Link href="/training" className="circle-trigger">
            Training
            <br />
            Mode
          </Link>
          <Link href="/live" className="circle-trigger">
            Live
            <br />
            Interview
          </Link>
        </div>
        <div className="absolute bottom-8 left-8">
          <span className="landing-label">Select Mode</span>
        </div>
        <div className="absolute bottom-8 right-8">
          <span className="text-[0.7rem] uppercase tracking-wider text-[var(--landing-muted)]">
            Chrome recommended
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 bg-[var(--landing-bg)] text-[0.8rem] border-t border-[var(--landing-border)]">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-6 flex flex-col gap-2">
              <h3 className="mb-4 text-[var(--landing-text)]">
                SignSpeak
              </h3>
              <p className="text-[var(--landing-muted)] max-w-[300px]">
                AI-powered interview platform for deaf and hard-of-hearing
                candidates. Built for Hack the Globe.
              </p>
            </div>
            <div className="md:col-span-3 flex flex-col gap-2">
              <div className="text-[var(--landing-muted)] mb-4 text-[0.7rem] uppercase">
                Platform
              </div>
              <Link
                href="/training"
                className="text-[var(--landing-text)] no-underline hover:text-[var(--landing-muted)] transition-opacity"
              >
                Training Mode
              </Link>
              <Link
                href="/live"
                className="text-[var(--landing-text)] no-underline hover:text-[var(--landing-muted)] transition-opacity"
              >
                Live Interview
              </Link>
            </div>
            <div className="md:col-span-3 flex flex-col gap-2">
              <div className="text-[var(--landing-muted)] mb-4 text-[0.7rem] uppercase">
                Technology
              </div>
              <span className="text-[var(--landing-text)]">MediaPipe</span>
              <span className="text-[var(--landing-text)]">Deepgram STT</span>
              <span className="text-[var(--landing-text)]">ElevenLabs TTS</span>
            </div>
          </div>
          <div className="border-t border-[var(--landing-border)] mt-16 pt-4 flex justify-between text-[var(--landing-muted)] text-[0.7rem]">
            <span>SIGNSPEAK &mdash; HACK THE GLOBE 2025</span>
            <span>ACCESSIBILITY FIRST</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
