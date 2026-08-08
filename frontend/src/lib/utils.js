import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Alias for legacy components using `cls`
export const cls = cn;

// Back-compat reader for task assignees. Tasks may carry `assignees` (array of
// populated user objects or ids) and/or a legacy single `assignee`. Returns a
// normalized array of user-ish objects ({ _id, name?, avatar? }).
export function taskAssignees(task) {
  if (!task) return [];
  const raw = (Array.isArray(task.assignees) && task.assignees.length)
    ? task.assignees
    : (task.assignee ? [task.assignee] : []);
  return raw
    .map(a => (a && typeof a === 'object') ? a : (a ? { _id: a } : null))
    .filter(Boolean);
}

// Just the ids (strings) of a task's assignees.
export function taskAssigneeIds(task) {
  return taskAssignees(task).map(a => (a._id || a).toString());
}

// Format ISO date to MMM DD, YYYY
export function fmtDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Relative time (e.g. "just now", "5m ago", "3h ago")
export function fmtRelative(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  if (isNaN(diff)) return "";
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDate(dateString);
}

// WhatsApp-style message timestamp: clock time for today ("4:41 pm"),
// "Yesterday" for the previous day, weekday name within the last week,
// else a short date — never "Nm ago".
export function fmtChatTime(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d)) return "";
  const now = new Date();
  const h24 = d.getHours();
  const h12 = h24 % 12 || 12;
  const mins = String(d.getMinutes()).padStart(2, "0");
  const time = `${h12}:${mins} ${h24 < 12 ? "am" : "pm"}`;

  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  if (dayDiff === 0) return time;
  if (dayDiff === 1) return `Yesterday ${time}`;
  if (dayDiff < 7) return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
  return `${fmtDate(dateString)} ${time}`;
}

// Human-readable file size (e.g. "1.2 MB")
export function fmtBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`;
}

// Status to color mapping for Kanban/Dashboard
export const statusColor = {
  "To Do":       "#6366f1",
  "In Progress": "#f59e0b",
  "In Review":   "#00d4ff",
  "Done":        "#10b981",
};
