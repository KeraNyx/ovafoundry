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

        for (const defense in charData.defenses) {
            charData.defenses[defense] += (charData.globalDefMod + charData.globalMod);

            if (charData.defenses[defense] < 0) {
                charData.defenses[defense] = 0;
            }
        }
        if (charData.armor < 0) {
            charData.armor = 0;
        }

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
        charData.hp = charData.data.hp;
        charData.endurance = charData.data.endurance;
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

    changeHP(amount) {
        if (amount === 0) return;
        let newHp = Math.max(this.data.hp.value + amount, 0);

        this.update({ "data.hp.value": newHp });

        // displaying text
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

    async addActiveEffects(effects) {
        const afs = []
        for (let effect of effects) {
            afs.push({
                label: effect.source.name,
                origin: effect.source.uuid,
                changes: [{
                    key: effect.key,
                    mode: effect.mode,
                    value: effect.value,
                    priority: effect.priority
                }],
                data: data
            })
        }

        this.createEmbeddedDocuments("ActiveEffect", afs);
    }
}