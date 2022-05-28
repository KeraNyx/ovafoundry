import OVAEffect from "./effects/ova-effect.js";

export default class OVACharacter extends Actor {
    constructor(data, context) {
        data.token = {
            actorLink: true,
            disposition: 1,
            vision: true,
            bar1: { attribute: "attributes.hp" },
            bar2: { attribute: "attributes.endurance" },
        }
        super(data, context);

    }
    async createAttack() {
        const attackData = {
            name: game.i18n.localize("OVA.Attack.DefaultName"),
            type: "attack",
        };
        return this.createEmbeddedDocuments("Item", [attackData]);
    }

    async createSpell() {
        const spellData = {
            name: game.i18n.localize("OVA.Spell.DefaultName"),
            type: "spell",
        };
        return this.createEmbeddedDocuments("Item", [spellData]);
    }

    async _preUpdate(data, options, user) {
        const charData = this.data;
        if (data.data?.hp && data.data.hp.value != charData.data.hp.value) {
            this._showHPChangeText(data.data.hp.value - charData.data.hp.value);
        }
    }

    prepareData() {
        super.prepareData();

        const charData = this.data;

        charData.defenses.evasion += charData.speed;
        for (const defense in charData.defenses) {
            charData.defenses[defense] += (charData.globalDefMod + charData.globalMod);
            if (charData.defenses[defense] < 0) {
                charData.defenses[defense] = 0;
            }
        }
        if (charData.armor < 0) {
            charData.armor = 0;
        }
        charData.hasResistances = Object.keys(charData.resistances).length > 0;

        if (charData.data.hp.value > charData.hp.max) {
            charData.data.hp.value = charData.hp.max;
        }

        if (charData.data.endurance.value > charData.endurance.max) {
            charData.data.endurance.value = charData.endurance.max;
        }

        if (charData.data.enduranceReserve.value > charData.enduranceReserve.max) {
            charData.data.enduranceReserve.value = charData.enduranceReserve.max;
        }
    }

    prepareBaseData() {
        const charData = this.data;

        if (charData.data.hp.value < 0) charData.data.hp.value = 0;
        if (charData.data.endurance.value < 0) charData.data.endurance.value = 0;
        if (charData.data.enduranceReserve.value < 0) charData.data.enduranceReserve.value = 0;

        charData.globalMod = 2;
        charData.globalRollMod = 0;
        charData.globalDefMod = 0;
        charData.armor = 0;
        charData.resistances = {};
        charData.attacks = [];
        charData.speed = 0;

        // copy data from template
        charData.defenses = { ...charData.data.defenses };
        charData.hp = { ...charData.data.hp };
        charData.endurance = { ...charData.data.endurance };
        charData.enduranceReserve = { ...charData.data.enduranceReserve };
        charData.data.attributes = {
            hp : charData.hp,
            endurance : charData.endurance,
            enduranceReserve : charData.enduranceReserve,
        }

        if (charData.data.hp.value <= 0 || charData.data.endurance.value <= 0) {
            charData.globalMod -= 1;
            charData.changes.push({
                source: {
                    name: game.i18n.localize("OVA.Status.No"+ charData.data.hp.value <= 0 ? "HP" : "Endurance"),
                    type: "status",
                }, key: "globalMod", mode: 2, value: -1
            })
        }
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        this._prepareItemData();
        const charData = this.data;

        // apply active ability effects to data
        this.items.forEach(item => {
            if (item.type !== "ability") return;
            if (!item.data.data.active) return;

            item.data.effects.forEach(e => e.apply(charData));
        });

        // get magical abilities
        const magicAbilities = this.items.filter(item => item.data.type === 'ability' && item.data.data.magic);
        charData.magic = magicAbilities;
        charData.haveMagic = magicAbilities.length > 0;
    }

    _prepareItemData() {
        this.items.forEach(item => item.prepareItemData());
    }

    getRollData() {
        return this.data;
    }

    changeHP(amount) {
        if (amount === 0) return;
        let newHp = Math.max(this.data.data.hp.value + amount, 0);

        this.update({ "data.hp.value": newHp });
    }

    changeEndurance(amount) {
        if (amount === 0) return;
        let newEndurance = Math.max(this.data.data.endurance.value + amount, 0);

        this.update({ "data.endurance.value": newEndurance });
    }

    _showHPChangeText(amount) {
        const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
        for (let t of tokens) {
            t?.hud.createScrollingText(amount.signedString(), {
                icon: "icons/svg/aura.svg",
                anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
                direction: amount > 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
                fill: amount > 0 ? "green" : "red",
                stroke: 0x000000,
                strokeThickness: 4,
                jitter: 0.25
            });
        }
    }

    async addAttackEffects(effects) {
        const oneTimeEffects = effects.filter(e => !!e.flags["once"]);
        for (const e of oneTimeEffects) {
            const oneTimeEffect = e.flags["once"];
            OVAEffect.applyEffectChanges(oneTimeEffect, this.data.data)
        };

        const persistantEffect = effects.filter(e => !e.flags["once"]);

        await this.update({ data: this.data.data });

        await this.createEmbeddedDocuments("ActiveEffect", persistantEffect);
    }
}