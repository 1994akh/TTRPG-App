/**
 * The hero creator (no class: heroes start Unclassed), the binding dialog (pick an F-grade class), and small pickers.
 */
import { RULES } from "./rules-data.mjs";
import { card, esc, post, setting } from "./dice.mjs";

const DialogV2 = () => foundry.applications.api.DialogV2;
const formData = form => new foundry.applications.ux.FormDataExtended(form).object;
const FAMILIES = ["Founding", "Beastkin", "Fae", "Monsterkin"];

function raceOptions(selected) {
  const fams = [...new Set([...FAMILIES, ...RULES.races.map(r => r.family)])];
  return fams.map(f => {
    const races = RULES.races.filter(r => r.family === f).sort((a, b) => a.name.localeCompare(b.name));
    if ( !races.length ) return "";
    return `<optgroup label="${esc(f)}">${races.map(r => `<option value="${esc(r.id)}" ${r.id === selected ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</optgroup>`;
  }).join("");
}

/** Race, profession and class details for the creator's info panels. */
function raceInfo(r) {
  const a = r.grades.F.abilities;
  return `${r.family}. ${Object.entries(a).map(([k, v]) => `${k} ${v}`).join(", ")}. Skills: ${r.skills.join(", ")}. ${r.trait}`;
}
function nodeInfo(n) {
  const ab = Object.entries(n.abilities).filter(([, v]) => v).map(([k, v]) => `${k} +${v}`).join(", ");
  return `${n.line}. ${ab}. Skills: ${n.skills.join(", ")}. ${n.feature}: ${n.feature_text}`;
}

/**
 * The creator: name, race, profession, skills, pronouns, look. No class (heroes start Unclassed).
 * @returns {Promise<Actor|null>}
 */
export async function createHero({ folder=null }={}) {
  const professions = RULES.professions.filter(p => p.grade === "F");
  const extra = setting("creatorExtraSkills", 2);
  const skills = RULES.skills.map(s => `<label class="poss-check"><input type="checkbox" name="skill.${esc(s.id)}"> ${esc(s.id)} <small>${s.ability}</small></label>`).join("");
  const content = `<div class="poss-dialog poss-creator">
    <p class="hint">${game.i18n.localize("POSS.Creator.Hint")}</p>
    <label>${game.i18n.localize("POSS.Name")} <input type="text" name="name" required autofocus></label>
    <div class="row"><label>${game.i18n.localize("POSS.Pronouns")} <input type="text" name="pronouns" placeholder="they/them"></label>
      <label>${game.i18n.localize("POSS.Age")} <input type="text" name="age"></label></div>
    <label>${game.i18n.localize("POSS.Race")} <select name="race" data-info="race">${raceOptions("Human")}</select></label>
    <p class="info" data-info-for="race"></p>
    <label>${game.i18n.localize("POSS.Profession")} <select name="profession" data-info="profession">${professions.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select></label>
    <p class="info" data-info-for="profession"></p>
    <fieldset><legend>${game.i18n.format("POSS.Creator.Skills", { n: extra })}</legend><div class="poss-skill-grid">${skills}</div></fieldset>
    <label>${game.i18n.localize("POSS.Drive")} <input type="text" name="drive"></label>
    <label>${game.i18n.localize("POSS.Appearance")} <textarea name="appearance" rows="3"></textarea></label>
  </div>`;
  const result = await DialogV2().wait({
    window: { title: game.i18n.localize("POSS.Creator.Title"), icon: "fa-solid fa-user-plus" },
    position: { width: 560 },
    content,
    rejectClose: false,
    render: (event, dialog) => {
      const el = dialog.element;
      const update = () => {
        const r = RULES.races.find(x => x.id === el.querySelector("[name=race]").value);
        const p = RULES.professions.find(x => x.id === el.querySelector("[name=profession]").value);
        el.querySelector("[data-info-for=race]").textContent = r ? raceInfo(r) : "";
        el.querySelector("[data-info-for=profession]").textContent = p ? nodeInfo(p) : "";
        const auto = new Set([...(r?.skills ?? []), ...(p?.skills ?? [])]);
        for ( const box of el.querySelectorAll("input[name^='skill.']") ) {
          const id = box.name.slice(6);
          box.disabled = auto.has(id);
          if ( auto.has(id) ) box.checked = true;
        }
      };
      el.querySelectorAll("select").forEach(s => s.addEventListener("change", update));
      update();
    },
    buttons: [{
      action: "create", label: game.i18n.localize("POSS.Creator.Create"), icon: "fa-solid fa-check", default: true,
      callback: (event, button) => {
        const data = formData(button.form);
        const boxes = [...button.form.querySelectorAll("input[name^='skill.']")];
        data.chosen = boxes.filter(b => b.checked && !b.disabled).map(b => b.name.slice(6));
        return data;
      }
    }, { action: "cancel", label: game.i18n.localize("Cancel") }]
  });
  if ( !result || (result === "cancel") ) return null;
  return makeHero(result, { folder, extra });
}

/** Build the hero from the creator's answers (also used by tests and the module's pregens). */
export async function makeHero(data, { folder=null, extra=2 }={}) {
  const race = RULES.races.find(r => r.id === data.race);
  const prof = RULES.professions.find(p => p.id === data.profession);
  const allowed = extra + (race?.id === "Human" ? 1 : 0);
  const chosen = (data.chosen ?? []).slice(0, allowed);
  const trained = new Set([...(race?.skills ?? []), ...(prof?.skills ?? []), ...chosen]);
  const skills = Object.fromEntries([...trained].map(id => [id, "Trained"]));
  const actor = await Actor.create({
    name: data.name || game.i18n.localize("POSS.Creator.Unnamed"), type: "hero", folder,
    system: {
      race: race?.id ?? "Human", raceGrade: "F",
      class: { node: "", rank: "Novice" }, profession: { node: prof?.id ?? "Sailor", rank: "Novice" },
      training: { skills },
      details: { pronouns: data.pronouns ?? "", age: data.age ?? "", drive: data.drive ?? "", appearance: data.appearance ? `<p>${esc(data.appearance)}</p>` : "" },
      story: { role: "pc" }
    }
  });
  if ( actor ) {
    await actor.update({ "system.hp.value": actor.system.derived.hpMax, "system.points.value": actor.system.derived.pointsMax });
    actor.sheet?.render(true);
  }
  return actor;
}

/**
 * Binding: the hero is bound into an F-grade class for the fee. The trio take theirs from their story path.
 * @returns {Promise<string|null>} the class id
 */
export async function bind(actor, { node=null }={}) {
  if ( actor?.type !== "hero" ) return null;
  let pick = node ?? actor.system.story.path.class[0] ?? null;
  if ( !pick ) {
    const classes = RULES.classes.filter(c => c.grade === "F");
    const content = `<div class="poss-dialog poss-bind"><p class="hint">${game.i18n.format("POSS.Bind.Hint", { name: esc(actor.name) })}</p>
      ${classes.map((c, i) => `<label class="poss-choice"><input type="radio" name="node" value="${esc(c.id)}" ${i === 0 ? "checked" : ""}>
        <span><b>${esc(c.name)}</b> <small>${esc(c.line)} · ${c.hit_die} · ${c.primary}/${c.secondary}</small><br>
        <small>${esc(c.feature)}: ${esc(c.feature_text)}</small><br><small>${game.i18n.localize("POSS.Signature")}: ${esc(c.signature)}</small></span></label>`).join("")}
    </div>`;
    pick = await DialogV2().wait({
      window: { title: game.i18n.format("POSS.Bind.Title", { name: actor.name }), icon: "fa-solid fa-bolt" },
      position: { width: 520, height: 620 },
      content, rejectClose: false,
      buttons: [{ action: "bind", label: game.i18n.localize("POSS.Bind.Confirm"), default: true, callback: (e, b) => formData(b.form).node },
        { action: "cancel", label: game.i18n.localize("Cancel") }]
    });
    if ( !pick || (pick === "cancel") ) return null;
  }
  return applyBinding(actor, pick);
}

/** Set the class, train its skills and basic weapons/armour, add its feature and signature, refill HP and points. */
export async function applyBinding(actor, node) {
  const cls = RULES.classes.find(c => c.id === node);
  if ( !cls ) throw new Error(`Unknown class "${node}"`);
  const s = actor.system;
  const update = { "system.class.node": cls.id, "system.class.rank": "Novice" };
  for ( const id of cls.skills ) if ( s.training.skills[id] === "Untrained" ) update[`system.training.skills.${id}`] = "Trained";
  if ( s.training.weapon === "Untrained" ) update["system.training.weapon"] = "Trained";
  if ( s.training.armour === "Untrained" ) update["system.training.armour"] = "Trained";
  if ( s.castAbility === "None" ) update["system.castAbility"] = cls.primary;
  await actor.update(update);
  const items = [];
  if ( !actor.items.some(i => i.type === "feature" && i.name === cls.feature) ) {
    items.push({ name: cls.feature, type: "feature", img: "icons/svg/upgrade.svg", system: { text: `<p>${esc(cls.feature_text)}</p>` } });
  }
  const sig = RULES.signatures.find(x => x.id === cls.signature);
  if ( sig && !actor.items.some(i => i.type === "signature" && i.name === sig.name) ) {
    items.push({ name: sig.name, type: "signature", img: "icons/svg/lightning.svg",
      system: { line: sig.line, tier: sig.tier, grade: sig.grade, points: sig.points, cost: sig.cost, effect: sig.effect } });
  }
  if ( items.length ) await actor.createEmbeddedDocuments("Item", items);
  await actor.update({ "system.hp.value": actor.system.derived.hpMax, "system.points.value": actor.system.derived.pointsMax });
  await post(actor, card({ title: game.i18n.format("POSS.Bind.Done", { name: actor.name, node: cls.name }), tone: "crit-success",
    body: `<p>${esc(cls.feature)}: ${esc(cls.feature_text)}</p><p>Combat EL ${actor.system.derived.combatEL} · HP ${actor.system.derived.hpMax} · AC ${actor.system.derived.ac}</p>` }));
  Hooks.callAll("possibilities.bound", actor, cls.id);
  return cls.id;
}

/** Pick an ally (for Aid and Stabilise). */
export async function pickAlly(actor, { filter=() => true, title="" }={}) {
  const list = game.actors.filter(a => a.type === "hero" && a.id !== actor.id && filter(a));
  if ( !list.length ) {
    ui.notifications.info(game.i18n.localize("POSS.Warn.NoAllies"));
    return null;
  }
  const content = `<div class="poss-dialog">${list.map((a, i) => `<label class="poss-choice"><input type="radio" name="id" value="${a.id}" ${i === 0 ? "checked" : ""}> ${esc(a.name)}</label>`).join("")}</div>`;
  const id = await DialogV2().wait({
    window: { title }, content, rejectClose: false,
    buttons: [{ action: "ok", label: "OK", default: true, callback: (e, b) => formData(b.form).id }, { action: "cancel", label: game.i18n.localize("Cancel") }]
  });
  return game.actors.get(id) ?? null;
}

/** How many hit dice to spend on a short rest. */
export async function pickHitDice(actor) {
  const left = actor.system.derived.hitDiceLeft;
  if ( left <= 0 ) return 0;
  const n = await DialogV2().wait({
    window: { title: game.i18n.localize("POSS.Rest.Short") },
    content: `<div class="poss-dialog"><label>${game.i18n.format("POSS.Rest.HowMany", { left, die: actor.system.derived.hitDie })}
      <input type="number" name="n" min="1" max="${left}" value="${left}"></label></div>`,
    rejectClose: false,
    buttons: [{ action: "ok", label: game.i18n.localize("POSS.Rest.Short"), default: true, callback: (e, b) => Number(formData(b.form).n) },
      { action: "cancel", label: game.i18n.localize("Cancel") }]
  });
  return typeof n === "number" ? n : 0;
}

