import RollPrompt from "../dialogs/roll-prompt.js";
import AddActiveEffectPrompt from "../dialogs/add-active-effect-dialogue.js";

export default class OVACharacterSheet extends foundry.appv1.sheets.ActorSheet {

  constructor(...args) {
    super(...args);
    this.selectedAbilities = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ova/templates/sheets/ova-character-sheet.html",
      tabs: [{ navSelector: ".combat-tabs", contentSelector: ".combat-content" }],
      scrollY: [".ability-card"],
      classes: ["ova"]
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */
  getData() {
    const context = super.getData();
    const actor = this.actor;

    context.actor = actor;
    context.system = actor?.system ?? {};
    context.config = CONFIG.OVA;
    context.selectedAbilities = this.selectedAbilities;

    context.abilities = [];
    context.weaknesses = [];
    context.attacks = [];
    context.spells = [];

    let abilityLevels = 0;
    let weaknessLevels = 0;

    for (const item of actor.items) {
      const system = item?.system ?? {};

      if (item.type === "attack") {
        context.attacks.push(item);
        continue;
      }

      if (item.type === "spell") {
        context.spells.push(item);
        continue;
      }

      if (system.rootId !== "") continue;

      if (system.type === "ability") {
        abilityLevels += system.level?.value ?? 0;
        context.abilities.push(item);
      }

      if (system.type === "weakness") {
        weaknessLevels += system.level?.value ?? 0;
        context.weaknesses.push(item);
      }
    }

    context.abilityLevels = abilityLevels;
    context.weaknessLevels = weaknessLevels;
    context.totalLevels = abilityLevels - weaknessLevels;

    context.abilities.sort((a, b) => a.name.localeCompare(b.name));
    context.weaknesses.sort((a, b) => a.name.localeCompare(b.name));

    return context;
  }

  /* -------------------------------------------- */
  /*  Listeners                                   */
  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".item-edit").on("click", ev => this._editItem(ev));
    html.find(".ability-name").on("click", ev => this._selectAbility(ev));
    html.find(".ability-active").on("click", ev => this._toggleAbility(ev));
    html.find(".roll-dice").on("click", ev => this._makeManualRoll(ev));
    html.find(".attack-block").on("click", ev => this._makeAttackRoll(ev));
    html.find(".defense-value").on("click", ev => this._makeDefenseRoll(ev));
    html.find(".add-active-effect").on("click", ev => this._addActiveEffect(ev));
    html.find(".effect-delete").on("click", ev => this._removeEffect(ev));
  }

  /* -------------------------------------------- */
  /*  Item Helpers                                */
  /* -------------------------------------------- */
  _getItemId(event) {
    return event.currentTarget.closest(".item")?.dataset?.itemId;
  }

  _editItem(event) {
    event.preventDefault();
    const item = this.actor.items.get(this._getItemId(event));
    item?.sheet.render(true);
  }

  async _toggleAbility(event) {
    event.preventDefault();
    const item = this.actor.items.get(this._getItemId(event));
    if (!item) return;

    const active = !item.system?.active;
    const updates = [{ _id: item.id, "system.active": active }];

    const children = this.actor.items.filter(i => i.system?.rootId === item.id);
    for (const c of children) updates.push({ _id: c.id, "system.active": active });

    await this.actor.updateEmbeddedDocuments("Item", updates);
  }

  async _selectAbility(event) {
    event.preventDefault();
    const id = this._getItemId(event);

    if (this.selectedAbilities.includes(id)) {
      this.selectedAbilities = this.selectedAbilities.filter(a => a !== id);
    } else {
      this.selectedAbilities.push(id);
    }

    this.render(false);
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */
  async _makeManualRoll(event) {
    event.preventDefault();

    const abilities = this.actor.items.filter(i => this.selectedAbilities.includes(i.id));
    let roll = this.actor.system?.globalMod ?? 0;
    let enduranceCost = 0;

    for (const a of abilities) {
      const sign = a.system?.type === "weakness" ? -1 : 1;
      roll += sign * (a.system?.level?.value ?? 0);
      enduranceCost += a.system?.enduranceCost ?? 0;
    }

    await this._makeRoll({
      roll,
      enduranceCost,
      abilities,
      callback: () => abilities.forEach(a => a.use?.())
    });
  }

  async _makeRoll({ roll, enduranceCost = 0, callback }) {
    const result = await new RollPrompt("", "manual", this.actor, null, enduranceCost, roll).show();
    if (!result) return;

    callback?.();
    this.selectedAbilities = [];
    this.render();
  }

  /* -------------------------------------------- */
  /*  Effects                                     */
  /* -------------------------------------------- */
  _removeEffect(event) {
    event.preventDefault();
    const id = this._getItemId(event);
    this.actor.deleteEmbeddedDocuments("ActiveEffect", [id]);
  }

  _addActiveEffect() {
    new AddActiveEffectPrompt(this.actor).render(true);
  }

  /* -------------------------------------------- */
  /*  Save Sheet Changes                           */
  /* -------------------------------------------- */
  async _updateObject(event, formData) {
    event.preventDefault();
    // This updates the actor with all changes from the form
    await this.actor.update(formData);
  }
}
