import Link from "next/link";
import Image from "next/image";
import DitherCanvas from "@/components/DitherCanvas";

export default function Home() {
  return (
    <div className="font-[Helvetica_Neue,Helvetica,Arial,sans-serif] leading-[1.4] overflow-x-hidden bg-white text-[#03045e]">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full px-8 py-5 z-[100] flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-[#caf0f8]">
        <div className="text-xl font-semibold tracking-tight text-[#0077b6]">
          UniVoice
        </div>
        <nav className="flex items-center gap-3 max-md:hidden">
          <div className="relative group">
            <button className="nav-btn">Platform</button>
            <div className="dropdown-menu">
              <Link href="/training" className="dropdown-item">Training Mode</Link>
              <Link href="/live" className="dropdown-item">Live Interview</Link>
            </div>
          </div>
          <div className="relative group">
            <button className="nav-btn">Pricing</button>
            <div className="dropdown-menu">
              <a href="#" className="dropdown-item">Personal</a>
              <a href="#" className="dropdown-item">Enterprise</a>
              <a href="#" className="dropdown-item">Non-Profit</a>
            </div>
          </div>
          <a href="#about" className="nav-btn">Learn More</a>
          <Link href="/training" className="nav-btn-primary">Login</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <DitherCanvas />
        <div className="max-w-[1200px] mx-auto px-8 relative z-[2] w-full">
          <span className="inline-block bg-[#0077b6] text-white text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-sm mb-8">
            100% ADA &amp; WCAG Compliant
          </span>
          <h1 className="text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] mb-6 font-bold tracking-tight text-[#03045e]">
            Prepare with{" "}
            <br className="max-md:hidden" />
            UniVoice{" "}
            <br />
            Interview freely
          </h1>
          <p className="text-lg max-w-[600px] text-[#023e8a]/60 mb-10 leading-relaxed">
            AI-powered interview platform for deaf and hard-of-hearing
            candidates, real-time communication with seamless live
            interpretation for interviewers.
          </p>
          <Link
            href="/training"
            className="inline-flex items-center gap-2 bg-[#0077b6] text-white font-semibold text-sm uppercase tracking-wider px-6 py-3 rounded-sm hover:bg-[#023e8a] transition-colors"
          >
            Start Learning
          </Link>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-12 border-t border-[#caf0f8] relative z-[5] bg-white">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <Image
                src="/images/sign-language-asl.png"
                alt="ASL icon"
                width={48}
                height={48}
                className="opacity-80"
              />
              <div>
                <p className="text-lg font-semibold text-[#03045e]">Real-time ASL Translation</p>
                <p className="text-sm text-[#023e8a]/50">With zero latency</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-[#0077b6]">50K+</p>
              <p className="text-sm text-[#023e8a]/60 mt-1">Deaf candidates supported</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-[#0077b6]">95%</p>
              <p className="text-sm text-[#023e8a]/60 mt-1">Interview success rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 border-t border-[#caf0f8] relative z-[5] bg-white">
        <div className="max-w-[1200px] mx-auto px-8 space-y-16">
          {/* Sarah */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full overflow-hidden shrink-0 border-2 border-[#ade8f4]">
              <Image
                src="/images/sarah.jpeg"
                alt="Sarah"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1">
              <blockquote className="text-lg italic text-[#0077b6] leading-relaxed mb-4">
                &ldquo;It&rsquo;s really hard to find interview prep that works for
                someone like me. UniVoice made it feel natural, I could actually
                practice in a way that fits how I communicate, and that gave me
                so much more confidence.&rdquo;
              </blockquote>
              <p className="text-sm text-[#023e8a]/50">&mdash; Sarah, IT Helpdesk</p>
              <div className="flex gap-3 mt-4">
                <a href="#" className="link-small">Read White Paper</a>
                <a href="#" className="link-small-accent">Read the Story</a>
              </div>
            </div>
          </div>

          {/* Bobby */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full overflow-hidden shrink-0 border-2 border-[#ade8f4]">
              <Image
                src="/images/bobby.avif"
                alt="Bobby"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1">
              <blockquote className="text-lg italic text-[#0077b6] leading-relaxed mb-4">
                &ldquo;The live interpretation was seamless, and we could focus on
                the candidate, not the barriers. UniVoice streamlined our hiring
                process and making it more inclusive.&rdquo;
              </blockquote>
              <p className="text-sm text-[#023e8a]/50">&mdash; Bobby, Hiring Manager</p>
              <div className="flex gap-3 mt-4">
                <a href="#" className="link-small">Read White Paper</a>
                <a href="#" className="link-small-accent">Read the Story</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-20 border-t border-[#caf0f8] relative z-[5] bg-white">
        <div className="max-w-[1200px] mx-auto px-8">
          <p className="inline-block bg-[#0077b6] text-white text-sm font-semibold px-4 py-1.5 rounded-sm mb-10">
            We have partnered with more than 50 companies worldwide
          </p>
          <div className="flex flex-wrap items-center justify-between gap-8 text-[#03045e]/40">
            <span className="text-2xl font-bold tracking-tight">KPMG</span>
            <span className="text-2xl font-bold italic">Disney</span>
            <span className="text-2xl font-bold">amazon</span>
            <span className="text-2xl font-bold">GE</span>
            <span className="text-2xl font-bold">Honda</span>
            <span className="text-2xl font-bold tracking-tight">UNDP</span>
            <span className="text-2xl font-bold">IBM</span>
          </div>
        </div>
      </section>

      {/* Will UniVoice work for you? */}
      <section id="about" className="py-24 border-t border-[#caf0f8] relative z-[5] bg-white">
        <div className="max-w-[1200px] mx-auto px-8 text-center">
          <h2 className="text-3xl font-bold mb-6 text-[#03045e]">Will UniVoice work for you?</h2>
          <p className="inline-block bg-[#caf0f8] text-[#03045e] text-sm leading-relaxed px-6 py-4 rounded-sm max-w-[700px]">
            Short answer: yes. Whether you&rsquo;re a deaf or hard-of-hearing
            candidate preparing for an upcoming interview, or an organization
            looking to make hiring more accessible, UniVoice gives you the
            tools, practice, and real-time support to make every interview
            seamless.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-[#caf0f8] text-sm bg-[#03045e] text-white">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 flex flex-col gap-2">
              <h3 className="text-xl font-semibold text-[#48cae4] mb-1">
                UniVoice
              </h3>
              <p className="text-white/50">
                Empowering Every Voice in Hiring
              </p>
            </div>
            <div className="md:col-span-4 flex flex-col gap-2">
              <div className="text-white/50 mb-3 text-xs uppercase tracking-wider font-semibold">
                Get in Touch
              </div>
              <a href="#" className="text-white/70 hover:text-[#48cae4] transition-colors">
                For Individuals
              </a>
              <a href="#" className="text-white/70 hover:text-[#48cae4] transition-colors">
                For Companies
              </a>
              <a href="#" className="text-white/70 hover:text-[#48cae4] transition-colors">
                For Government Agencies
              </a>
            </div>
            <div className="md:col-span-4 flex flex-col gap-2">
              <div className="text-white/50 mb-3 text-xs uppercase tracking-wider font-semibold">
                Company
              </div>
              <a href="#" className="text-white/70 hover:text-[#48cae4] transition-colors">
                About
              </a>
              <a href="#" className="text-white/70 hover:text-[#48cae4] transition-colors">
                Careers
              </a>
              <a href="#" className="text-white/70 hover:text-[#48cae4] transition-colors">
                Legal
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
