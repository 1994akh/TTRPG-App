/**
 * The "Rules of Possibilities" journal: what this system implements, page by page. Defaults the workbook does not
 * settle are marked "Default, pending your answer" (they are questions on the Possibilities Foundry decisions page).
 */
import { DEFAULTS } from "../module/config.mjs";

const PENDING = '<span class="poss-pending">Default, pending your answer</span>';

export function rulesPages(c) {
  const k = c.engine.constants;
  const grades = c.engine.grades.map(g => `<tr><td>${g.grade}</td><td>${g.index}</td><td>${g.rgm}</td></tr>`).join("");
  const prof = c.engine.proficiency.map(p => `<tr><td>${p.rank}</td><td>+${p.bonus}</td></tr>`).join("");
  const armour = c.engine.armour.map(a => `<tr><td>${a.type}</td><td>+${a.base_ac}</td><td>${a.dex_cap >= 99 ? "none" : `+${a.dex_cap}`}</td></tr>`).join("");
  const costs = DEFAULTS.costs;
  return [
    {
      name: "The three tracks",
      content: `<p>Every hero has three tracks. <b>Race</b> sets ability scores and the Race Grade Multiplier (RGM). <b>Class</b>
        (combat) sets Combat EL. <b>Profession</b> (trade, craft, knowledge) sets Craft EL. Ability scores are race + class +
        profession; nobody rolls them.</p>
        <p><b>EL</b> = grade index × ${k.el_per_grade.value} + rank index (Novice 1 … Master 5): F-Novice is 1, S-Master is 35.
        XP to the next rank = ${k.xp_coefficient.value} × EL².</p>
        <p><b>Unclassed</b> (the tier below F): Combat EL 0, hit die d6, no class abilities. Heroes start Unclassed and are
        bound into a class for a fee.</p>
        <p>Race grade rises only when class and profession are both at Master of the current grade. Combat EL and Craft EL may
        not differ by more than ${k.max_track_divergence_el.value}; the sheet warns before that.</p>
        <table><tr><th>Grade</th><th>Index</th><th>RGM</th></tr>${grades}</table>`
    },
    {
      name: "The character sheet",
      content: `<p>Every number on the hero sheet is the workbook's Character Sheet formula, checked against the workbook's own
        values for its pregen Vera and 200 more test characters.</p>
        <ul>
        <li>Modifier = floor((score − 10) / 2). Save = modifier + training + Combat EL.</li>
        <li>AC = 10 + DEX (capped by armour) + armour + gear bonus + armour training + Combat EL.</li>
        <li>Max HP = max(hit die, round((die/2 + 0.5 + CON) × Combat EL × RGM)).</li>
        <li>Attack = best of STR/DEX + weapon training + Combat EL. Spell DC = 10 + casting modifier + spell training + Combat EL.</li>
        <li>Damage = (1 + Combat EL ÷ 4) weapon dice + a bonus that applies the RGM. Craft effort is the same with Craft EL and the best mental modifier.</li>
        <li>Skill = modifier + training + the track's EL (Combat or Craft, per skill).</li>
        </ul>
        <table><tr><th>Training</th><th>Bonus</th></tr>${prof}</table>
        <table><tr><th>Armour</th><th>AC</th><th>DEX cap</th></tr>${armour}</table>`
    },
    {
      name: "Checks and degrees",
      content: `<p>Roll d20 + modifier against a DC. Beat it by ${DEFAULTS.critMargin} for a <b>critical success</b>; miss by
        ${DEFAULTS.critMargin} for a <b>critical failure</b>. A natural 20 raises the result one step, a natural 1 lowers it one step.</p>
        <p>Standard DC = ${k.standard_dc_base.value} + the target's EL + ${k.grade_compensation.value} × its grade index.</p>
        <p>Chat cards show the readout: <i>14 + 7 = 21 vs DC 19 · Success</i>.</p>`
    },
    {
      name: "Turns and actions",
      content: `<p>Each hero has <b>${DEFAULTS.actionsPerTurn} actions</b> a turn, shown as pips on the sheet; they refill when
        the hero's turn starts. Spending more than you have only warns, so you can bend the rules mid-play.</p>
        <table><tr><th>Action</th><th>Cost</th><th>Effect</th></tr>
        <tr><td>Strike</td><td>${costs.strike}</td><td>Attack vs AC. 2nd attack in a turn −4, 3rd and later −8. Critical: damage × ${DEFAULTS.critDamageMultiplier}.</td></tr>
        <tr><td>Stride</td><td>${costs.stride}</td><td>Move one zone (Engaged, Near, Far, Distant).</td></tr>
        <tr><td>Raise Guard</td><td>${costs.guard}</td><td>+${DEFAULTS.guardBonus} AC until your next turn. ${PENDING}</td></tr>
        <tr><td>Aid</td><td>${costs.aid}</td><td>+${DEFAULTS.aidBonus} to one ally's next check. ${PENDING}</td></tr>
        <tr><td>Stabilise</td><td>${costs.stabilise}</td><td>An Engaged ally at 0 HP stops Dying, no roll.</td></tr>
        <tr><td>Recall Knowledge</td><td>${costs.recall}</td><td>A check to learn about a foe.</td></tr>
        <tr><td>Interact</td><td>${costs.interact}</td><td>Draw, pick up, open, pull a lever.</td></tr>
        <tr><td>Withdraw</td><td>${costs.withdraw}</td><td>Leave the fight.</td></tr>
        <tr><td>Signatures and spells</td><td>as listed</td><td>Cost points: tier = points.</td></tr>
        </table>
        <p>The points pool for signatures and spells is <b>${DEFAULTS.pointsFormula.replace("@combatEL", "Combat EL")}</b>, refilled by a long rest. ${PENDING}</p>`
    },
    {
      name: "Dying",
      content: `<p>At 0 HP a hero gains <b>Dying</b>. At the start of each of their turns they make a recovery check: d20 + CON
        save vs DC ${DEFAULTS.recoveryDC}. ${PENDING}</p>
        <ul><li>Success: stable at 0 HP.</li><li>Failure: mark a pip. ${DEFAULTS.dyingPips} pips in one fight: dead.</li>
        <li>Stabilise (any ally, 1 action) or healing above 0 ends Dying.</li>
        <li>Each time a hero recovers they gain Wounded; Wounded adds failed pips when Dying starts again that day.</li></ul>
        <p>Death is permanent only with the <b>Undertaking</b> world setting on (off by default). Otherwise a hero at
        ${DEFAULTS.dyingPips} pips is Defeated: down until healed or rested.</p>`
    },
    {
      name: "Scenes",
      content: `<p>Negotiations, hazards, chases and ruins run on the same engine as fights. A <b>Scene</b> (actor type
        "Scene") has <b>Resistance</b> (its hit points), a DC, and <b>approaches</b>. Each approach is <b>Full</b>,
        <b>Half</b> or <b>None</b> for a hero, by their class, profession or trained skills; the Scene sheet shows each
        hero's aptness before they try.</p>
        <p>An attempt (1 action ${PENDING}) is the approach's skill check vs the Scene DC. On a success the hero's effort
        (Craft effort for Craft skills, Strike damage for Combat skills) comes off Resistance: × 1 Full, × ½ Half, × 0 None,
        × ${DEFAULTS.critDamageMultiplier} on a critical. A failure triggers a <b>Setback</b> when the approach says so; a
        critical failure always does. Setbacks can deal damage and damage loaned gear.</p>
        <p>A Scene may have a <b>clock</b>, which ticks once per round when the Scene is in the combat tracker. When the
        clock runs out, the Scene is lost.</p>
        <p>Fights can often be solved by a Scene instead, for the same reward.</p>`
    },
    {
      name: "Foes",
      content: `<p>NPC stats default to the Engine sheet's benchmarks and can be overridden on the sheet.</p>
        <ul><li>AC = ${k.enemy_ac_base.value} + EL + grade compensation. Attack = ${k.enemy_attack_base.value} + EL + grade compensation.</li>
        <li>HP = (${k.enemy_hp_base.value} + ${k.enemy_hp_per_el.value} × EL) × RGM × role (minion ½, standard 1, elite 1½, boss 2½ ${PENDING}).</li>
        <li>Damage per round = ${k.enemy_damage_per_el.value} × EL × RGM (at least 1), shown as dice.</li></ul>`
    },
    {
      name: "Rest, money and gear",
      content: `<p><b>Short rest:</b> spend hit dice (each heals hit die + CON); you have max(1, Combat EL) dice a day. ${PENDING}
        <b>Long rest:</b> full HP and points; Dying and Wounded clear.</p>
        <p><b>Money:</b> 10 cp = 1 sp, 10 sp = 1 gp, 10 gp = 1 pp. Prices and wages × ${k.grade_price_multiplier.value} per
        grade (a longsword is 15 gp at F, 45 gp at E).</p>
        <p><b>Loaned gear</b> carries a Loaned badge and a condition: intact, damaged or broken. Condition has no effect on
        rolls yet. ${PENDING}</p>`
    }
  ];
}
