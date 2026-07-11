"use client";

import { useRef, useState } from "react";
import type { BrandVoice } from "@/lib/types";

type MultiKey = "voice_keywords" | "content_style" | "cta_style" | "audience_feelings";
type TextKey =
  | "words_to_use"
  | "words_to_avoid"
  | "topics"
  | "cta_examples"
  | "persona_note"
  | "target_audience"
  | "color_theme";
type SingleKey = "caption_length_pref" | "script_length_pref";

type Step =
  | { key: MultiKey; type: "multi"; question: string; hint: string; options: string[] }
  | { key: SingleKey; type: "single"; question: string; hint: string; options: string[] }
  | { key: TextKey; type: "text"; question: string; hint: string; placeholder: string };

// Every option list is capped at 10 and kept generic — specific words/phrases
// belong in the free-text steps below, not baked into fixed choices.
const STEPS: Step[] = [
  {
    key: "voice_keywords",
    type: "multi",
    question: "Which words best describe your voice?",
    hint: "Pick as many as fit — number to toggle.",
    options: ["Calm", "Confident", "Friendly", "Professional", "Bold", "Playful", "Warm", "Direct", "Witty", "Authoritative"],
  },
  {
    key: "content_style",
    type: "multi",
    question: "What content style fits you best?",
    hint: "Pick as many as fit.",
    options: ["Story-led", "Educational", "Conversational", "Punchy", "Inspirational", "Straightforward", "Humorous", "Empathetic", "Data-driven", "Casual"],
  },
  {
    key: "words_to_use",
    type: "text",
    question: "Any specific words or phrases you like to use?",
    hint: "Comma-separated. Leave blank to skip.",
    placeholder: "e.g. book a call, limited spots, this week only",
  },
  {
    key: "words_to_avoid",
    type: "text",
    question: "Any words or phrases you want to avoid?",
    hint: "Comma-separated. Leave blank to skip.",
    placeholder: "e.g. guaranteed, act now, hustle",
  },
  {
    key: "caption_length_pref",
    type: "single",
    question: "How long should your captions be?",
    hint: "Pick one.",
    options: ["Short and punchy", "Medium", "Medium to long", "Long and detailed"],
  },
  {
    key: "script_length_pref",
    type: "single",
    question: "How long should your short-form video scripts be?",
    hint: "Pick one.",
    options: ["15-30 seconds", "30-90 seconds", "2-4 minute storytelling", "I don't make videos"],
  },
  {
    key: "cta_style",
    type: "multi",
    question: "How do you like to invite action?",
    hint: "Pick as many as fit.",
    options: ["Soft invitation", "Direct ask", "Question-based", "Urgency-driven", "Social proof", "Limited-time offer", "Comment prompt", "Link click"],
  },
  {
    key: "cta_examples",
    type: "text",
    question: "Give 1-3 example CTAs you actually use",
    hint: "One per line. Leave blank to skip.",
    placeholder: "DM me to get started.",
  },
  {
    key: "topics",
    type: "text",
    question: "What topics or stories do you usually post about?",
    hint: "Comma-separated. Leave blank to skip.",
    placeholder: "e.g. customer wins, behind the scenes, industry tips",
  },
  {
    key: "persona_note",
    type: "text",
    question: "Describe your persona in one sentence",
    hint: "How should you come across? Leave blank to skip.",
    placeholder: "e.g. A friendly local expert who keeps things simple.",
  },
  {
    key: "audience_feelings",
    type: "multi",
    question: "How should your audience feel after reading your posts?",
    hint: "Pick as many as fit.",
    options: ["Understood", "Excited", "Confident", "Curious", "Reassured", "Inspired", "Informed", "Motivated", "Relieved", "Empowered"],
  },
  {
    key: "target_audience",
    type: "text",
    question: "Who is your target audience?",
    hint: "Age, location, life stage, situation — this also steers who appears in generated images. Leave blank to skip.",
    placeholder: "e.g. Singaporean and Malaysian, age 45-60, sole breadwinner with dependents",
  },
  {
    key: "color_theme",
    type: "text",
    question: "What color theme or visual mood fits your brand?",
    hint: "Used to guide generated images. Leave blank to skip.",
    placeholder: "e.g. gold and black, mature, not funky",
  },
];

type Answers = Record<string, string[] | string>;

