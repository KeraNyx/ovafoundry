import OVAEffect from "../effects/ova-effect.js";
import { ApplicationV2 } from "foundry/applications/api/application-v2.js"; // ensure V2 import

export default class ApplyDamagePrompt extends ApplicationV2 {
    constructor({ effects, rollData, targets, attacker }) {
        super();

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
        if (target) {
            for (const name in target.data.resistances) {
                this.resistances[name] = {
                    canHeal: target.data.resistances[name].canHeal || false,
                    affected: target.data.resistances[name].affected || false,
                };
            }
        }
    }

    /** Template path */
    get template() {
        return 'systems/ova/templates/dialogs/apply-damage-dialog.html';
    }

    /** Required by ApplicationV2 */
    async _renderHTML() {
        const context = this.getData();
        this.element = document.createElement('div');
        this.element.innerHTML = await foundry.applications.handlebars.renderTemplate(this.template, context);
        return this.element;
    }

    /** Required by ApplicationV2 */
    async _replaceHTML(html) {
        this.element.replaceWith(html);
        this.element = html;
        this.activateListeners(html);
    }

    /** Activate listeners */
    activateListeners(html) {
        html.querySelectorAll('.effect-active').forEach(el => el.addEventListener('change', this._onSelfEffectActiveChange.bind(this)));
        html.querySelectorAll('.effect-duration').forEach(el => el.addEventListener('change', this._onSelfEffectDurationChange.bind(this)));
        html.querySelectorAll('.affected').forEach(el => el.addEventListener('change', this._onAffectedChange.bind(this)));
        html.querySelectorAll('.can-heal').forEach(el => el.addEventListener('change', this._onCanHealChange.bind(this)));
        html.querySelectorAll('.take-damage').forEach(el => el.addEventListener('click', this._takeDamage.bind(this)));
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
        const effectType = e.currentTarget.dataset.effectType;
        const effectIndex = e.currentTarget.dataset.effectIndex;
        this.effects[effectType][effectIndex].active = e.currentTarget.checked;
        this.rawEffects[effectType][effectIndex].active = e.currentTarget.checked;
    }

    _onSelfEffectDurationChange(e) {
        e.preventDefault();
        const effectType = e.currentTarget.dataset.effectType;
        const effectIndex = e.currentTarget.dataset.effectIndex;
        this.effects[effectType][effectIndex].duration.rounds = parseInt(e.currentTarget.value);
        this.rawEffects[effectType][effectIndex].duration = parseInt(e.currentTarget.value);
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

    _calculateHeal(attackRoll) {
        return -attackRoll.result * attackRoll.dx;
    }

    _calculateDamage(actor, attackRoll, defenseRoll) {
        const finalResult = attackRoll.result - defenseRoll.result;
        const armor = actor.data.armor || 0;
        const piercing = attackRoll.ignoreArmor || 0;
        const effectiveArmor = Math.min(Math.max(armor - piercing, 0), 5);
        let dx = Math.max(attackRoll.dx - effectiveArmor, 0.5);

        let canHeal = false;
        let totalVulnerability = 0;

        for (const resistance in actor.data.resistances) {
            if (!this.resistances[resistance].affected) continue;
            if (actor.data.resistances[resistance] >= 0) {
                dx -= actor.data.resistances[resistance];
                if (this.resistances[resistance].canHeal) canHeal = true;
            } else totalVulnerability += -actor.data.resistances[resistance];
        }

        if (!canHeal && dx < 0) dx = 0;
        const damage = Math.ceil(finalResult * dx);
        const bonusDamage = totalVulnerability > 0 ? damage * (0.5 * 2 ** (totalVulnerability - 1)) : 0;

        return -(damage + bonusDamage);
    }

    async _takeDamage(e) {
        e.preventDefault();
        e.stopPropagation();

        const activeSelfEffects = this.effects.self.filter(effect => effect.active);
        const activeTargetEffects = this.effects.target.filter(effect => effect.active);

        await this.attacker.addAttackEffects?.(activeSelfEffects);
        this.targets.forEach(target => {
            if (this.fatiguing) target.changeEndurance?.(this.rollData.attack.damage);
            else target.changeHP?.(this.rollData.attack.damage);

            target.addAttackEffects?.(activeTargetEffects);
        });

        this.close();
    }
}
