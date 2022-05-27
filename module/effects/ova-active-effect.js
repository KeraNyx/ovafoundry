export default class OVAActiveEffect extends ActiveEffect {
    async _onCreate(data, options, userId) {
        if (data.flags["create-item"]) {
            const item = data.flags["create-item"];
            const actor = this.parent;
            item.data.rootId = "";
            item.data.temporary = true;
            const newItem = await actor.createEmbeddedDocuments("Item", [item]);
            this.setFlag('ova', 'linked-item',  newItem[0].id);
        }
        super._onCreate(data, options, userId);
    }

    _onDelete(options, userId) {
        const linkedItem = this.getFlag('ova', 'linked-item');

        if (linkedItem) {
            this.parent.deleteEmbeddedDocuments("Item", [linkedItem]);
        }
        super._onDelete(options, userId);
    }
}