export function BrandVoiceWizard({
  onComplete,
  onClose,
}: {
  onComplete: (bv: BrandVoice) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "questions" | "upload">("choose");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadText, setUploadText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function toggleOption(key: MultiKey, option: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      return { ...prev, [key]: next };
    });
  }

  function selectSingle(key: SingleKey, option: string) {
    setAnswers((prev) => ({ ...prev, [key]: option }));
  }

  function setText(key: TextKey, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    if (isLast) {
      void handleSave();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const splitList = (key: TextKey) =>
      (typeof answers[key] === "string" ? (answers[key] as string) : "")
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

    const payload = {
      voice_keywords: answers.voice_keywords ?? [],
      content_style: answers.content_style ?? [],
      words_to_use: splitList("words_to_use"),
      words_to_avoid: splitList("words_to_avoid"),
      caption_length_pref: answers.caption_length_pref ?? null,
      script_length_pref: answers.script_length_pref ?? null,
      cta_style: answers.cta_style ?? [],
      cta_examples: splitList("cta_examples"),
      topics: splitList("topics"),
      persona_note: typeof answers.persona_note === "string" ? answers.persona_note : null,
      audience_feelings: answers.audience_feelings ?? [],
      target_audience: typeof answers.target_audience === "string" ? answers.target_audience : null,
      color_theme: typeof answers.color_theme === "string" ? answers.color_theme : null,
    };

    try {
      const res = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Could not save your brand voice");
        return;
      }
      onComplete(data.brandVoice);
    } catch {
      setError("Could not save your brand voice — check your connection");
    } finally {
      setSaving(false);
    }
  }

  function handleFilePicked(file: File) {
    const reader = new FileReader();
    reader.onload = () => setUploadText(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  }

  async function handleImport() {
    const text = uploadText.trim();
    if (!text) {
      setError("Paste some text or choose a file first");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-voice/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Could not read that document");
        return;
      }
      onComplete(data.brandVoice);
    } catch {
      setError("Could not read that document — check your connection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        {mode === "choose" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Set up your brand voice</h3>
              <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-600">
                Close
              </button>
            </div>
            <p className="mb-4 text-sm text-neutral-500">How would you like to do this?</p>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setMode("questions")}
                  className="flex w-full items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                    1
                  </span>
                  Answer a few quick questions
                </button>
              </li>
              <li>
                <button
                  onClick={() => setMode("upload")}
                  className="flex w-full items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                    2
                  </span>
                  Upload a brand voice document
                </button>
              </li>
            </ul>
          </>
        )}

        {mode === "upload" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Upload your brand voice</h3>
              <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-600">
                Close
              </button>
            </div>
            <p className="mb-3 text-sm text-neutral-500">
              Upload a .md or .txt file (or paste the text) — any notes on your tone, words you use, CTA style, etc. We'll read it and fill in your profile.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,text/plain,text/markdown"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFilePicked(file);
              }}
              className="mb-3 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-50"
            />
            <textarea
              rows={8}
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              placeholder="Or paste your brand voice notes here…"
              className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
            />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => {
                  setMode("choose");
                  setError(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={saving || !uploadText.trim()}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Reading…" : "Import"}
              </button>
            </div>
          </>
        )}

        {mode === "questions" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Brand voice · question {stepIndex + 1} of {STEPS.length}
              </p>
              <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-600">
                Close
              </button>
            </div>

            <h3 className="text-lg font-semibold text-neutral-900">{step.question}</h3>
            <p className="mt-1 text-sm text-neutral-500">{step.hint}</p>

            <div className="mt-4">
              {step.type === "multi" && (
                <ul className="space-y-2">
                  {step.options.map((option, i) => {
                    const selected = Array.isArray(answers[step.key]) && (answers[step.key] as string[]).includes(option);
                    return (
                      <li key={option}>
                        <button
                          onClick={() => toggleOption(step.key, option)}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                            selected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              selected ? "bg-white text-neutral-900" : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          {option}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {step.type === "single" && (
                <ul className="space-y-2">
                  {step.options.map((option, i) => {
                    const selected = answers[step.key] === option;
                    return (
                      <li key={option}>
                        <button
                          onClick={() => selectSingle(step.key, option)}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                            selected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              selected ? "bg-white text-neutral-900" : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          {option}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {step.type === "text" && (
                <textarea
                  rows={3}
                  value={typeof answers[step.key] === "string" ? (answers[step.key] as string) : ""}
                  onChange={(e) => setText(step.key, e.target.value)}
                  placeholder={step.placeholder}
                  className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => (stepIndex === 0 ? setMode("choose") : goBack())}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
              >
                Back
              </button>
              <button
                onClick={goNext}
                disabled={saving}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {isLast ? (saving ? "Saving…" : "Save brand voice") : "Next"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
