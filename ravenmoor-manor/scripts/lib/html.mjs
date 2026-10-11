/**
 * The one HTML escaper, shared by the build and the runtime. Foundry-free.
 * Actor and user names are player-controlled, so every name that goes into chat, a window or a journal goes through
 * this.
 * @param {string} text
 * @returns {string}
 */
export function escapeHTML(text) {
  return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}
