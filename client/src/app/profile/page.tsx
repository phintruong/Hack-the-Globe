"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { extractTextFromPdf } from "@/lib/parse-pdf";

interface KnowledgeGraph {
  skills: string[];
  experiences: { role: string; company: string; duration: string; highlights: string[] }[];
  education: { degree: string; institution: string; year: string }[];
  projects: { name: string; description: string; technologies: string[] }[];
  strengths: string[];
  industries: string[];
  summary: string;
}

const API = "http://localhost:3001";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [resumeText, setResumeText] = useState("");
  const [background, setBackground] = useState("");
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [authLoading, user, router]);

  // Load existing profile
  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/profile/${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setResumeText(data.resumeText || "");
        setBackground(data.background || "");
        setKnowledgeGraph(data.knowledgeGraph || null);
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [user]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await extractTextFromPdf(file);
      setResumeText(text);
      setStatus("Resume parsed successfully");
    } catch {
      setStatus("Failed to parse PDF — try pasting text instead");
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setStatus("Building your knowledge graph...");

    try {
      const res = await fetch(`${API}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          resumeText,
          background,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeGraph(data.knowledgeGraph);
        setStatus("Profile saved! Your knowledge graph is ready.");
      } else {
        setStatus("Failed to save profile");
      }
    } catch {
      setStatus("Server error — is the backend running?");
    } finally {
      setSaving(false);
    }
  }, [user, resumeText, background]);

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#023e8a]/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-[Helvetica_Neue,Helvetica,Arial,sans-serif]">
      {/* Header */}
      <header className="px-8 py-5 border-b border-[#caf0f8] flex justify-between items-center">
        <Link href="/" className="text-xl font-semibold tracking-tight text-[#0077b6]">
          UniVoice
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/training" className="nav-btn">Training</Link>
          <Link href="/live" className="nav-btn">Live</Link>
        </nav>
      </header>

      <div className="max-w-[960px] mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold text-[#03045e] mb-1">Your Profile</h1>
        <p className="text-sm text-[#023e8a]/60 mb-8">
          Upload your resume and tell us about yourself. We&rsquo;ll build a knowledge graph so the AI
          can give you personalized interview feedback.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input */}
          <div className="space-y-6">
            {/* Resume Upload */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">
                Resume (PDF)
              </label>
              <label className="flex items-center gap-3 border border-dashed border-[#ade8f4] rounded-sm px-4 py-6 cursor-pointer hover:border-[#0077b6] transition-colors">
                <svg className="w-6 h-6 text-[#0077b6] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <span className="text-sm text-[#03045e] font-medium">
                    {fileName || "Click to upload PDF"}
                  </span>
                  <p className="text-xs text-[#023e8a]/40 mt-0.5">Or paste resume text below</p>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Resume Text */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">
                Resume Text
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={8}
                placeholder="Paste your resume text here, or upload a PDF above..."
                className="w-full border border-[#caf0f8] rounded-sm px-3 py-2.5 text-sm text-[#03045e] outline-none focus:border-[#0077b6] transition-colors resize-y"
              />
            </div>

            {/* Background */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">
                Background &amp; Goals
              </label>
              <textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                rows={5}
                placeholder="Tell us about yourself: What role are you targeting? What industry? Any specific skills you want to highlight? Career goals?"
                className="w-full border border-[#caf0f8] rounded-sm px-3 py-2.5 text-sm text-[#03045e] outline-none focus:border-[#0077b6] transition-colors resize-y"
              />
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving || (!resumeText && !background)}
                className="bg-[#0077b6] hover:bg-[#023e8a] text-white font-semibold text-sm uppercase tracking-wider px-6 py-3 rounded-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Building Graph..." : "Save & Build Knowledge Graph"}
              </button>
              {status && (
                <span className="text-sm text-[#0077b6]">{status}</span>
              )}
            </div>
          </div>

          {/* Right: Knowledge Graph Visualization */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">
              Your Knowledge Graph
            </label>
            {knowledgeGraph ? (
              <div className="border border-[#caf0f8] rounded-sm p-5 space-y-5">
                {/* Summary */}
                {knowledgeGraph.summary && (
                  <div>
                    <p className="text-sm text-[#03045e] leading-relaxed">{knowledgeGraph.summary}</p>
                  </div>
                )}

                {/* Skills */}
                {knowledgeGraph.skills.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {knowledgeGraph.skills.map((s, i) => (
                        <span key={i} className="bg-[#caf0f8] text-[#023e8a] text-xs px-2.5 py-1 rounded-sm font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {knowledgeGraph.experiences.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">Experience</h3>
                    <div className="space-y-3">
                      {knowledgeGraph.experiences.map((exp, i) => (
                        <div key={i} className="border-l-2 border-[#0077b6] pl-3">
                          <p className="text-sm font-semibold text-[#03045e]">{exp.role}</p>
                          <p className="text-xs text-[#023e8a]/60">{exp.company} &middot; {exp.duration}</p>
                          {exp.highlights.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {exp.highlights.map((h, j) => (
                                <li key={j} className="text-xs text-[#03045e]/70">&bull; {h}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {knowledgeGraph.education.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">Education</h3>
                    <div className="space-y-2">
                      {knowledgeGraph.education.map((edu, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium text-[#03045e]">{edu.degree}</p>
                          <p className="text-xs text-[#023e8a]/60">{edu.institution} &middot; {edu.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {knowledgeGraph.projects.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">Projects</h3>
                    <div className="space-y-2">
                      {knowledgeGraph.projects.map((proj, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium text-[#03045e]">{proj.name}</p>
                          <p className="text-xs text-[#03045e]/70">{proj.description}</p>
                          {proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {proj.technologies.map((t, j) => (
                                <span key={j} className="bg-[#ade8f4] text-[#023e8a] text-[10px] px-1.5 py-0.5 rounded-sm">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {knowledgeGraph.strengths.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">Strengths</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {knowledgeGraph.strengths.map((s, i) => (
                        <span key={i} className="bg-[#0077b6] text-white text-xs px-2.5 py-1 rounded-sm font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Industries */}
                {knowledgeGraph.industries.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-2">Industries</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {knowledgeGraph.industries.map((ind, i) => (
                        <span key={i} className="border border-[#0077b6] text-[#0077b6] text-xs px-2.5 py-1 rounded-sm">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-[#caf0f8] rounded-sm p-8 flex flex-col items-center justify-center text-center">
                <svg className="w-12 h-12 text-[#ade8f4] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm text-[#023e8a]/40">
                  Upload your resume and save to see your knowledge graph here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
