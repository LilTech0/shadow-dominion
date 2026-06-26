import { createPlayer } from "./combat";

export function getAccounts() {
  try { return JSON.parse(localStorage.getItem("accounts")||"{}"); } catch { return {}; }
}
export function saveAccounts(a) { localStorage.setItem("accounts", JSON.stringify(a)); }
export function getSyndicates() {
  try { return JSON.parse(localStorage.getItem("syndicates")||"[]"); } catch { return []; }
}
export function saveSyndicates(s) { localStorage.setItem("syndicates", JSON.stringify(s)); }
export function getAnnouncements() {
  try { return JSON.parse(localStorage.getItem("announcements")||"[]"); } catch { return []; }
}
export function saveAnnouncements(a) { localStorage.setItem("announcements", JSON.stringify(a)); }
