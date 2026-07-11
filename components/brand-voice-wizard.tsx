"use client";

import { useState } from "react";
import type { BrandVoice } from "@/lib/types";

type MultiKey = "voice_keywords" | "content_style" | "cta_style" | "audience_feelings";
type TextKey =
  | "words_to_use"
  | "words_to_avoid"
  | "topics"
  | "cta_examples"
  | "persona_note";
type SingleKey = "caption_length_pref" | "script_length_pref";

type Step =
  | { key: MultiKey; type: "multi"; question: string; hint: string; options: string[] }
  | { key: SingleKey; type: "single"; question: string; hint: string; options: string[] }
  | { key: TextKey; type: "text"; question: string; hint: string; placeholder: string };

const STEPS: Step[] = [
  {
    key: "voice_keywords",
    type: "multi",
    question: "Which words best describe your voice?",
    hint: "Pick as many as fit — number to toggle.",
    options: [
      "Calm", "Wise", "Encouraging", "Logical", "Grounded", "Warm", "Story-led",
      "Trustworthy", "Reflective", "Mentor-like", "Experienced", "Non-hype",
      "Protective", "Family-oriented",
    ],
  },
  {
    key: "content_style",
    type: "multi",
    question: "What content style fits you best?",
    hint: "Pick as many as fit.",
    options: [
      "Story-led", "Emotional but grounded", "Educational", "Reflective", "Conversational",
      "Real-life observations", "Simple explanations", "Calm authority",
      "Social-media-friendly", "Scroll-stopping hooks", "Easy to understand",
    ],
  },
  {
    key: "words_to_use",
    type: "text",
    question: "Any specific words or phrases you like to use?",
    hint: "Comma-separated. Leave blank to skip.",
    placeholder: "e.g. recurring income, protect your family, build slowly",
  },
  {
    key: "words_to_avoid",
    type: "text",
    question: "Any words or phrases you want to avoid?",
    hint: "Comma-separated. Leave blank to skip.",
    placeholder: "e.g. get rich quick, hustle culture, easy money",
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
    options: [
      "Soft invitation", "DM keyword", "Reflection questions", "Calm curiosity",
      "Gentle call-to-action", "Consultation invitation", "Comment prompts", "Direct and urgent",
    ],
  },
  {
    key: "cta_examples",
    type: "text",
    question: "Give 1-3 example CTAs you actually use",
    hint: "One per line. Leave blank to skip.",
    placeholder: "DM me if you want to change your life.",
  },
  {
    key: "topics",
    type: "text",
    question: "What topics or stories do you usually post about?",
    hint: "Comma-separated. Leave blank to skip.",
    placeholder: "e.g. job insecurity, family responsibility, rising cost of living",
  },
  {
    key: "persona_note",
    type: "text",
    question: "Describe your persona in one sentence",
    hint: "How should you come across? Leave blank to skip.",
    placeholder: "e.g. A calm older mentor who has gone through difficult seasons.",
  },
  {
    key: "audience_feelings",
    type: "multi",
    question: "How should your audience feel after reading your posts?",
    hint: "Pick as many as fit.",
    options: [
      "Understood", "Not judged", "Emotionally safe", "Hopeful", "Curious",
      "Reflective", "Excited", "Motivated", "Informed", "Confident",
    ],
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
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
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
            onClick={goBack}
            disabled={stepIndex === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
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
      </div>
    </div>
  );
}
