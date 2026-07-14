// Mirrors the "Inputs Required Before Rewriting" table in docs/COPY_PLAYBOOK.md —
// the four BrandVoice inputs that back the six-step method. Used to tell a user
// which key inputs are still missing from their brand voice.

export type KeyStepId = "reader" | "tension" | "proof" | "ask";

export type KeyStepStatus = {
  id: KeyStepId;
  label: string;
  description: string;
  filled: boolean;
};

export type KeyStepInputs = {
  target_audience?: string | string[] | null;
  audience_feelings?: string | string[] | null;
  persona_note?: string | string[] | null;
  topics?: string | string[] | null;
  cta_style?: string | string[] | null;
  cta_examples?: string | string[] | null;
};

function hasValue(value: string | string[] | null | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return !!value && value.trim().length > 0;
}

export function getKeyStepStatus(inputs: KeyStepInputs | null | undefined): KeyStepStatus[] {
  return [
    {
      id: "reader",
      label: "Reader",
      description: "Who exactly is your customer?",
      filled: hasValue(inputs?.target_audience),
    },
    {
      id: "tension",
      label: "Tension",
      description: "What do they already want or fear?",
      filled: hasValue(inputs?.audience_feelings),
    },
    {
      id: "proof",
      label: "Proof",
      description: "What's the one outcome you deliver?",
      filled: hasValue(inputs?.persona_note) || hasValue(inputs?.topics),
    },
    {
      id: "ask",
      label: "The Ask",
      description: "How do you ask for contact?",
      filled: hasValue(inputs?.cta_style) || hasValue(inputs?.cta_examples),
    },
  ];
}
