"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CurrentUser, PostWithRelations, Revision } from "@/lib/types";
import { latestAnalysis, sortPosts } from "@/lib/posts";
import { scoreColor, scoreColorClasses } from "@/lib/scoring";
import { AuthHeader } from "@/components/auth-header";

const MAX_LEN = 2000;

export function HomeClient({
  initialPosts,
  currentUser,
}: {
  initialPosts: PostWithRelations[];
  currentUser: CurrentUser | null;
}) {
  const [posts, setPosts] = useState<PostWithRelations[]>(initialPosts);
  const [rawText, setRawText] = useState("");
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [draftFinalText, setDraftFinalText] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PostWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedPosts = useMemo(() => sortPosts(posts), [posts]);
  const activePost = posts.find((p) => p.id === activePostId) ?? null;
  const activeAnalysis = activePost ? latestAnalysis(activePost) : null;
  const canEditActive = !!currentUser && !!activePost && activePost.user_id === currentUser.id;

  async function handleRewrite() {
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
    setLoadingRewrite(true);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setAuthNotice("Please log in to rewrite posts");
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
        body: JSON.stringify({ post_id: activePost.id, raw_text: activePost.raw_text }),
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

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">fb-rewrite</h1>
            <p className="mt-1 text-neutral-500">
              Paste a raw Facebook post, get a lead-gen-optimised rewrite with scores.
            </p>
          </div>
          <AuthHeader email={currentUser?.email ?? null} />
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <label htmlFor="raw-text" className="mb-2 block text-sm font-medium text-neutral-700">
            Raw post
          </label>
          <textarea
            id="raw-text"
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="e.g. we fix pipes call us anytime good prices dublin"
            className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
            <span>{validationError ? <span className="text-red-600">{validationError}</span> : " "}</span>
            <span>
              {rawText.length}/{MAX_LEN}
            </span>
          </div>
          <button
            onClick={handleRewrite}
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
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Original</p>
              <p className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500">
                {activePost.raw_text}
              </p>
            </div>

            <label htmlFor="final-text" className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              Final version
            </label>
            <textarea
              id="final-text"
              rows={4}
              value={draftFinalText}
              onChange={(e) => setDraftFinalText(e.target.value)}
              disabled={!canEditActive}
              className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-400"
            />

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

            {showRevisions && activePost.revisions.length > 0 && (
              <div className="mt-5 border-t border-neutral-200 pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Revision History
                </p>
                <ul className="space-y-2">
                  {activePost.revisions.map((rev) => (
                    <li
                      key={rev.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-neutral-700">{rev.rewritten_text}</p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {new Date(rev.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreColorClasses[scoreColor(rev.lead_gen_score)]}`}
                      >
                        {rev.lead_gen_score ?? "—"}
                      </span>
                      <button
                        onClick={() => handleUseRevision(rev)}
                        className="shrink-0 text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
                      >
                        Use this
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Post History
          </h2>
          {sortedPosts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
              No posts yet. Paste your first post above.
            </p>
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
    </main>
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
