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
        charData.endurance = charData.data.endurance;
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        this.items.forEach(item => item.prepareItemData());
        const charData = this.data;

        // apply ability effects to data
        this.items.forEach(item => {
            if (item.type !== "ability") return;

            const data = charData.data;
            item.data.effects.forEach(e => e.apply(data));
            Object.assign(charData, data);
        });
    }
}