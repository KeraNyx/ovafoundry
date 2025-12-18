import OVAEffect from "./effects/ova-effect.js";
import Socket from "./sockets/socket.js";

export default class OVACharacter extends Actor {

  /* -------------------------------------------- */
  /*  Creation                                    */
  /* -------------------------------------------- */

  static async create(data, options = {}) {
    const subtype = options.subtype ?? data.type ?? "character";

    data.prototypeToken ??= {
      actorLink: subtype === "character",
      disposition: subtype === "character" ? 1 : -1,
      vision: true,
      bar1: { attribute: "system.hp" },
      bar2: { attribute: "system.endurance" }
    };

    data.img ??= "icons/svg/mystery-man-black.svg";

    if (subtype === "npc") {
      data.flags ??= {};
      data.flags.core ??= {};
      data.flags.core.sheetClass = "ova.OVANPCSheet";
    }

    return super.create(data, options);
  }

  /* -------------------------------------------- */
  /*  Embedded Item Helpers                       */
  /* -------------------------------------------- */

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

  /* -------------------------------------------- */
  /*  Update Handling                             */
  /* -------------------------------------------- */

  async _preUpdate(changes, options, user) {
    const s = this.system;

    let hp = foundry.utils.getProperty(changes, "system.hp.value") ?? s.hp.value;
    let end = foundry.utils.getProperty(changes, "system.endurance.value") ?? s.endurance.value;

    if (hp < 0) {
      end += hp;
      foundry.utils.setProperty(changes, "system.endurance.value", Math.max(end, 0));
      foundry.utils.setProperty(changes, "system.hp.value", 0);
    }

    if (end < 0) {
      hp += end;
      foundry.utils.setProperty(changes, "system.hp.value", Math.max(hp, 0));
      foundry.utils.setProperty(changes, "system.endurance.value", 0);
    }

    if ((foundry.utils.getProperty(changes, "system.enduranceReserve.value") ?? 0) < 0) {
      foundry.utils.setProperty(changes, "system.enduranceReserve.value", 0);
    }

    if (hp <= 0 && end <= 0) {
      foundry.utils.setProperty(changes, "system.hp.value", 0);
      foundry.utils.setProperty(changes, "system.endurance.value", 0);
    }

    this._notifyValueChange(s.hp.value, hp);
    this._notifyValueChange(s.endurance.value, end, "#427ef5");
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  prepareBaseData() {
    super.prepareBaseData();
    const s = this.system;

    /* ---- global defaults ---- */
    s.globalMod ??= 2;
    s.globalRollMod ??= 0;
    s.globalDefMod ??= 0;
    s.armor ??= 0;
    s.resistances ??= {};
    s.attacks ??= [];
    s.speed ??= 0;

    /* ---- normalize core pools ---- */
    s.hp = foundry.utils.mergeObject(
      { value: 0, max: 0 },
      s.hp ?? {}
    );

    s.hpReserve = foundry.utils.mergeObject(
      { value: 0, max: 0 },
      s.hpReserve ?? {}
    );

    s.endurance = foundry.utils.mergeObject(
      { value: 0, max: 0, penalty: 0 },
      s.endurance ?? {}
    );

    s.enduranceReserve = foundry.utils.mergeObject(
      { value: 0, max: 0 },
      s.enduranceReserve ?? {}
    );

    /* ---- other structures ---- */
    s.defenses = foundry.utils.deepClone(s.defenses ?? {});
    s.attack = { roll: 0, dx: 0 };
    s.dramaDice = foundry.utils.mergeObject(
      { used: 0, free: 0 },
      s.dramaDice ?? {}
    );
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system;

    /* ---- abilities first ---- */
    for (const item of this.items.filter(i => i.type === "ability")) {
      item.prepareDerivedData();
    }

    /* ---- apply ability effects ---- */
    for (const item of this.items) {
      if (item.type !== "ability" || !item.system.active) continue;
      item.ovaEffects
        ?.sort((a, b) => a.data.priority - b.data.priority)
        .forEach(e => e.apply(s));
    }

    /* ---- derived pools ---- */
    s.hp.max += s.hpReserve.max;

    /* ---- magic ---- */
    const magic = this.items.filter(i => i.type === "ability" && i.system.magic);
    s.magic = magic;
    s.haveMagic = magic.length > 0;

    s.changes ??= [];

    if (s.hp.value <= 0 || s.endurance.value <= 0) {
      s.globalMod -= 1;
    }

    /* ---- non-ability items ---- */
    for (const item of this.items.filter(i => i.type !== "ability")) {
      item.prepareDerivedData();
    }

    s.tv = s.tv > 0 ? s.tv : this._calculateThreatValue();
  }

  /* -------------------------------------------- */
  /*  Threat Value                                */
  /* -------------------------------------------- */

  _calculateThreatValue() {
    const s = this.system;
    let tv = 0;

    const defenses = Object.values(s.defenses ?? {});
    tv += defenses.length ? Math.max(...defenses) : 0;

    const attacks = this.items.filter(i => i.type === "attack");
    const free = attacks.filter(a => a.system.enduranceCost === 0 && a.system.attack?.dx >= 0);

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

  /* -------------------------------------------- */
  /*  Drama Dice                                  */
  /* -------------------------------------------- */

  giveFreeDramaDice() {
    return this.update({ "system.dramaDice.free": this.system.dramaDice.free + 1 });
  }

  resetUsedDramaDice() {
    return this.update({
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

  /* -------------------------------------------- */
  /*  Rolls & HUD Text                            */
  /* -------------------------------------------- */

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
    const current = foundry.utils.getProperty(this.system, path.split(".").slice(1).join("."));
    this.update({ [path]: current + amount });
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
}
