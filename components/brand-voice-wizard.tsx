"use client";

import { useRef, useState } from "react";
import type { BrandVoice } from "@/lib/types";
import { getKeyStepStatus } from "@/lib/copy-playbook";

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
    hint: "Pick as many as fit.",
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

function stepByKey(key: TextKey) {
  return STEPS.find((s) => s.key === key) as Extract<Step, { type: "text" }>;
}

type Answers = Record<string, string[] | string>;

function brandVoiceToAnswers(bv: BrandVoice): Answers {
  return {
    voice_keywords: bv.voice_keywords,
    content_style: bv.content_style,
    words_to_use: bv.words_to_use.join(", "),
    words_to_avoid: bv.words_to_avoid.join(", "),
    caption_length_pref: bv.caption_length_pref ?? "",
    script_length_pref: bv.script_length_pref ?? "",
    cta_style: bv.cta_style,
    cta_examples: bv.cta_examples.join("\n"),
    topics: bv.topics.join(", "),
    persona_note: bv.persona_note ?? "",
    audience_feelings: bv.audience_feelings,
    target_audience: bv.target_audience ?? "",
    color_theme: bv.color_theme ?? "",
  };
}

export function BrandVoiceWizard({
  existingBrandVoice,
  onComplete,
  onClose,
}: {
  existingBrandVoice?: BrandVoice | null;
  onComplete: (bv: BrandVoice) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "questions" | "upload" | "edit">("choose");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadText, setUploadText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const missingKeySteps = getKeyStepStatus(existingBrandVoice).filter((s) => !s.filled);
  const liveKeySteps = getKeyStepStatus(answers);

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

  function openEdit() {
    setAnswers(existingBrandVoice ? brandVoiceToAnswers(existingBrandVoice) : {});
    setError(null);
    setMode("edit");
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
      <div className={`w-full rounded-xl bg-white p-6 shadow-lg ${mode === "edit" ? "max-w-2xl" : "max-w-lg"}`}>
        {mode === "choose" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                {existingBrandVoice ? "Edit your brand voice" : "Set up your brand voice"}
              </h3>
              <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-600">
                Close
              </button>
            </div>
            <p className="mb-4 text-sm text-neutral-500">How would you like to do this?</p>
            <ul className="space-y-2">
              {existingBrandVoice && (
                <li>
                  <button
                    onClick={openEdit}
                    className="flex w-full items-start gap-3 rounded-lg border border-neutral-300 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                      1
                    </span>
                    <span>
                      <span className="block">Edit your current answers</span>
                      {missingKeySteps.length > 0 ? (
                        <span className="mt-0.5 block text-xs text-amber-600">
                          {missingKeySteps.length} key input{missingKeySteps.length > 1 ? "s" : ""} missing:{" "}
                          {missingKeySteps.map((s) => s.label).join(", ")}
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-xs text-emerald-600">All key inputs set</span>
                      )}
                    </span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    setAnswers({});
                    setStepIndex(0);
                    setMode("questions");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                    {existingBrandVoice ? 2 : 1}
                  </span>
                  Start over with a few quick questions
                </button>
              </li>
              <li>
                <button
                  onClick={() => setMode("upload")}
                  className="flex w-full items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                    {existingBrandVoice ? 3 : 2}
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
                <OptionToggleList options={step.options} selected={answers[step.key]} onToggle={(o) => toggleOption(step.key, o)} />
              )}
              {step.type === "single" && (
                <OptionSingleList options={step.options} selected={answers[step.key]} onSelect={(o) => selectSingle(step.key, o)} />
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

        {mode === "edit" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Edit your brand voice</h3>
              <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-600">
                Close
              </button>
            </div>

            <div className="mb-5 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Key inputs from the Copy Playbook
              </p>
              <ul className="space-y-1">
                {liveKeySteps.map((s) => (
                  <li key={s.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${s.filled ? "bg-emerald-500" : "bg-amber-500"}`}
                    />
                    <span className={s.filled ? "text-neutral-500" : "text-neutral-700"}>
                      <span className="font-medium">{s.label}</span> — {s.description}
                      {!s.filled && <span className="ml-1 text-amber-600">(not set)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="max-h-[55vh] space-y-6 overflow-y-auto pr-1">
              <EditSection title="Reader — who this is for">
                <FieldLabel text="Who is your target audience?" />
                <textarea
                  rows={2}
                  value={typeof answers.target_audience === "string" ? answers.target_audience : ""}
                  onChange={(e) => setText("target_audience", e.target.value)}
                  placeholder={stepByKey("target_audience").placeholder}
                  className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
              </EditSection>

              <EditSection title="Tension — what they want or fear">
                <FieldLabel text="How should your audience feel after reading your posts?" />
                <OptionToggleList
                  options={(STEPS.find((s) => s.key === "audience_feelings") as Extract<Step, { type: "multi" }>).options}
                  selected={answers.audience_feelings}
                  onToggle={(o) => toggleOption("audience_feelings", o)}
                />
              </EditSection>

              <EditSection title="Proof — the outcome you deliver">
                <FieldLabel text="Describe your persona in one sentence" />
                <textarea
                  rows={2}
                  value={typeof answers.persona_note === "string" ? answers.persona_note : ""}
                  onChange={(e) => setText("persona_note", e.target.value)}
                  placeholder={stepByKey("persona_note").placeholder}
                  className="mb-3 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
                <FieldLabel text="What topics or stories do you usually post about?" />
                <textarea
                  rows={2}
                  value={typeof answers.topics === "string" ? answers.topics : ""}
                  onChange={(e) => setText("topics", e.target.value)}
                  placeholder={stepByKey("topics").placeholder}
                  className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
              </EditSection>

              <EditSection title="The Ask — how you invite contact">
                <FieldLabel text="How do you like to invite action?" />
                <OptionToggleList
                  options={(STEPS.find((s) => s.key === "cta_style") as Extract<Step, { type: "multi" }>).options}
                  selected={answers.cta_style}
                  onToggle={(o) => toggleOption("cta_style", o)}
                />
                <div className="mt-3">
                  <FieldLabel text="Give 1-3 example CTAs you actually use" />
                  <textarea
                    rows={2}
                    value={typeof answers.cta_examples === "string" ? answers.cta_examples : ""}
                    onChange={(e) => setText("cta_examples", e.target.value)}
                    placeholder={stepByKey("cta_examples").placeholder}
                    className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                  />
                </div>
              </EditSection>

              <EditSection title="Voice & style">
                <FieldLabel text="Which words best describe your voice?" />
                <OptionToggleList
                  options={(STEPS.find((s) => s.key === "voice_keywords") as Extract<Step, { type: "multi" }>).options}
                  selected={answers.voice_keywords}
                  onToggle={(o) => toggleOption("voice_keywords", o)}
                />
                <div className="mt-3">
                  <FieldLabel text="What content style fits you best?" />
                  <OptionToggleList
                    options={(STEPS.find((s) => s.key === "content_style") as Extract<Step, { type: "multi" }>).options}
                    selected={answers.content_style}
                    onToggle={(o) => toggleOption("content_style", o)}
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel text="Words or phrases you like to use" />
                    <textarea
                      rows={2}
                      value={typeof answers.words_to_use === "string" ? answers.words_to_use : ""}
                      onChange={(e) => setText("words_to_use", e.target.value)}
                      placeholder={stepByKey("words_to_use").placeholder}
                      className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <FieldLabel text="Words or phrases to avoid" />
                    <textarea
                      rows={2}
                      value={typeof answers.words_to_avoid === "string" ? answers.words_to_avoid : ""}
                      onChange={(e) => setText("words_to_avoid", e.target.value)}
                      placeholder={stepByKey("words_to_avoid").placeholder}
                      className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <FieldLabel text="How long should your captions be?" />
                  <OptionSingleList
                    options={(STEPS.find((s) => s.key === "caption_length_pref") as Extract<Step, { type: "single" }>).options}
                    selected={answers.caption_length_pref}
                    onSelect={(o) => selectSingle("caption_length_pref", o)}
                  />
                </div>
                <div className="mt-3">
                  <FieldLabel text="How long should your short-form video scripts be?" />
                  <OptionSingleList
                    options={(STEPS.find((s) => s.key === "script_length_pref") as Extract<Step, { type: "single" }>).options}
                    selected={answers.script_length_pref}
                    onSelect={(o) => selectSingle("script_length_pref", o)}
                  />
                </div>
              </EditSection>

              <EditSection title="Image">
                <FieldLabel text="What color theme or visual mood fits your brand?" />
                <textarea
                  rows={2}
                  value={typeof answers.color_theme === "string" ? answers.color_theme : ""}
                  onChange={(e) => setText("color_theme", e.target.value)}
                  placeholder={stepByKey("color_theme").placeholder}
                  className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
              </EditSection>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex items-center justify-between border-t border-neutral-200 pt-4">
              <button
                onClick={() => setMode("choose")}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</p>
      {children}
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <p className="mb-1.5 text-sm text-neutral-600">{text}</p>;
}

function OptionToggleList({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[] | string | undefined;
  onToggle: (option: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = Array.isArray(selected) && selected.includes(option);
        return (
          <li key={option}>
            <button
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-1.5 text-left text-sm transition ${
                isSelected
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {option}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function OptionSingleList({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string[] | string | undefined;
  onSelect: (option: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <li key={option}>
            <button
              onClick={() => onSelect(option)}
              className={`rounded-full border px-3 py-1.5 text-left text-sm transition ${
                isSelected
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {option}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
