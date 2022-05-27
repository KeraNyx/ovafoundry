export default class OVAActiveEffect extends ActiveEffect {
    async _onCreate(data, options, userId) {
        if (data.flags["create-item"]) {
            const itemsData = data.flags["create-item"];
            const actor = this.parent;
            const rootData = itemsData.find(i => i.data.rootId === "");
            const root = await actor.createEmbeddedDocuments("Item", [rootData]);
            this.setFlag('ova', 'linked-item',  root[0].id);
            const children = itemsData.filter(i => i.data.rootId !== "").map(i => {
                i.data.rootId = root[0].id;
                return i;
            });
            await actor.createEmbeddedDocuments("Item", children);
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