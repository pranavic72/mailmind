"use client";

import type { EmailMessage } from "@/lib/gmail";

interface EmailRowProps {
  email: EmailMessage;
  onClick?: () => void;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic color from sender name
function getAvatarColor(name: string): string {
  const colors = [
    "#5C6BC0", "#42A5F5", "#26A69A", "#66BB6A",
    "#FFA726", "#EC407A", "#AB47BC", "#8D6E63",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function EmailRow({ email, onClick }: EmailRowProps) {
  const initials = getInitials(email.senderName || email.senderEmail || "?");
  const avatarColor = getAvatarColor(email.senderName || email.senderEmail || "");
  const dateStr = formatDate(email.date);

  return (
    <div
      onClick={onClick}
      className={`email-row ${!email.isRead ? "email-row--unread" : ""}`}
    >
      {/* Unread dot */}
      <div className="email-row__unread-dot">
        {!email.isRead && <span className="unread-dot" />}
      </div>

      {/* Avatar */}
      <div
        className="email-row__avatar"
        style={{ backgroundColor: avatarColor }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Content */}
      <div className="email-row__content">
        <div className="email-row__top">
          <span className="email-row__sender">
            {email.senderName || email.senderEmail}
          </span>
          <span className="email-row__date">{dateStr}</span>
        </div>
        <div className="email-row__subject">{email.subject}</div>
        <div className="email-row__snippet">{email.snippet}</div>
      </div>
    </div>
  );
}
