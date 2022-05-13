export default class OVAItem extends Item {

    /** @Param []Item */
    addPerks(perks) {
        const currentPerks = this.data.data.perks || [];
        // increase level by one or add there is no perk with the same name
        perks.forEach(p => {
            const index = currentPerks.findIndex(pk => pk.name === p.name);
            if (index === -1) {
                currentPerks.push(p);
            } else {
                currentPerks[index].data.level.value += 1;
            }
        });
        currentPerks.sort((a, b) => a.name.localeCompare(b.name));
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": currentPerks }]);
    }

    // removing single perk with specified id
    removePerk(perkId) {
        const currentPerks = this.data.data.perks || [];

        // reduce level by one or remove if level is 1
        const index = currentPerks.findIndex(p => p._id === perkId);
        if (currentPerks[index].data.level.value > 1) {
            currentPerks[index].data.level.value--;
        } else {
            currentPerks.splice(currentPerks[index], 1);
        }
        currentPerks.sort((a, b) => a.name.localeCompare(b.name));
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": currentPerks }]);
    }

    /** @override */
    prepareItemData() {
        const itemData = this.data.data;
        itemData.level.mod = 0;
        itemData.isEmbedded = this.isEmbedded;

        if (!this.isEmbedded) return;
        if (this.type !== 'ability') return;

        if (itemData.isRoot) {
            // add chilren abilities
            const abilities = this.actor.items.map(i => i.data).filter(i => i.data.rootId === this.id);
            itemData.abilities = abilities;
            itemData.abilities.sort((a, b) => a.data.name.localeCompare(b.data.name));
        } else if (itemData.rootId == '') {
            // add abilities with the same name
            const modifierRoots = this.actor.items.filter(i => i.data.data.rootType == 'modifier' && i.data.data.active).map(i => i.id);
            // find abilities with modifier roots
            const abilities = this.actor.items.filter(i => i.data.name === this.name && modifierRoots.includes(i.data.data.rootId));
            itemData.level.mod = abilities.reduce((sum, a) => sum + a.data.data.level.value, 0);
        }
        itemData.level.total = itemData.level.value + itemData.level.mod;
        this.sheet == null || this.sheet.render(false);
    }
}