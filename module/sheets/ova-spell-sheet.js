export default class OVASpellSheet extends ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "systems/ova/templates/sheets/ova-spell-sheet.html",
            dragDrop: [{ dropSelector: ".items" }],
        });
    }
    activateListeners(html) {
        super.activateListeners(html);

        if (this.item.isEmbedded) {
            const sheet = this.actor.sheet;
            html.find('.item-view').click(sheet._startEditingItem.bind(sheet));
            html.find('.item-edit').on("blur", sheet._endEditingItem.bind(sheet));
            html.find('.item-edit').click(sheet._editItem.bind(sheet));

            html.find('.item-edit').click(sheet._editItem.bind(sheet));
            html.find('.item-value').on("input", sheet._onItemValueChange.bind(sheet));
            html.find('.item-value').keypress(sheet._itemValueValidator.bind(sheet));
            html.find('.ability-name').on("contextmenu", sheet._editItem.bind(sheet));
        }
    }

    async _onSubmit(event) {
        if (this.item.isEmbedded) {
            await this.actor.sheet._onSubmit(event);
        }
        await super._onSubmit(event);
    }

    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const item = this.item;
        if (!item.isEmbedded) return;

        const newItem = await Item.implementation.fromDropData(data);
        const newItemData = newItem.toObject();

        if (newItemData.type !== 'ability') return;

        const oldAbilities = item.actor.data.items.filter(i => i.data.data.rootId === item.id)
        if (oldAbilities.length) await this.actor.deleteEmbeddedDocuments("Item", oldAbilities.map(i => i.id));
        newItemData.data.rootId = item.id;

        this.actor.createEmbeddedDocuments("Item", [newItemData]);
    }

    getData() {
        const data = super.getData();
        const itemData = data.data;

        data.config = CONFIG.OVA;
        data.item = itemData;
        data.data = itemData.data;

        if (this.item.isEmbedded) {
            data.abilities = itemData.data.abilities;
        }

        return data;
    }
}