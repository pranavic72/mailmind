import { google } from "googleapis";

function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  senderName: string;
  senderEmail: string;
  snippet: string;
  date: string;
  dateTimestamp: number;
  isRead: boolean;
  labelIds: string[];
}

function extractHeader(
  headers: { name: string; value: string }[],
  name: string
): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseSender(from: string): { name: string; email: string } {
  // Handles "Name <email>" or just "email"
  const match = from.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  }
  return { name: from.trim(), email: from.trim() };
}

export async function listMessageIds(
  accessToken: string,
  maxResults = 50
): Promise<{ id: string; threadId: string }[]> {
  const gmail = getGmailClient(accessToken);
  const res = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["INBOX"],
    maxResults,
  });
  return (res.data.messages ?? []) as { id: string; threadId: string }[];
}

export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<EmailMessage> {
  const gmail = getGmailClient(accessToken);
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["Subject", "From", "Date"],
  });

  const msg = res.data;
  const headers = (msg.payload?.headers ?? []) as { name: string; value: string }[];

  const subject = extractHeader(headers, "Subject") || "(no subject)";
  const from = extractHeader(headers, "From") || "";
  const dateHeader = extractHeader(headers, "Date") || "";
  const { name: senderName, email: senderEmail } = parseSender(from);

  const dateTimestamp = dateHeader ? new Date(dateHeader).getTime() : 0;
  const isRead = !(msg.labelIds ?? []).includes("UNREAD");

  return {
    id: msg.id ?? messageId,
    threadId: msg.threadId ?? "",
    subject,
    sender: from,
    senderName,
    senderEmail,
    snippet: msg.snippet ?? "",
    date: dateHeader,
    dateTimestamp,
    isRead,
    labelIds: msg.labelIds ?? [],
  };
}

export async function getMessages(
  accessToken: string,
  maxResults = 50
): Promise<EmailMessage[]> {
  const ids = await listMessageIds(accessToken, maxResults);

  // Fetch in parallel with concurrency cap to avoid rate limits
  const CHUNK = 10;
  const results: EmailMessage[] = [];

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const fetched = await Promise.all(
      chunk.map((m) => getMessage(accessToken, m.id))
    );
    results.push(...fetched);
  }

  // Sort: unread first, then by date descending
  results.sort((a, b) => {
    if (!a.isRead && b.isRead) return -1;
    if (a.isRead && !b.isRead) return 1;
    return b.dateTimestamp - a.dateTimestamp;
  });

  return results;
}
