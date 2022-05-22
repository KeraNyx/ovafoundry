export default class OVACharacter extends Actor {
    createAttack() {
        const attackData = {
            name: game.i18n.localize("OVA.Attack.DefaultName"),
            type: "attack"
        };
        return this.createEmbeddedDocuments("Item", [attackData]);
    }

    prepareData() {
        super.prepareData();

        const charData = this.data;
        charData.hp = charData.data.hp;
        if (charData.hp.value > charData.hp.max) {
            charData.hp.value = charData.hp.max;
        }

        charData.endurance = charData.data.endurance;
        if (charData.endurance.value > charData.endurance.max) {
            charData.endurance.value = charData.endurance.max;
        }
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        this.items.forEach(item => item.prepareItemData());
        const charData = this.data;
        const data = charData.data;
        charData.globalMod = 0;
        charData.armor = 0;

        // apply active ability effects to data
        this.items.forEach(item => {
            if (item.type !== "ability") return;
            if (!item.data.data.active) return;

            item.data.effects.forEach(e => e.apply(data));
        });

        // increase all defense valuses by 2 (base modifier)
        for (const defense in data.defenses) {
            data.defenses[defense] += 2;
        }

        Object.assign(charData, data);
    }

    async applyDamage({ roll, dx, ignoreArmor = 0 }) {
        const armor = this.data.armor || 0;
        const piercing = ignoreArmor || 0
        const effectiveArmor = Math.max(armor - piercing, 0);
        const damage = roll * (Math.max(dx - effectiveArmor, 0.5));
        
        // negative damage is healing
        let newHp = Math.max(this.data.hp.value - damage, 0);
        this.update({ "data.hp.value": newHp });

        // displaying text
        const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
        for (let t of tokens) {
            t.hud.createScrollingText((-damage).signedString(), {
                anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
                direction: damage < 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
                fill: damage < 0 ? "green" : "red",
                stroke: 0x000000,
                strokeThickness: 4,
                jitter: 0.25
            });
        }
    }
}