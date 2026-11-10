import globals from "globals";

/** Foundry VTT v14 globals the runtime uses. */
const FOUNDRY = Object.fromEntries([
  "foundry", "game", "ui", "canvas", "CONFIG", "CONST", "Hooks", "Roll", "ChatMessage", "Actor", "Item", "Combat",
  "fromUuid", "fromUuidSync", "Handlebars", "TextEditor"
].map(name => [name, "readonly"]));
const RULES = { "no-undef": "error", "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }] };

export default [
  { files: ["module/**/*.mjs"], languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.browser, ...FOUNDRY } }, rules: RULES },
  { files: ["tests/**/*.mjs"], languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.node, ...FOUNDRY } }, rules: RULES },
  { files: ["build/**/*.mjs", "eslint.config.mjs"], languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.node } }, rules: RULES }
];
