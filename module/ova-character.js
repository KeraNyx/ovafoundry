import OVAEffect from "./effects/ova-effect.js";
import Socket from "./sockets/socket.js";

export default class OVACharacter extends Actor {

  static async create(data, options = {}) {
    const subtype = options.subtype ?? "character";

    data.prototypeToken = {
      actorLink: subtype === "character",
      disposition: subtype === "character" ? 1 : -1,
      vision: true,
      bar1: { attribute: "attributes.hp" },
      bar2: { attribute: "attributes.endurance" }
    };

    data.img ??= "icons/svg/mystery-man-black.svg";

    if (subtype === "npc") {
      data.flags ??= {};
      data.flags.core ??= {};
      data.flags.core.sheetClass = "ova.OVANPCSheet";
    }

    const actor = await super.create(data, options);
    return actor;
  }

  async createAttack() {
    return this.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("OVA.Attack.DefaultName"),
      type: "attack"
    }]);
  }

  async createSpell() {
    return this.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("OVA.Spell.DefaultName"),
      type: "spell"
    }]);
  }

  /** @override */
  async _preUpdate(changes, options, user) {
    const system = this.system;

    let hp = foundry.utils.getProperty(changes, "system.hp.value") ?? system.hp.value;
    let end = foundry.utils.getProperty(changes, "system.endurance.value") ?? system.endurance.value;

    if (hp < 0) {
      end += hp;
      foundry.utils.setProperty(changes, "system.endurance.value", end);
      foundry.utils.setProperty(changes, "system.hp.value", 0);
    }

    if (end < 0) {
      hp += end;
      foundry.utils.setProperty(changes, "system.hp.value", hp);
      foundry.utils.setProperty(changes, "system.endurance.value", 0);
    }

    if ((foundry.utils.getProperty(changes, "system.enduranceReserve.value") ?? 0) < 0) {
      foundry.utils.setProperty(changes, "system.enduranceReserve.value", 0);
    }

    if (hp <= 0 && end <= 0) {
      foundry.utils.setProperty(changes, "system.hp.value", 0);
      foundry.utils.setProperty(changes, "system.endurance.value", 0);
    }

    this._notifyValueChange(system.hp.value, hp);
    this._notifyValueChange(system.endurance.value, end, "#427ef5");
  }

  prepareBaseData() {
    super.prepareBaseData();
    const s = this.system;

    s.globalMod = 2;
    s.globalRollMod = 0;
    s.globalDefMod = 0;
    s.armor = 0;
    s.resistances = {};
    s.attacks = [];
    s.speed = 0;

    s.defenses = foundry.utils.deepClone(s.defenses);
    s.hp = foundry.utils.deepClone(s.hp);
    s.hpReserve = { max: s.hpReserve?.max ?? 0 };
    s.endurance = foundry.utils.deepClone(s.endurance);
    s.enduranceReserve = foundry.utils.deepClone(s.enduranceReserve);
    s.attack = { roll: 0, dx: 0 };
    s.dramaDice = foundry.utils.deepClone(s.dramaDice);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system;

    this.items
      .filter(i => i.type === "ability")
      .forEach(i => i.prepareDerivedData());

    for (const item of this.items) {
      if (item.type !== "ability" || !item.system.active) continue;
      item.ovaEffects
        ?.sort((a, b) => a.data.priority - b.data.priority)
        .forEach(e => e.apply(s));
    }

    s.hp.max += s.hpReserve.max;

    const magic = this.items.filter(i => i.type === "ability" && i.system.magic);
    s.magic = magic;
    s.haveMagic = magic.length > 0;

    if (!s.changes) s.changes = [];

    if (s.hp.value <= 0 || s.endurance.value <= 0) {
      s.globalMod -= 1;
    }

    this.items
      .filter(i => i.type !== "ability")
      .forEach(i => i.prepareDerivedData());

    s.tv = s.tv > 0 ? s.tv : this._calculateThreatValue();
  }

  _calculateThreatValue() {
    const s = this.system;
    let tv = 0;

    const highestDefense = Math.max(...Object.values(s.defenses));
    tv += highestDefense;

    const attacks = this.items.filter(i => i.type === "attack");
    const free = attacks.filter(a => a.system.enduranceCost === 0 && a.system.attack.dx >= 0);

    const best = free.sort((a, b) => b.system.attack.roll - a.system.attack.roll)[0];
    if (best) {
      tv += 3;
      best._getRollAbilities()?.forEach(a => {
        tv += (a.type === "ability" ? 1 : -1) * a.system.level.value;
      });
    }

    tv += s.armor;
    return tv;
  }

  giveFreeDramaDice() {
    this.update({ "system.dramaDice.free": this.system.dramaDice.free + 1 });
  }

  resetUsedDramaDice() {
    this.update({
      "system.dramaDice.used": 0,
      "system.dramaDice.free": 0
    });
  }

  async useDramaDice(amount) {
    const free = Math.min(this.system.dramaDice.free, amount);
    const used = amount - free;

    await this.update({
      "system.dramaDice.free": this.system.dramaDice.free - free,
      "system.dramaDice.used": this.system.dramaDice.used + used
    });
  }

  getRollData() {
    return this.system;
  }

  changeHP(amount) {
    if (amount !== 0) {
      this.update({ "system.hp.value": this.system.hp.value + amount });
    }
  }

  changeEndurance(amount, reserve = false) {
    if (amount === 0) return;
    const path = reserve ? "system.enduranceReserve.value" : "system.endurance.value";
    this.update({ [path]: foundry.utils.getProperty(this.system, path.split(".").slice(1).join(".")) + amount });
  }

  _notifyValueChange(oldValue, newValue, stroke) {
    if (oldValue === newValue) return;
    this._showValueChangeText(newValue - oldValue, stroke);
  }

  _showValueChangeText(amount, stroke = 0x000000) {
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    OVACharacter.showValueChangeText(tokens, amount, stroke);
    Socket.emit("tokensAttributeChange", {
      tokens: tokens.map(t => t.id),
      amount,
      stroke
    });
  }

  static listenForValueChange() {
    Socket.on("tokensAttributeChange", data => {
      const tokens = data.tokens.map(id => canvas.tokens.get(id));
      OVACharacter.showValueChangeText(tokens, data.amount, data.stroke);
    });
  }

  static showValueChangeText(tokens, amount, stroke = 0x000000) {
    for (const t of tokens) {
      t?.hud.createScrollingText(amount.signedString(), {
        icon: "icons/svg/aura.svg",
        anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
        direction: amount > 0
          ? CONST.TEXT_ANCHOR_POINTS.TOP
          : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
        fill: amount > 0 ? "green" : "red",
        stroke,
        strokeThickness: 4,
        jitter: 0.25
      });
    }
  }

  // -----------------------
  // Updated V16 dialog
  // -----------------------
  static async createDialog(data = {}, { parent = null, pack = null, ...options } = {}) {
    const documentName = this.metadata.name;
    const types = ["character", "npc"];

    const folders = parent ? [] : game.folders.filter(f => f.type === documentName && f.displayed);
    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.format("DOCUMENT.Create", { type: label });

    const htmlContent = await foundry.applications.handlebars.renderTemplate(
      "templates/sidebar/document-create.html",
      {
        name: data.name ?? game.i18n.format("DOCUMENT.New", { type: label }),
        folder: data.folder,
        folders,
        hasFolders: folders.length > 0,
        type: data.type ?? types[0],
        types: Object.fromEntries(types.map(t => [t, t])),
        hasTypes: types.length > 1
      }
    );

    class CreateActorDialog extends foundry.applications.api.HandlebarsApplicationMixin(
      foundry.applications.api.ApplicationV2
    ) {
      static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
          title,
          template: htmlContent,
          width: 400,
          height: "auto",
          resizable: true
        });
      }

      async _updateObject(event, formData) {
        event.preventDefault();
        const form = event.currentTarget;
        const formEntries = Object.fromEntries(new FormData(form).entries());
        foundry.utils.mergeObject(data, formEntries, { inplace: true });

        const subtype = data.type;
        data.type = "character"; // enforce system type
        delete data.folder;      // optional

        await this.constructor.create(data, { parent, pack, renderSheet: true, subtype });
        this.close();
      }
    }

    const dialog = new CreateActorDialog();
    dialog.render(true);
  }
}
