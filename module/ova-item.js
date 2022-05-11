export default class OVAItem extends Item {
    /** @Param []Item */
    addPerks(perks) {
        const currentPerks = this.data.data.perks || [];
        currentPerks.push(...perks);
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": currentPerks }]);
    }

    // removing single perk with specified id
    removePerk(perkId) {
        const currentPerks = this.data.data.perks || [];
        const newPerks = currentPerks;
        newPerks.splice(newPerks.findIndex(p => p._id === perkId), 1);
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": newPerks }]);
    }
}