import BaseItemSheet from "./base-item-sheet.js";

export default class OVAAbilitySheet extends BaseItemSheet {
    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "systems/ova/templates/sheets/ova-ability-sheet.html"
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        if (this.item.isEmbedded) {
            html.find('.item-view').click(this.actor.sheet._startEditingItem.bind(this));
            html.find('.item-edit').on("blur", this.actor.sheet._endEditingItem.bind(this));
            html.find('.item-edit').click(this.actor.sheet._editItem.bind(this));

            html.find('.item-edit').click(this.actor.sheet._editItem.bind(this));
            html.find('.item-value').on("input", this.actor.sheet._onItemValueChange.bind(this));
            html.find('.item-value').keypress(this.actor.sheet._itemValueValidator.bind(this));
            html.find('.ability-name').on("contextmenu", this.actor.sheet._editItem.bind(this));
        }
    }

    async _onSubmit(event) {
        if (this.item.isEmbedded) {
            await this.actor.sheet._onSubmit(event);
        }
        await super._onSubmit(event);
    }

    /** @override */
    getData() {
        const data = super.getData();

        const itemData = data.data;
        data.config = CONFIG.OVA;

        data.item = itemData;
        data.data = itemData.data;
        data.abilities = itemData.data.abilities;
        
        return data;
    }

    /** @override */
    async _canDragDrop(event) {
        return true;
    }

    /** @override */
    async _onDrop(event) {
        await super._onDrop(event);

        const data = TextEditor.getDragEventData(event);
        const item = this.item;
        if (item.type !== 'ability') return false;

        const newItem = await Item.implementation.fromDropData(data);
        const newItemData = newItem.toObject();

        if (!item.data.data.isRoot) return false;

        switch (newItemData.type) {
            case 'ability':
                const rootId = item.data._id;
                newItemData.data.rootId = rootId;
                this.actor.createEmbeddedDocuments("Item", [newItemData]);
                break;
        }

        return true;
    }
}