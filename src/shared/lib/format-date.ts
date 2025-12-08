export function formatDate(timestamp: number | null): string {
  if (!timestamp) return "—";

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeDate(timestamp: number | null): string {
  if (!timestamp) return "—";

  const now = Date.now();
  const date = timestamp * 1000;
  const diff = now - date;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return "только что";
  if (diff < hour) return `${Math.floor(diff / minute)} мин. назад`;
  if (diff < day) return `${Math.floor(diff / hour)} ч. назад`;
  if (diff < week) return `${Math.floor(diff / day)} дн. назад`;

  return formatDate(timestamp);
}
