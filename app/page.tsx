"use client";

import { useEffect, useState, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import EmailRow from "@/app/components/EmailRow";
import type { EmailMessage } from "@/lib/gmail";

type LoadState = "idle" | "loading" | "error" | "done";

export default function InboxPage() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchEmails = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/emails/fetch");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch emails");
      }
      const data = await res.json();
      setEmails(data.emails ?? []);
      setLoadState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const unread = emails.filter((e) => !e.isRead);
  const allEmails = emails;
  const unreadCount = unread.length;

  return (
    <div className="inbox-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">✦</span>
          <span className="sidebar__logo-text">MailMind</span>
        </div>

        <nav className="sidebar__nav">
          <a href="/inbox" className="sidebar__link sidebar__link--active">
            <span className="sidebar__link-icon">📥</span>
            <span>Inbox</span>
            {unreadCount > 0 && (
              <span className="sidebar__badge">{unreadCount}</span>
            )}
          </a>
          <a href="#" className="sidebar__link sidebar__link--disabled">
            <span className="sidebar__link-icon">💤</span>
            <span>Snoozed</span>
          </a>
          <a href="#" className="sidebar__link sidebar__link--disabled">
            <span className="sidebar__link-icon">📰</span>
            <span>Newsletters</span>
          </a>
          <a href="#" className="sidebar__link sidebar__link--disabled">
            <span className="sidebar__link-icon">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar__footer">
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="inbox-main">
        {/* Header */}
        <div className="inbox-header">
          <div className="inbox-header__left">
            <h1 className="inbox-header__title">
              {unreadCount > 0 ? `(${unreadCount}) Inbox` : "Inbox"}
            </h1>
            {loadState === "done" && (
              <span className="inbox-header__count">{emails.length} emails</span>
            )}
          </div>
          <button
            className="refresh-btn"
            onClick={fetchEmails}
            disabled={loadState === "loading"}
            title="Refresh inbox"
          >
            <span className={loadState === "loading" ? "spin" : ""}>↻</span>
          </button>
        </div>

        {/* Loading skeleton */}
        {loadState === "loading" && (
          <div className="skeleton-list">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-avatar" />
                <div className="skeleton-content">
                  <div className="skeleton-line skeleton-line--short" />
                  <div className="skeleton-line skeleton-line--medium" />
                  <div className="skeleton-line skeleton-line--long" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {loadState === "error" && (
          <div className="inbox-error">
            <div className="inbox-error__icon">⚠️</div>
            <p className="inbox-error__message">{errorMsg}</p>
            <button className="inbox-error__retry" onClick={fetchEmails}>
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {loadState === "done" && emails.length === 0 && (
          <div className="inbox-empty">
            <div className="inbox-empty__icon">📭</div>
            <p>Your inbox is empty.</p>
          </div>
        )}

        {/* Email list */}
        {loadState === "done" && emails.length > 0 && (
          <div className="email-list">
            {/* Unread section */}
            {unread.length > 0 && (
              <section className="email-section">
                <div className="email-section__header">
                  <span className="email-section__label">Unread</span>
                  <span className="email-section__count">{unread.length}</span>
                </div>
                {unread.map((email) => (
                  <EmailRow key={email.id} email={email} />
                ))}
              </section>
            )}

            {/* All emails section */}
            <section className="email-section">
              <div className="email-section__header">
                <span className="email-section__label">All mail</span>
                <span className="email-section__count">{allEmails.length}</span>
              </div>
              {allEmails.map((email) => (
                <EmailRow key={email.id} email={email} />
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
