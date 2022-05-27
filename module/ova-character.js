import OVAEffect from "./effects/ova-effect.js";

export default class OVACharacter extends Actor {
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

    prepareData() {
        super.prepareData();

        const charData = this.data;
        if (charData.hp.value > charData.hp.max) {
            charData.hp.value = charData.hp.max;
        }

        if (charData.endurance.value > charData.endurance.max) {
            charData.endurance.value = charData.endurance.max;
        }

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
    }

    prepareBaseData() {
        const charData = this.data;

        charData.globalMod = 0;
        charData.globalRollMod = 2;
        charData.globalDefMod = 2;
        charData.armor = 0;
        charData.resistances = {};
        charData.attacks = [];
        charData.defenses = charData.data.defenses;
        if (charData.hp && charData.hp.value != charData.data.hp.value) { 
            this._showHPChangeText(charData.data.hp.value-charData.hp.value);
        }
        // copy data from template
        charData.hp = {...charData.data.hp};
        charData.endurance = {...charData.data.endurance};
        charData.speed = 0;
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
        let newHp = Math.max(this.data.hp.value + amount, 0);

        this.update({ "data.hp.value": newHp });

        // displaying text
        this._showHPChangeText(amount);
    }

    _showHPChangeText(amount) {
        const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
        for (let t of tokens) {
            t.hud.createScrollingText(amount.signedString(), {
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
        await this.createEmbeddedDocuments("ActiveEffect", effects);
    }
}