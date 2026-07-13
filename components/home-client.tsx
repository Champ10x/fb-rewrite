"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BrandVoice, CurrentUser, PostWithRelations, Revision } from "@/lib/types";
import { latestAnalysis, sortPosts } from "@/lib/posts";
import { scoreColor, scoreColorClasses } from "@/lib/scoring";
import { getWeekStart } from "@/lib/quota";
import { displayTokens } from "@/lib/tokens";
import { getCharCount, getWordCount } from "@/lib/text-stats";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { AuthHeader } from "@/components/auth-header";
import { BrandVoiceWizard } from "@/components/brand-voice-wizard";
import { Sidebar } from "@/components/sidebar";

const MAX_LEN = 2000;

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
  const [targetCharCount, setTargetCharCount] = useState("");
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [draftFinalText, setDraftFinalText] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionInstructions, setRevisionInstructions] = useState("");
  const [showRevisions, setShowRevisions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PostWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<{ message: string; existingPostId: string } | null>(null);
  const [quotaRequestMessage, setQuotaRequestMessage] = useState("");
  const [quotaRequestStatus, setQuotaRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

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
          target_char_count: targetCharCount.trim() ? Number(targetCharCount) : undefined,
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
      setShowRevisions(false);
      setSaveState("idle");
      setRawText("");
      setTargetCharCount("");
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

  async function handleTryAnother() {
    if (!activePost || !canEditActive) return;
    setRevisionLoading(true);
    setRewriteError(null);
    try {
      const res = await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: activePost.id,
          raw_text: activePost.raw_text,
          instructions: revisionInstructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewriteError(data.message ?? "Rewrite failed — please try again.");
        return;
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === activePost.id ? { ...p, revisions: [data.revision, ...p.revisions] } : p,
        ),
      );
      setRevisionInstructions("");
      setShowRevisions(true);
    } catch {
      setRewriteError("Rewrite failed — please try again.");
    } finally {
      setRevisionLoading(false);
    }
  }

  function handleUseRevision(rev: Revision) {
    setDraftFinalText(rev.rewritten_text ?? "");
  }

  function handleView(post: PostWithRelations) {
    setActivePostId(post.id);
    setDraftFinalText(post.final_text ?? post.raw_text);
    setShowRevisions(false);
    setRewriteError(null);
    setAuthNotice(null);
    setSaveState("idle");
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

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F1E3] md:flex-row">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-neutral-500">
              Paste a raw Facebook post, get a lead-gen-optimised rewrite with scores.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {currentUser && (
              <span className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600">
                {quotaUsed}/{weeklyQuota} posts this week
              </span>
            )}
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

            {activeAnalysis?.image_url && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Suggested image</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeAnalysis.image_url}
                  alt="AI-generated image relevant to this post"
                  className="w-full rounded-lg border border-neutral-200"
                />
              </div>
            )}

            <p className="mt-2 text-xs text-neutral-400">
              {getWordCount(draftFinalText)} words · {getCharCount(draftFinalText)} characters
              {(activeAnalysis?.rewrite_tokens_used != null || activeAnalysis?.image_tokens_used != null) && (
                <>
                  {" "}
                  · Tokens used — text: {displayTokens(activeAnalysis?.rewrite_tokens_used) ?? "—"} · image:{" "}
                  {displayTokens(activeAnalysis?.image_tokens_used) ?? "—"}
                </>
              )}
            </p>

            {canEditActive && (
              <div className="mt-3">
                <label htmlFor="revision-instructions" className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Instructions for next rewrite (optional)
                </label>
                <input
                  id="revision-instructions"
                  type="text"
                  maxLength={300}
                  value={revisionInstructions}
                  onChange={(e) => setRevisionInstructions(e.target.value)}
                  placeholder="e.g. make it shorter, more urgent, mention weekends"
                  className="w-full rounded-lg border border-neutral-300 p-2 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
              </div>
            )}

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

                <button
                  onClick={handleTryAnother}
                  disabled={revisionLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {revisionLoading && <Spinner dark />}
                  {revisionLoading ? "Generating…" : "Try Another Rewrite"}
                </button>

                {activePost.revisions.length > 0 && (
                  <button
                    onClick={() => setShowRevisions((s) => !s)}
                    className="text-sm font-medium text-neutral-500 underline-offset-2 hover:underline"
                  >
                    {showRevisions ? "Hide" : "Show"} Revision History ({activePost.revisions.length})
                  </button>
                )}
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
                  5 follow-up posts
                </p>
                <ul className="space-y-2">
                  {activeAnalysis.follow_up_posts.map((fp, i) => (
                    <FollowUpItem key={i} text={fp} />
                  ))}
                </ul>
              </div>
            )}

            {showRevisions && activePost.revisions.length > 0 && (
              <div className="mt-5 border-t border-neutral-200 pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Revision History — compare against current
                </p>
                <div className="space-y-3">
                  {activePost.revisions.map((rev) => (
                    <div key={rev.id} className="rounded-lg border border-neutral-200 p-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Current</span>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreColorClasses[scoreColor(activeAnalysis?.lead_gen_score)]}`}
                            >
                              {activeAnalysis?.lead_gen_score ?? "—"}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-neutral-600">{draftFinalText}</p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {getWordCount(draftFinalText)} words · {getCharCount(draftFinalText)} characters
                          </p>
                        </div>
                        <div className="border-t border-neutral-100 pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                              {new Date(rev.created_at).toLocaleString()}
                            </span>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreColorClasses[scoreColor(rev.lead_gen_score)]}`}
                            >
                              {rev.lead_gen_score ?? "—"}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-neutral-700">{rev.rewritten_text}</p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {getWordCount(rev.rewritten_text)} words · {getCharCount(rev.rewritten_text)} characters
                            {rev.tokens_used != null && <> · Tokens used: {displayTokens(rev.tokens_used)}</>}
                          </p>
                          {canEditActive && (
                            <button
                              onClick={() => handleUseRevision(rev)}
                              className="mt-2 text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
                            >
                              Use this
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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

function FollowUpItem({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore, copy is a convenience only
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-2.5">
      <p className="text-sm text-neutral-700">{text}</p>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-neutral-400">{text.length}/120</span>
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
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
