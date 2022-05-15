export default class OVAAttack extends OVAItem {
    updateRollAbilities(abilities) {
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.abilities": abilities }]);
    }

    updateDXAbilities(abilities) {
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.abilities": abilities }]);
    }
}