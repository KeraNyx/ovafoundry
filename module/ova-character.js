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
}