export function fmtKickoff(iso) {
  return new Date(iso).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
}

export function fmtFixtureWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday:"short", day:"numeric", month:"short" }) +
    " · " + d.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
}

export function timeAgo(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmtHistDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
