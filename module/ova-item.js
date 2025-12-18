import OVAEffect from './effects/ova-effect.js';

export default class OVAItem extends Item {

  /** @param {Item[]} perks */
  async addPerks(perks) {
    const currentPerks = this.system.perks ?? [];

    const newPerkData = [];
    const updatedPerkData = [];

    for (const perk of perks) {
      const index = currentPerks.findIndex(p => p.name === perk.name);
      if (index === -1) {
        newPerkData.push(perk);
      } else {
        updatedPerkData.push({
          _id: currentPerks[index]._id,
          "system.level.value": currentPerks[index].system.level.value + 1
        });
      }
    }

    const newPerks = newPerkData.length
      ? await this.actor.createEmbeddedDocuments("Item", newPerkData)
      : [];

    if (updatedPerkData.length) {
      await this.actor.updateEmbeddedDocuments("Item", updatedPerkData);
    }

    const perkIds = [...currentPerks, ...newPerks.map(p => p.id)];
    await this.update({ "system.perks": perkIds });
  }

  async removePerk(perkId) {
    const currentPerks = this.system.perks ?? [];
    const perk = this.actor.items.get(perkId);
    if (!perk) return;

    if (perk.system.level.value > 1) {
      await perk.update({
        "system.level.value": perk.system.level.value - 1
      });
    } else {
      await this.actor.deleteEmbeddedDocuments("Item", [perkId]);
      await this.update({
        "system.perks": currentPerks.filter(id => id !== perkId)
      });
    }
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    if (!this.isEmbedded) return;

    this._preparePerks();

    if (this.type === "ability") this._prepareAbilityData();
    if (this.type === "attack") this._prepareAttackData();
    if (this.type === "spell") this._prepareSpellData();
  }

  static SPELL_COST = [
    [20, 30, 40, 50, 60],
    [10, 20, 30, 40, 50],
    [ 5, 10, 20, 30, 40],
    [ 2,  5, 10, 20, 30],
    [ 0,  2,  5, 10, 20],
  ];

  _preparePerks() {
    const perks = this.system.perks ?? [];
    if (!perks.length) return;

    const actorPerks = this.actor.items
      .filter(i => i.type === "perk" && perks.includes(i.id));

    actorPerks.sort((a, b) => a.name.localeCompare(b.name));

    this.perks = actorPerks;
    this.ovaEffects = [];
    this.combinedPerks = [];

    let enduranceCost = this.system.enduranceCost ?? 0;

    for (const perk of actorPerks) {
      this.combinedPerks.push(perk);
      enduranceCost += (perk.system.level.value * (perk.system.enduranceCost ?? 0));

      for (const effect of perk.system.effects ?? []) {
        this.ovaEffects.push(new OVAEffect(perk, effect));
      }
    }

    this.enduranceCost = Math.max(enduranceCost, 0);

    if (["perk", "ability"].includes(this.type)) {
      for (const effect of this.system.effects ?? []) {
        this.ovaEffects.push(new OVAEffect(this, effect));
      }
    }
  }

  _getRollAbilities() {
    const abilityIds = this.system.abilities ?? [];

    const abilities = abilityIds
      .map(id => this.actor.items.get(id))
      .filter(a => a?.system.active);

    if (this.actor.sheet?._getSelectedAbilities) {
      const extra = this.actor.sheet._getSelectedAbilities();
      abilities.push(...extra.filter(a => !abilityIds.includes(a.id)));
    }

    return abilities;
  }

  _prepareSpellData() {
    const selectedAbilities = this._getRollAbilities();
    const magicAbility = selectedAbilities.find(a => a.system.magic);

    this._linkedAbilities = selectedAbilities;
    this.enduranceCost = 0;

    if (magicAbility) {
      const effectLevel = selectedAbilities.reduce(
        (sum, a) => sum + a.system.level.value, 0
      );

      this.enduranceCost =
        OVAItem.SPELL_COST[magicAbility.system.level.value - 1]?.[effectLevel - 1] ?? 0;
    }
  }

  _prepareAttackData() {
    const abilities = this._getRollAbilities();
    this._linkedAbilities = abilities;

    for (const a of abilities) {
      for (const e of a.ovaEffects ?? []) {
        this.ovaEffects.push(e);
      }
      this.enduranceCost += a.enduranceCost ?? 0;
    }

    this.ovaEffects
      .sort((a, b) => a.data.priority - b.data.priority)
      .forEach(e => e.apply(this));
  }

  resetLimitedUse() {
    this.update({ "system.limitedUse.value": this.system.limitedUse.max });
  }

  get hasUses() {
    const use = this.system.limitedUse;
    return !use || use.max <= 0 || use.value > 0;
  }

  async use() {
    const use = this.system.limitedUse;
    if (use && use.value <= 0) return;

    if (use) {
      await this.update({ "system.limitedUse.value": use.value - 1 });
    }

    for (const a of this._linkedAbilities ?? []) {
      await a.use?.();
    }
  }

  _prepareAbilityData() {
    const data = this.system;
    data.level.mod = 0;

    if (data.isRoot) {
      const children = this.actor.items.filter(
        i => i.system.rootId === this.id
      );
      this._linkedAbilities = children;
    }

    data.level.total = data.level.value + data.level.mod;
  }

  async _preDelete() {
    if (this.system.perks?.length) {
      await this.actor?.deleteEmbeddedDocuments("Item", this.system.perks);
    }

    if (this.system.isRoot) {
      const children = this.actor.items
        .filter(i => i.system.rootId === this.id)
        .map(i => i.id);
      await this.actor?.deleteEmbeddedDocuments("Item", children);
    }
  }

  static async createDialog(data = {}, { parent = null, pack = null, ...options } = {}) {
    const documentName = this.metadata.name;
    const types = ["ability", "perk"];

    const folders = parent ? [] : game.folders.filter(
      f => f.type === documentName && f.displayed
    );

    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.format("DOCUMENT.Create", { type: label });

    const html = await renderTemplate("templates/sidebar/document-create.html", {
      name: data.name ?? game.i18n.format("DOCUMENT.New", { type: label }),
      folder: data.folder,
      folders,
      hasFolders: folders.length > 0,
      type: data.type ?? types[0],
      types: Object.fromEntries(
        types.map(t => [t, t])
      ),
      hasTypes: types.length > 1
    });

    return await Dialog.prompt({
      title,
      content: html,
      label: title,
      rejectClose: false,
      options,
      callback: async (html) => {
        const form = html[0].querySelector("form");
        const fd = new FormDataExtended(form);

        foundry.utils.mergeObject(data, fd.toObject(), { inplace: true });

        if (!data.folder) delete data.folder;
        if (types.length === 1) data.type = types[0];

        return await this.create(data, {
          parent,
          pack,
          render: true
        });
      }
    });
  }
}
