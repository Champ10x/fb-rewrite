"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BrandVoice, CurrentUser, PostWithRelations } from "@/lib/types";
import { latestAnalysis, sortPosts } from "@/lib/posts";
import { scoreColor, scoreColorClasses } from "@/lib/scoring";
import { getWeekStart } from "@/lib/quota";
import { displayTokens } from "@/lib/tokens";
import { getCharCount, getWordCount } from "@/lib/text-stats";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { TONES, type ToneId } from "@/lib/tones";
import { AuthHeader } from "@/components/auth-header";
import { BrandVoiceWizard } from "@/components/brand-voice-wizard";
import { Sidebar } from "@/components/sidebar";

const MAX_LEN = 2000;
const FACEBOOK_PAGE_URL = "https://www.facebook.com/patrick4freedom";
const APP_URL = "https://fb-rewrite.vercel.app";

export function HomeClient({
  initialPosts,
  currentUser,
  initialBrandVoice,
  weeklyQuota,
  isAdmin,
}: {
  initialPosts: PostWithRelations[];
  currentUser: CurrentUser | null;
  initialBrandVoice: BrandVoice | null;
  weeklyQuota: number;
  isAdmin: boolean;
}) {
  const [posts, setPosts] = useState<PostWithRelations[]>(initialPosts);
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(initialBrandVoice);
  const [showWizard, setShowWizard] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [rawText, setRawText] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("facebook");
  const [tone, setTone] = useState<ToneId>("brand-voice");
  const [targetCharCount, setTargetCharCount] = useState("");
  const [keyPoint, setKeyPoint] = useState("");
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [draftFinalText, setDraftFinalText] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PostWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<{ message: string; existingPostId: string } | null>(null);
  const [quotaRequestMessage, setQuotaRequestMessage] = useState("");
  const [quotaRequestStatus, setQuotaRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [selectingIndex, setSelectingIndex] = useState<number | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionTries, setSessionTries] = useState(0);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [imagePromptDraft, setImagePromptDraft] = useState("");
  const [showImagePromptEditor, setShowImagePromptEditor] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const sortedPosts = useMemo(() => sortPosts(posts), [posts]);
  const activePost = posts.find((p) => p.id === activePostId) ?? null;
  const activeAnalysis = activePost ? latestAnalysis(activePost) : null;
  const canEditActive = !!currentUser && !!activePost && activePost.user_id === currentUser.id;

  const quotaUsed = useMemo(() => {
    if (!currentUser) return 0;
    const weekStart = getWeekStart();
    return posts.filter((p) => p.user_id === currentUser.id && new Date(p.created_at) >= weekStart).length;
  }, [posts, currentUser]);
  const quotaExceeded = !!currentUser && quotaUsed >= weeklyQuota;

  const lifetimeStats = useMemo(() => {
    if (!currentUser) return { tries: 0, tokens: 0 };
    const mine = posts.filter((p) => p.user_id === currentUser.id);
    const tokens = mine.reduce((sum, p) => {
      const a = latestAnalysis(p);
      return sum + (a?.rewrite_tokens_used ?? 0) + (a?.image_tokens_used ?? 0);
    }, 0);
    return { tries: mine.length, tokens };
  }, [posts, currentUser]);

  async function handleRewrite(force = false) {
    if (!currentUser) {
      setAuthNotice("Please log in to rewrite posts");
      return;
    }
    const text = rawText.trim();
    if (!text) {
      setValidationError("Please paste a post first");
      return;
    }
    if (text.length > MAX_LEN) {
      setValidationError(`Post too long (max ${MAX_LEN} characters)`);
      return;
    }
    setValidationError(null);
    setAuthNotice(null);
    setRewriteError(null);
    setDuplicateNotice(null);
    setLoadingRewrite(true);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: text,
          force,
          platform,
          tone,
          target_char_count: targetCharCount.trim() ? Number(targetCharCount) : undefined,
          key_point: keyPoint.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setAuthNotice("Please log in to rewrite posts");
          return;
        }
        if (res.status === 409 && data.existingPostId) {
          setDuplicateNotice({ message: data.message, existingPostId: data.existingPostId });
          return;
        }
        setRewriteError(data.message ?? "Rewrite failed — please try again.");
        return;
      }
      const newPost: PostWithRelations = {
        ...data.post,
        analyses: data.analysis ? [data.analysis] : [],
        revisions: [],
      };
      setPosts((prev) => [newPost, ...prev]);
      setActivePostId(newPost.id);
      setDraftFinalText(newPost.final_text ?? text);
      setSaveState("idle");
      setRawText("");
      setTargetCharCount("");
      setKeyPoint("");
      setImagePromptDraft(data.analysis?.image_prompt ?? "");
      setShowImagePromptEditor(true);
      setSessionTries((prev) => prev + 1);
      if (data.analysis?.rewrite_tokens_used != null) {
        setSessionTokens((prev) => prev + data.analysis.rewrite_tokens_used);
      }
      if (data.error === "ai_failed") setRewriteError(data.message);
    } catch {
      setRewriteError("Rewrite failed — please try again.");
    } finally {
      setLoadingRewrite(false);
    }
  }

  async function handleSave() {
    if (!activePost || !canEditActive) return;
    const text = draftFinalText.trim();
    if (!text) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/posts/${activePost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ final_text: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      setPosts((prev) => prev.map((p) => (p.id === activePost.id ? { ...p, ...data.post } : p)));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch {
      setSaveState("error");
    }
  }

  function handleView(post: PostWithRelations) {
    setActivePostId(post.id);
    setDraftFinalText(post.final_text ?? post.raw_text);
    setRewriteError(null);
    setAuthNotice(null);
    setSaveState("idle");
    const analysis = latestAnalysis(post);
    setImagePromptDraft(analysis?.image_prompt ?? "");
    setShowImagePromptEditor(!analysis?.image_url);
  }

  async function handleGenerateImage() {
    if (!activePost || !canEditActive) return;
    const prompt = imagePromptDraft.trim();
    if (!prompt) return;
    setGeneratingImage(true);
    setRewriteError(null);
    try {
      const res = await fetch(`/api/posts/${activePost.id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewriteError(data.message ?? "Could not create image — please try again.");
        return;
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === activePost.id
            ? { ...p, analyses: p.analyses.map((a) => (a.id === data.analysis.id ? data.analysis : a)) }
            : p,
        ),
      );
      if (data.analysis?.image_tokens_used != null) {
        setSessionTokens((prev) => prev + data.analysis.image_tokens_used);
      }
      setShowImagePromptEditor(false);
    } catch {
      setRewriteError("Could not create image — please try again.");
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleSelectFollowUpImage(index: number, text: string) {
    if (!activePost || !canEditActive) return;
    setSelectingIndex(index);
    setRewriteError(null);
    try {
      const res = await fetch(`/api/posts/${activePost.id}/select-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewriteError(data.message ?? "Could not create image — please try again.");
        return;
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === activePost.id
            ? { ...p, analyses: p.analyses.map((a) => (a.id === data.analysis.id ? data.analysis : a)) }
            : p,
        ),
      );
    } catch {
      setRewriteError("Could not create image — please try again.");
    } finally {
      setSelectingIndex(null);
    }
  }

  async function handleCopyImage(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 1500);
    } catch {
      // clipboard image copy unavailable in this browser — silently ignore
    }
  }

  async function handleDownloadImage(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        if (activePostId === deleteTarget.id) setActivePostId(null);
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleSendQuotaRequest() {
    setQuotaRequestStatus("sending");
    try {
      const res = await fetch("/api/quota-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: quotaRequestMessage }),
      });
      setQuotaRequestStatus(res.ok ? "sent" : "error");
    } catch {
      setQuotaRequestStatus("error");
    }
  }

  async function handleSubmitFeedback() {
    if (feedbackRating == null) return;
    setFeedbackStatus("sending");
    try {
      const res = await fetch("/api/session-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: feedbackRating,
          feedback: feedbackText.trim() || undefined,
          session_tokens_used: sessionTokens,
          session_tries: sessionTries,
        }),
      });
      setFeedbackStatus(res.ok ? "sent" : "error");
    } catch {
      setFeedbackStatus("error");
    }
  }

  async function handleSubscribe() {
    const email = subscribeEmail.trim();
    if (!email) return;
    setSubscribeStatus("sending");
    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubscribeStatus(res.ok ? "sent" : "error");
      if (res.ok) setSubscribeEmail("");
    } catch {
      setSubscribeStatus("error");
    }
  }

  function handleShareOnFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F1E3] md:flex-row">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/qr-code" alt="QR code to open fb-rewrite" width={56} height={56} className="rounded" />
          <div className="text-xs text-neutral-500">
            <p className="font-medium text-neutral-700">Scan to open fb-rewrite</p>
            <p>{APP_URL}</p>
          </div>
        </div>

        {currentUser && (
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-500">
            <span className="font-medium text-neutral-700">{currentUser.email}</span>
            <span>
              {quotaUsed}/{weeklyQuota} posts this week
            </span>
            <span>Session tokens used: {displayTokens(sessionTokens) ?? 0}</span>
            <span>Lifetime tries: {lifetimeStats.tries}</span>
            <span>Lifetime tokens: {displayTokens(lifetimeStats.tokens) ?? 0}</span>
          </div>
        )}

        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-neutral-500">
              Paste a raw Facebook post, get a lead-gen-optimised rewrite with scores.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {currentUser && (
              <button
                onClick={() => setShowWizard(true)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {brandVoice ? "Edit brand voice" : "Set up brand voice"}
              </button>
            )}
            <AuthHeader email={currentUser?.email ?? null} />
          </div>
        </header>

        {currentUser && !brandVoice && !bannerDismissed && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-medium text-neutral-900">Get rewrites that sound like you</p>
              <p className="mt-0.5 text-sm text-neutral-500">
                Answer a few quick questions about your brand voice and every rewrite will match your tone.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setShowWizard(true)}
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Set up
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          {quotaExceeded ? (
            <div>
              <p className="text-base font-semibold text-neutral-900">Thanks for using fb-rewrite this week! 🎉</p>
              <p className="mt-1 text-sm text-neutral-500">
                You've used all {weeklyQuota} of your posts. Your quota resets Monday — or send a quick note
                below and we'll bump it up.
              </p>
              {quotaRequestStatus === "sent" ? (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Thanks — we got your message and will get back to you.
                </p>
              ) : (
                <>
                  <textarea
                    rows={3}
                    value={quotaRequestMessage}
                    onChange={(e) => setQuotaRequestMessage(e.target.value)}
                    placeholder="Tell us why you'd like a higher quota…"
                    className="mt-3 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                  />
                  <button
                    onClick={handleSendQuotaRequest}
                    disabled={quotaRequestStatus === "sending"}
                    className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {quotaRequestStatus === "sending" ? "Sending…" : "Request more posts"}
                  </button>
                  {quotaRequestStatus === "error" && (
                    <p className="mt-2 text-sm text-red-600">Could not send your request — please try again.</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <label htmlFor="raw-text" className="mb-2 block text-sm font-medium text-neutral-700">
                Raw post
              </label>
              <textarea
                id="raw-text"
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="e.g. your health is your wealth.... take care of yourself today"
                className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                <span>{validationError ? <span className="text-red-600">{validationError}</span> : " "}</span>
                <span>
                  {rawText.length}/{MAX_LEN}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="platform-select" className="mb-1 block text-xs font-medium text-neutral-500">
                    Platform
                  </label>
                  <select
                    id="platform-select"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as PlatformId)}
                    className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tone-select" className="mb-1 block text-xs font-medium text-neutral-500">
                    Tone
                  </label>
                  <select
                    id="tone-select"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ToneId)}
                    className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                  >
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="target-char-count" className="mb-1 block text-xs font-medium text-neutral-500">
                    Target length (characters, optional)
                  </label>
                  <input
                    id="target-char-count"
                    type="number"
                    min={1}
                    max={5000}
                    value={targetCharCount}
                    onChange={(e) => setTargetCharCount(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-32 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label htmlFor="key-point" className="mb-1 block text-xs font-medium text-neutral-500">
                  Key point / angle to include (optional)
                </label>
                <textarea
                  id="key-point"
                  rows={2}
                  value={keyPoint}
                  onChange={(e) => setKeyPoint(e.target.value)}
                  placeholder="e.g. mention we're now open on weekends — doesn't need to be word-for-word"
                  className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
              </div>

              <button
                onClick={() => handleRewrite()}
                disabled={loadingRewrite || !rawText.trim() || rawText.length > MAX_LEN}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingRewrite && <Spinner />}
                {loadingRewrite ? "Rewriting…" : "Rewrite"}
              </button>
              {authNotice && (
                <p className="mt-2 text-sm text-amber-700">
                  {authNotice} —{" "}
                  <Link href="/login" className="underline underline-offset-2">
                    log in
                  </Link>
                </p>
              )}
              {duplicateNotice && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-amber-700">
                  <span>{duplicateNotice.message}</span>
                  <button
                    onClick={() => {
                      const existing = posts.find((p) => p.id === duplicateNotice.existingPostId);
                      if (existing) handleView(existing);
                      setDuplicateNotice(null);
                    }}
                    className="underline underline-offset-2"
                  >
                    View existing
                  </button>
                  <span>·</span>
                  <button onClick={() => handleRewrite(true)} className="underline underline-offset-2">
                    Create anyway
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {activePost && (
          <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            {rewriteError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {rewriteError}
              </div>
            )}
            {!canEditActive && (
              <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
                {currentUser
                  ? "This is a shared demo post — paste your own post above to create an editable version."
                  : (
                    <>
                      Read-only demo post.{" "}
                      <Link href="/login" className="underline underline-offset-2">
                        Log in
                      </Link>{" "}
                      to rewrite, save, and manage your own posts.
                    </>
                  )}
              </div>
            )}

            <div className="mb-4">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Original</p>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                  {PLATFORMS.find((p) => p.id === activePost.platform)?.label ?? "Facebook"}
                </span>
                {activePost.target_char_count && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                    ~{activePost.target_char_count} chars
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500">
                {activePost.raw_text}
              </p>
            </div>

            <label htmlFor="final-text" className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              Final version
            </label>
            <textarea
              id="final-text"
              rows={8}
              value={draftFinalText}
              onChange={(e) => setDraftFinalText(e.target.value)}
              disabled={!canEditActive}
              className="w-full resize-y rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-400"
            />

            {activeAnalysis && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Image</p>

                {activeAnalysis.image_url && !showImagePromptEditor ? (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeAnalysis.image_url}
                      alt="AI-generated image relevant to this post"
                      className="w-full rounded-lg border border-neutral-200"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleCopyImage(activeAnalysis.image_url!)}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        {copiedImage ? "Copied" : "Copy image"}
                      </button>
                      <button
                        onClick={() => handleDownloadImage(activeAnalysis.image_url!, `fb-rewrite-${activePost.id}.png`)}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Download
                      </button>
                      {activeAnalysis.image_tokens_used != null && (
                        <span className="text-xs text-neutral-400">
                          Tokens used — image: {displayTokens(activeAnalysis.image_tokens_used)}
                        </span>
                      )}
                      {canEditActive && (
                        <button
                          onClick={() => setShowImagePromptEditor(true)}
                          className="text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
                        >
                          Edit prompt &amp; regenerate
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  canEditActive && (
                    <div>
                      <label htmlFor="image-prompt" className="mb-1 block text-xs text-neutral-500">
                        Image prompt — edit before generating
                      </label>
                      <textarea
                        id="image-prompt"
                        rows={3}
                        value={imagePromptDraft}
                        onChange={(e) => setImagePromptDraft(e.target.value)}
                        placeholder="Describe the image to generate for this post…"
                        className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                      />
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={handleGenerateImage}
                          disabled={generatingImage || !imagePromptDraft.trim()}
                          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {generatingImage && <Spinner />}
                          {generatingImage ? "Generating…" : "Generate Image"}
                        </button>
                        {activeAnalysis.image_url && (
                          <button
                            onClick={() => setShowImagePromptEditor(false)}
                            className="text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <p className="mt-2 text-xs text-neutral-400">
              {getWordCount(draftFinalText)} words · {getCharCount(draftFinalText)} characters
              {activeAnalysis?.rewrite_tokens_used != null && (
                <> · Tokens used — text: {displayTokens(activeAnalysis.rewrite_tokens_used)}</>
              )}
            </p>

            {canEditActive && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving" || !draftFinalText.trim()}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
                </button>
                {saveState === "error" && <span className="text-sm text-red-600">Save failed — check connection</span>}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreCard label="Hook" value={activeAnalysis?.hook_score} max={10} />
              <ScoreCard label="CTA" value={activeAnalysis?.cta_score} max={10} />
              <ScoreCard label="Urgency" value={activeAnalysis?.urgency_score} max={10} />
              <LeadGenBadge value={activeAnalysis?.lead_gen_score} />
            </div>

            {!!activeAnalysis?.follow_up_posts?.length && (
              <div className="mt-5 border-t border-neutral-200 pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  5 follow-up posts — select one to overlay on the image
                </p>
                {canEditActive && !activeAnalysis.image_url && (
                  <p className="mb-2 text-xs text-amber-600">Generate an image above first to enable text overlays.</p>
                )}
                <ul className="space-y-2">
                  {activeAnalysis.follow_up_posts.map((fp, i) => (
                    <FollowUpItem
                      key={i}
                      text={fp}
                      selected={activeAnalysis.selected_image_text === fp}
                      selecting={selectingIndex === i}
                      canSelect={canEditActive && !!activeAnalysis.image_url}
                      onSelect={() => handleSelectFollowUpImage(i, fp)}
                    />
                  ))}
                </ul>

                {activeAnalysis.selected_image_url && (
                  <div className="mt-4 rounded-lg border border-neutral-200 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeAnalysis.selected_image_url}
                      alt={`Image with overlay text: ${activeAnalysis.selected_image_text ?? ""}`}
                      className="w-full rounded-lg border border-neutral-200"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleCopyImage(activeAnalysis.selected_image_url!)}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        {copiedImage ? "Copied" : "Copy image"}
                      </button>
                      <button
                        onClick={() =>
                          handleDownloadImage(activeAnalysis.selected_image_url!, `fb-rewrite-${activePost.id}.png`)
                        }
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Download
                      </button>
                      {activeAnalysis.selected_image_tokens_used != null && (
                        <span className="text-xs text-neutral-400">
                          Tokens used — image: {displayTokens(activeAnalysis.selected_image_tokens_used)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Post History
          </h2>
          {sortedPosts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-300 p-6 text-center">
              <EmptyStateIllustration />
              <p className="text-sm text-neutral-400">No posts yet. Paste your first post above.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {sortedPosts.map((post) => {
                const analysis = latestAnalysis(post);
                const isMine = !!currentUser && post.user_id === currentUser.id;
                return (
                  <li
                    key={post.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {post.final_text || post.raw_text}
                      </p>
                      <p className="mt-1 truncate text-xs text-neutral-400">
                        Original: {post.raw_text}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
                        <StatusBadge status={post.status} />
                        {!isMine && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-400">demo</span>
                        )}
                        <span>{new Date(post.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreColorClasses[scoreColor(analysis?.lead_gen_score)]}`}
                      >
                        {analysis?.lead_gen_score ?? "Scoring unavailable"}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(post)}
                          className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          {isMine ? "View/Edit" : "View"}
                        </button>
                        {isMine && (
                          <button
                            onClick={() => setDeleteTarget(post)}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {currentUser && (
          <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-900">How was this session?</p>
            {feedbackStatus === "sent" ? (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Thanks for the feedback!
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setFeedbackRating(n)}
                      className={`h-8 w-8 rounded-lg border text-sm font-medium transition ${
                        feedbackRating === n
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-neutral-400">1 = not satisfied, 10 = extremely satisfied</p>
                <textarea
                  rows={2}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Any comments on this session? (optional)"
                  className="mt-3 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
                <button
                  onClick={handleSubmitFeedback}
                  disabled={feedbackStatus === "sending" || feedbackRating == null}
                  className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {feedbackStatus === "sending" ? "Sending…" : "Submit feedback"}
                </button>
                {feedbackStatus === "error" && (
                  <p className="mt-2 text-sm text-red-600">Could not send feedback — please try again.</p>
                )}
              </>
            )}
          </section>
        )}

        <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Like fb-rewrite? Spread the word</p>
              <p className="mt-0.5 text-sm text-neutral-500">Share it on Facebook or follow along for updates.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={handleShareOnFacebook}
                className="rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#1465D8]"
              >
                Share on Facebook
              </button>
              <a
                href={FACEBOOK_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Follow on Facebook
              </a>
            </div>
          </div>

          <div className="mt-5 border-t border-neutral-200 pt-4">
            <p className="text-sm font-medium text-neutral-900">Get notified about new apps and developments</p>
            {subscribeStatus === "sent" ? (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Thanks — you're subscribed.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="email"
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
                <button
                  onClick={handleSubscribe}
                  disabled={subscribeStatus === "sending" || !subscribeEmail.trim()}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {subscribeStatus === "sending" ? "Subscribing…" : "Subscribe"}
                </button>
              </div>
            )}
            {subscribeStatus === "error" && (
              <p className="mt-2 text-sm text-red-600">Could not subscribe — please try again.</p>
            )}
          </div>
        </section>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-neutral-900">Delete this post?</h3>
            <p className="mt-2 text-sm text-neutral-500">
              This will permanently remove the post, its scores, and revision history.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWizard && (
        <BrandVoiceWizard
          existingBrandVoice={brandVoice}
          onClose={() => setShowWizard(false)}
          onComplete={(bv) => {
            setBrandVoice(bv);
            setShowWizard(false);
          }}
        />
      )}
      </main>
    </div>
  );
}

function ScoreCard({ label, value, max }: { label: string; value: number | null | undefined; max: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">
        {value != null ? value.toFixed(1) : "—"}
        <span className="text-xs font-normal text-neutral-400">/{max}</span>
      </p>
    </div>
  );
}

function LeadGenBadge({ value }: { value: number | null | undefined }) {
  const color = scoreColor(value);
  return (
    <div className={`rounded-lg border p-3 text-center ${scoreColorClasses[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">Lead-Gen</p>
      <p className="mt-1 text-lg font-semibold">{value ?? "—"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="rounded-full bg-neutral-100 px-2 py-0.5 capitalize text-neutral-500">{status}</span>;
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${dark ? "text-neutral-700" : "text-white"}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function FollowUpItem({
  text,
  selected,
  selecting,
  canSelect,
  onSelect,
}: {
  text: string;
  selected: boolean;
  selecting: boolean;
  canSelect: boolean;
  onSelect: () => void;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 ${
        selected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
      }`}
    >
      <p className="text-sm text-neutral-700">{text}</p>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-neutral-400">{text.length} chars (70–120)</span>
        {canSelect && (
          <button
            onClick={onSelect}
            disabled={selecting}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selecting ? "Creating…" : selected ? "Selected" : "Select"}
          </button>
        )}
      </div>
    </li>
  );
}

function EmptyStateIllustration() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#F3E7D3" />
      <path d="M14 26l10-10 4 4-10 10h-4v-4z" fill="#C97B4A" />
    </svg>
  );
}
