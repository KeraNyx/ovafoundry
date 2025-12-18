import OVAEffect from "../effects/ova-effect.js";
import Socket from "../sockets/socket.js";

export default class ApplyDamagePrompt extends Application {
  constructor({ effects, rollData, targets, attacker }) {
    super({});
    this.rollData = rollData;
    this.rawEffects = effects;
    this.targets = targets;
    this.attacker = attacker;
    this.fatiguing = this.rollData.attack.fatiguing;
    this.affinity = this.rollData.attack.affinity;

    // Fill resistances from first target
    this.resistances = {};
    if (rollData.attack.dx < 0) return;

    const target = this.targets[0];
    if (target) {
      for (const name in target.system.resistances) {
        this.resistances[name] = {
          canHeal: target.system.resistances[name]?.canHeal || false,
          affected: target.system.resistances[name]?.affected || false,
        };
      }
    }
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ova", "dialog"],
      template: "systems/ova/templates/dialogs/apply-damage-dialog.html",
      width: 500,
      height: "auto",
      resizable: true,
      title: game.i18n.localize("OVA.ApplyDamage"),
    });
  }

  /** @override */
  getData() {
    this._prepareData();
    return {
      effects: this.effects,
      target: this.rollData.attack.dx >= 0 ? this.targets[0] : undefined,
      resistances: this.resistances,
      rollData: this.rollData,
      affinity: this.affinity,
    };
  }

  activateListeners(html) {
    html.querySelectorAll(".effect-active").forEach(el =>
      el.addEventListener("change", this._onSelfEffectActiveChange.bind(this))
    );
    html.querySelectorAll(".effect-duration").forEach(el =>
      el.addEventListener("change", this._onSelfEffectDurationChange.bind(this))
    );
    html.querySelectorAll(".affected").forEach(el =>
      el.addEventListener("change", this._onAffectedChange.bind(this))
    );
    html.querySelectorAll(".can-heal").forEach(el =>
      el.addEventListener("change", this._onCanHealChange.bind(this))
    );
    html.querySelectorAll(".take-damage").forEach(el =>
      el.addEventListener("click", this._takeDamage.bind(this))
    );
  }

  _onAffectedChange(e) {
    const name = e.currentTarget.dataset.resName;
    this.resistances[name].affected = e.currentTarget.checked;
    this.render(false);
  }

  _onCanHealChange(e) {
    const name = e.currentTarget.dataset.resName;
    this.resistances[name].canHeal = e.currentTarget.checked;
    this.render(false);
  }

  _onSelfEffectActiveChange(e) {
    const type = e.currentTarget.dataset.effectType;
    const index = e.currentTarget.dataset.effectIndex;
    this.effects[type][index].active = e.currentTarget.checked;
    this.rawEffects[type][index].active = e.currentTarget.checked;
  }

  _onSelfEffectDurationChange(e) {
    const type = e.currentTarget.dataset.effectType;
    const index = e.currentTarget.dataset.effectIndex;
    const rounds = parseInt(e.currentTarget.value);
    this.effects[type][index].duration.rounds = rounds;
    this.rawEffects[type][index].duration = rounds;
  }

  _prepareData() {
    const damage = this.rollData.attack.dx >= 0
      ? this._calculateDamage(this.targets[0], this.rollData.attack, this.rollData.defense)
      : this._calculateHeal(this.rollData.attack);
    this.rollData.attack.damage = damage;

    this.effects = {
      self: this.rawEffects.self.map(e => OVAEffect.createActiveEffect(e, this.rollData)),
      target: this.rawEffects.target.map(e => OVAEffect.createActiveEffect(e, this.rollData)),
    };
  }

  _calculateHeal(attackRoll) {
    return -attackRoll.result * attackRoll.dx;
  }

  _calculateDamage(actor, attackRoll, defenseRoll) {
    const finalResult = attackRoll.result - defenseRoll.result;
    const armor = actor.system.armor || 0;
    const piercing = attackRoll.ignoreArmor || 0;
    const effectiveArmor = Math.min(Math.max(armor - piercing, 0), 5);
    let dx = Math.max(attackRoll.dx - effectiveArmor, 0.5);

    let canHeal = false;
    let totalVulnerability = 0;

    for (const name in actor.system.resistances) {
      if (!this.resistances[name]?.affected) continue;
      const value = actor.system.resistances[name];
      if (value >= 0) {
        dx -= value;
        if (this.resistances[name].canHeal) canHeal = true;
      } else totalVulnerability += -value;
    }

    if (!canHeal && dx < 0) dx = 0;
    const damage = Math.ceil(finalResult * dx);
    const bonus = totalVulnerability > 0 ? damage * (0.5 * 2 ** (totalVulnerability - 1)) : 0;

    return -(damage + bonus);
  }

  async _takeDamage(e) {
    e.preventDefault();
    const activeSelfEffects = this.effects.self.filter(eff => eff.active);
    const activeTargetEffects = this.effects.target.filter(eff => eff.active);

    await this.attacker.addAttackEffects?.(activeSelfEffects);
    for (const target of this.targets) {
      if (this.fatiguing) target.changeEndurance?.(this.rollData.attack.damage);
      else target.changeHP?.(this.rollData.attack.damage);
      target.addAttackEffects?.(activeTargetEffects);
    }

    this.close();
  }
}
