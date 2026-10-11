import globals from "globals";

/** Foundry VTT v14 and dnd5e globals the runtime uses. */
const FOUNDRY = Object.fromEntries([
  "foundry", "game", "ui", "canvas", "CONFIG", "CONST", "Hooks", "Roll", "ChatMessage", "Actor", "Combat",
  "fromUuid", "Scene", "JournalEntry", "dnd5e"
].map(name => [name, "readonly"]));

export default [
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.browser, ...FOUNDRY } },
    rules: { "no-undef": "error", "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }] }
  },
  {
    files: ["tests/**/*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.node, ...globals.browser, ...FOUNDRY } },
    rules: { "no-undef": "error", "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }] }
  },
  {
    files: ["build/**/*.mjs", "eslint.config.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.node } },
    rules: { "no-undef": "error", "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }] }
  }
];
