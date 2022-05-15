export default class OVACharacter extends Actor {
    prepareData() {
        super.prepareData();
    }
    prepareDerivedData() {
        super.prepareDerivedData();

        this.items.forEach(item => item.prepareItemData());
    }

    createAttack() {
        const attackData = {
            name: game.i18n.localize("OVA.Attack.DefaultName"),
            type: "attack"
        };
        this.createEmbeddedDocuments("Item", [attackData]);
    }
}