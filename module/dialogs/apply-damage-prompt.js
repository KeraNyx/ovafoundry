import OVAEffect from "../effects/ova-effect.js";

export default class ApplyDamagePrompt extends Dialog {
    constructor({ effects, rollData, targets, attacker }) {
        const dialogData = {
            title: game.i18n.localize('OVA.ApplyDamage'),
            buttons: {},
            close: () => false,
        };

        super(dialogData, {});

        this.rollData = rollData;
        this.rawEffects = effects;
        this.targets = targets;
        this.attacker = attacker;
        this.fatiguing = this.rollData.attack.fatiguing;
        this.affinity = this.rollData.attack.affinity;

        // fill resistances from target
        this.resistances = {};
        
        if (rollData.attack.dx < 0) return;
        const target = this.targets[0];
        for (const name in target.data.resistances) {
            this.resistances[name] = {
                canHeal: target.data.resistances[name].canHeal || false,
                affected: target.data.resistances[name].affected || false,
            };
        }
    }

    get template() {
        return 'systems/ova/templates/dialogs/apply-damage-dialog.html';
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.effect-active').on('change', this._onSelfEffectActiveChange.bind(this));
        html.find('.effect-duration').on('change', this._onSelfEffectDurationChange.bind(this));
        html.find('.affected').on('change', this._onAffectedChange.bind(this));
        html.find('.can-heal').on('change', this._onCanHealChange.bind(this));
        html.find('.apply-damage').on('click', this._applyDamage.bind(this));
    }

    _onAffectedChange(e) {
        e.preventDefault();

        const resistanceName = e.currentTarget.dataset.resName;
        this.resistances[resistanceName].affected = e.currentTarget.checked;
        this.render(false);
    }

    _onCanHealChange(e) {
        e.preventDefault();

        const resistanceName = e.currentTarget.dataset.resName;
        this.resistances[resistanceName].canHeal = e.currentTarget.checked;
        this.render(false);
    }

    _onSelfEffectActiveChange(e) {
        e.preventDefault();
        // self or target
        const effectType = e.currentTarget.dataset.effectType;
        const effectIndex = e.currentTarget.dataset.effectIndex;

        this.effects[effectType][effectIndex].active = e.currentTarget.checked;
        this.rawEffects[effectType][effectIndex].active = e.currentTarget.checked;
    }

    _onSelfEffectDurationChange(e) {
        e.preventDefault();
        // self or target
        const effectType = e.currentTarget.dataset.effectType;
        const effectIndex = e.currentTarget.dataset.effectIndex;

        this.effects[effectType][effectIndex].duration.rounds = Number.parseInt(e.currentTarget.value);
        this.rawEffects[effectType][effectIndex].duration = Number.parseInt(e.currentTarget.value);
    }

    _prepareData() {
        const damage = this.rollData.attack.dx >= 0 ? this._calculateDamage(this.targets[0], this.rollData.attack, this.rollData.defense) : this._calculateHeal(this.rollData.attack);
        this.rollData.attack.damage = damage;
        this.effects = {
            self: this.rawEffects.self.map(e => OVAEffect.createActiveEffect(e, this.rollData)),
            target: this.rawEffects.target.map(e => OVAEffect.createActiveEffect(e, this.rollData)),
        }
    }

    getData() {
        this._prepareData();
        const context = super.getData();

        context.effects = this.effects;

        if (this.rollData.attack.dx >= 0) {
            context.target = this.targets[0];
        }
        context.resistances = this.resistances;

        context.rollData = this.rollData;
        context.effects = this.effects;
        context.affinity = this.affinity;

        return context;
    }

    _calculateHeal(attackRoll) {
        return -attackRoll.result * attackRoll.dx;
    }

    _calculateDamage(actor, attackRoll, defenseRoll) {
        const finalResult = attackRoll.result - defenseRoll.result;

        const armor = actor.data.armor || 0;
        const piercing = attackRoll.ignoreArmor || 0
        const effectiveArmor = Math.min(Math.max(armor - piercing, 0), 5); // armor can be 0-5
        let dx = Math.max(attackRoll.dx - effectiveArmor, 0.5)

        let canHeal = false;
        let totalVulnerability = 0;
        for (const resistance in actor.data.resistances) {
            if (!this.resistances[resistance].affected) continue;

            if (actor.data.resistances[resistance] >= 0) {
                dx -= actor.data.resistances[resistance];
                if (this.resistances[resistance].canHeal) {
                    canHeal = true;
                }
            } else {
                totalVulnerability += -actor.data.resistances[resistance];
            }
        }
        if (!canHeal && dx < 0) dx = 0;

        const damage = Math.ceil(finalResult * dx);

        let bonusDamage = 0;
        if (totalVulnerability > 0) {
            bonusDamage = damage * (.5 * 2 ** (totalVulnerability - 1));
        }

        return -(damage + bonusDamage);
    }

    async _applyDamage(e) {
        e.preventDefault();
        e.stopPropagation();
        // apply activated effects to self
        const activeSelfEffects = this.effects.self.filter(effect => effect.active);
        const activeTargetEffects = this.effects.target.filter(effect => effect.active);

        await this.attacker.addAttackEffects(activeSelfEffects);
        this.targets.forEach(target => {
            if (this.fatiguing) {
                target.changeEndurance(this.rollData.attack.damage);
            } else {
                target.changeHP(this.rollData.attack.damage);
            }
            target.addAttackEffects(activeTargetEffects);
        });

        this.close();
    }
}