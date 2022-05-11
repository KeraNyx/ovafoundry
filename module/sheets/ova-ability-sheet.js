export default class OVAAbilitySheet extends ItemSheet {
    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            dragDrop: [{ dropSelector: ".perks" }],
            template: "systems/ova/templates/sheets/ova-ability-sheet.html"
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(".item-delete").click(this._onDelete.bind(this));
    }

    _onDelete(event) {
        event.preventDefault();
        const itemId = this._getItemId(event);

        this.item.removePerk(itemId);
    }

    _getItemId(event) {
        return event.currentTarget.closest(".item").dataset.itemId;
    }

    /** @override */
    getData() {
        const data = super.getData();

        const itemData = data.data;
        data.config = CONFIG.OVA;

        data.item = itemData;
        data.data = itemData.data;
        return data;
    }

    /** @override */
    async _canDragDrop(event) {
        return true;
    }


    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const item = this.item;

        const perk = await Item.implementation.fromDropData(data);
        const perkData = perk.toObject();

        if (item.type !== 'ability' || perkData.type !== 'perk') return;

        const newPerks = perkData instanceof Array ? perkData : [perkData];
        this.item.addPerks(newPerks);
    }
}