/**
 * Every rules default the workbook does not spell out lives here, in one place, so an answer on the decisions page is
 * a one-line change. Values marked "pending" are defaults waiting on the user's answer.
 * Pure data: no Foundry globals, so the Node tests import it too.
 */
export const SYSTEM_ID = "possibilities";

export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
export const GRADES = ["F", "E", "D", "C", "B", "A", "S"];
export const RANKS = ["Novice", "Apprentice", "Journeyman", "Adept", "Master"];
export const TRAINING = ["Untrained", "Trained", "Expert", "Master", "Legendary"];
export const ZONES = ["engaged", "near", "far", "distant"];
export const ARMOUR_TYPES = ["Light", "Medium", "Heavy"];
export const ROLES = ["minion", "standard", "elite", "boss"];
export const CONDITIONS = ["intact", "damaged", "broken"];
export const APTNESS = ["full", "half", "none"];
export const DENOMINATIONS = ["cp", "sp", "gp", "pp"];
export const UNCLASSED_HIT_DIE = "d6";
export const UNARMED_DIE = "d4";

export const DEFAULTS = {
  actionsPerTurn: 3,
  /** Multiple attack penalty by the number of attacks already made this turn. */
  map: [0, -4, -8],
  /** Raise Guard: AC bonus until the start of your next turn (pending). */
  guardBonus: 2,
  /** Aid: bonus to one ally's next check (pending). */
  aidBonus: 2,
  /** Beat the DC by this for a critical success; miss by this for a critical failure. */
  critMargin: 10,
  critDamageMultiplier: 1.5,
  /** Dying: recovery check is d20 + CON save vs this (pending). */
  recoveryDC: 12,
  dyingPips: 3,
  /** Points pool for signatures and spells (pending). Variables: @combatEL @craftEL @castMod. */
  pointsFormula: "3 + @combatEL",
  /** Short rest: hit dice you may spend = max(1, Combat EL) minus dice already spent (pending). */
  minShortRestDice: 1,
  /** Scene effort multipliers. */
  aptness: { full: 1, half: 0.5, none: 0 },
  /** NPC hit points by role (pending). */
  roleHP: { minion: 0.5, standard: 1, elite: 1.5, boss: 2.5 },
  /** Action costs (pending where the workbook is silent). */
  costs: { strike: 1, stride: 1, guard: 1, aid: 1, stabilise: 1, recall: 1, interact: 1, withdraw: 3 },
  coin: { cp: 1, sp: 10, gp: 100, pp: 1000 }
};

/** Labels for degrees of success, index 0..3. */
export const DEGREES = ["Critical Failure", "Failure", "Success", "Critical Success"];
