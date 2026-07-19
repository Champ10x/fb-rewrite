import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { NewsletterForm } from "@/components/newsletter-form";
import { scoreColor, scoreColorClasses } from "@/lib/scoring";

const FACEBOOK_PAGE_URL = "https://www.facebook.com/patrick4freedom";

type Example = { raw: string; final: string; score: number };

const FALLBACK_EXAMPLE: Example = {
  raw: "we fix pipes call us anytime good prices dublin area fast service",
  final:
    "Burst pipe at 2am? Dublin's emergency plumbers are on call 24/7 — fixed fast, priced fairly. DM us now for same-day slots.",
  score: 85,
};

async function getExample(): Promise<Example> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("posts")
    .select("raw_text, final_text, analyses(lead_gen_score)")
    .not("final_text", "is", null)
    .order("created_at", { ascending: true })
    .limit(20);

  const candidates = (rows ?? [])
    .filter((r) => r.raw_text && r.raw_text.length <= 150 && r.final_text)
    .map((r) => ({
      raw: r.raw_text,
      final: r.final_text as string,
      score: r.analyses?.[0]?.lead_gen_score ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  return candidates[0] ?? FALLBACK_EXAMPLE;
}

export default async function WelcomePage() {
  const example = await getExample();
  const color = scoreColorClasses[scoreColor(example.score)];

  return (
    <div className="min-h-screen bg-[#F7F1E3]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Try it free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C97B4A]">
              AI copywriting for local businesses
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
              Turn a rough post into one that gets leads.
            </h1>
            <p className="mt-4 max-w-md text-base text-neutral-600">
              Paste what you'd normally post. Get back a scored rewrite, five ready-to-schedule follow-ups, and an
              image — all matched to your own brand voice.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Try it free
              </Link>
              <a
                href="#example"
                className="rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                See a real example
              </a>
            </div>
          </div>

          <HeroMock />
        </div>
      </section>

      {/* Real example */}
      <section id="example" className="border-t border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionEyebrow icon={<ScoreIcon />} label="A real rewrite from this app" />
          <h2 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">See it in action</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Before</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">{example.raw}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">After</p>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>
                  {example.score} lead-gen score
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{example.final}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            Every rewrite gets scored on Hook, CTA, and Urgency — you see the number before you post it, not after.
          </p>
        </div>
      </section>

      {/* Brand voice */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <SectionEyebrow icon={<VoiceIcon />} label="Your brand voice" />
              <h2 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">
                Sounds like you, not a template
              </h2>
              <p className="mt-4 text-base text-neutral-600">
                Define who you're writing for and how you talk once — a quick Q&amp;A, an uploaded brand document, or
                direct edits — and every rewrite uses it instead of guessing. The app flags exactly which inputs are
                still missing, like your target reader or your usual call-to-action, so nothing gets left generic.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <Dot /> Answer a few quick questions, or upload notes you already have
                </li>
                <li className="flex items-start gap-2.5">
                  <Dot /> Edit anytime, with guidance on what's still missing
                </li>
                <li className="flex items-start gap-2.5">
                  <Dot /> Private to your account — never shared or reused across businesses
                </li>
              </ul>
            </div>
            <BrandVoiceMock />
          </div>
        </div>
      </section>

      {/* Image generation */}
      <section className="border-t border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <ImageMock />
            <div>
              <SectionEyebrow icon={<ImageIcon />} label="Visuals, on demand" />
              <h2 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">
                A scroll-stopping image to go with it
              </h2>
              <p className="mt-4 text-base text-neutral-600">
                Every rewrite comes with a detailed image prompt you can read and edit before anything is generated —
                nothing gets created (or costs you tokens) until you click Generate. Pick one of your follow-up
                posts to overlay as text on the image, then copy or download it straight away.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <Dot /> You review and edit the prompt first — full control, no surprises
                </li>
                <li className="flex items-start gap-2.5">
                  <Dot /> Text overlays render as real vector graphics, not blurry AI text
                </li>
                <li className="flex items-start gap-2.5">
                  <Dot /> One click to copy or download, ready to post
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionEyebrow icon={<StepsIcon />} label="Start to finish" />
          <h2 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">How it works</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { n: 1, title: "Paste your rough post", body: "Pick the platform, a tone, and any key point to include." },
              { n: 2, title: "Get a scored rewrite", body: "Plus 5 follow-up posts and an editable image prompt." },
              { n: 3, title: "Generate, tweak, post", body: "Create the image when you're ready, then copy it out." },
            ].map((step) => (
              <div key={step.n} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                  {step.n}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-1 text-sm text-neutral-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Everything else that's built in</h2>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Six-step copywriting method behind every rewrite",
              "Tuned per platform — Facebook, Instagram, Threads, LinkedIn, X",
              "Authoritative, Educational, or Story tone, on top of your brand voice",
              "Optional target length in characters",
              "Duplicate-post detection so you don't repost by accident",
              "Free weekly quota that resets every Monday",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2.5 rounded-lg border border-neutral-200 p-3.5 text-sm text-neutral-700">
                <Dot /> {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            Stop writing posts nobody reads.
          </h2>
          <p className="mt-3 text-base text-neutral-600">
            Free to start, no credit card. Scan to open it on your phone, or try it right here.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Try it free
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/qr-code" alt="QR code to open fb-rewrite" width={120} height={120} className="rounded-lg border border-neutral-200" />
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-medium text-neutral-900">Get notified about new apps and developments</p>
            <div className="mt-2 max-w-sm">
              <NewsletterForm />
            </div>
          </div>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
          >
            Follow on Facebook
          </a>
        </div>
      </footer>
    </div>
  );
}

function SectionEyebrow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wide text-[#C97B4A]">{label}</span>
    </div>
  );
}

function Dot() {
  return <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E8B94A]" />;
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#F3E7D3" />
      {children}
    </svg>
  );
}

function ScoreIcon() {
  return (
    <IconCircle>
      <path d="M9 18l3-6 3 3 4-7" stroke="#C97B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </IconCircle>
  );
}

function VoiceIcon() {
  return (
    <IconCircle>
      <path
        d="M14 8a3 3 0 0 1 3 3v3a3 3 0 0 1-6 0v-3a3 3 0 0 1 3-3z"
        stroke="#C97B4A"
        strokeWidth="2"
        fill="none"
      />
      <path d="M9 14a5 5 0 0 0 10 0M14 19v2" stroke="#C97B4A" strokeWidth="2" strokeLinecap="round" fill="none" />
    </IconCircle>
  );
}

function ImageIcon() {
  return (
    <IconCircle>
      <rect x="8" y="9" width="12" height="10" rx="1.5" stroke="#C97B4A" strokeWidth="2" fill="none" />
      <circle cx="11.5" cy="12.5" r="1.2" fill="#C97B4A" />
      <path d="M8 17l3.5-3.5 2.5 2.5 3-3.5 3 4.5" stroke="#C97B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </IconCircle>
  );
}

function StepsIcon() {
  return (
    <IconCircle>
      <path d="M9 10h10M9 14h10M9 18h6" stroke="#C97B4A" strokeWidth="2" strokeLinecap="round" />
    </IconCircle>
  );
}

function HeroMock() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Raw post</p>
      <p className="mt-1.5 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500">
        we fix pipes call us anytime good prices dublin area fast service
      </p>
      <div className="mt-4 flex items-center gap-2 text-neutral-300">
        <span className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs font-medium text-neutral-400">rewritten</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-neutral-400">Final version</p>
      <p className="mt-1.5 text-sm text-neutral-800">
        Burst pipe at 2am? Dublin's emergency plumbers are on call 24/7 — fixed fast, priced fairly. DM us now for
        same-day slots.
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Hook", value: "9.0" },
          { label: "CTA", value: "8.5" },
          { label: "Urgency", value: "8.0" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 p-2 text-center">
            <p className="text-[10px] font-medium uppercase text-neutral-400">{s.label}</p>
            <p className="text-sm font-semibold text-neutral-900">{s.value}</p>
          </div>
        ))}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-center">
          <p className="text-[10px] font-medium uppercase text-emerald-600">Lead-Gen</p>
          <p className="text-sm font-semibold text-emerald-700">85</p>
        </div>
      </div>
    </div>
  );
}

function BrandVoiceMock() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Key inputs from the Copy Playbook</p>
      <ul className="mt-3 space-y-2.5">
        {[
          { label: "Reader", desc: "Who exactly is your customer?", filled: true },
          { label: "Tension", desc: "What do they already want or fear?", filled: true },
          { label: "Proof", desc: "What's the one outcome you deliver?", filled: false },
          { label: "The Ask", desc: "How do you ask for contact?", filled: true },
        ].map((s) => (
          <li key={s.label} className="flex items-start gap-2.5 text-sm">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.filled ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className={s.filled ? "text-neutral-500" : "text-neutral-700"}>
              <span className="font-medium">{s.label}</span> — {s.desc}
              {!s.filled && <span className="ml-1 text-amber-600">(not set)</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImageMock() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Image prompt — edit before generating</p>
      <p className="mt-1.5 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
        A close-up of a wrench tightening a shining copper pipe, water droplets catching warm evening light, a faint
        glow from a phone screen in the background.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Generate Image</span>
        <span className="text-xs text-neutral-400">not generated until you click</span>
      </div>
    </div>
  );
}
