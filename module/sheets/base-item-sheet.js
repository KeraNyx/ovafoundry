import Effect from "../effects/effect.js";

export default class BaseItemSheet extends ItemSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            tabs: [{ navSelector: ".tabs", contentSelector: ".content" }],
            dragDrop: [{ dropSelector: ".perks" }, { dropSelector: ".items" }],
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(".perk-delete").click(this._onDelete.bind(this));
        html.find(".item-delete").click(this._onDeleteSelf.bind(this));

        html.find(".add-effect").click(this._onAddEffect.bind(this));
        html.find(".effect-remove").click(this._onDeleteEffect.bind(this));
    }

    _onDeleteEffect(event) {
        event.preventDefault();

        const effectIndex = $(event.currentTarget).closest(".effect").data("index");
        const effects = this.item.data.data.effects;
        effects.splice(effectIndex, 1);
        this.item.update({ "data.effects": effects });
    }

    _onAddEffect(event) {
        event.preventDefault();

        const currentEffects = this.item.data.data.effects;
        const newEffect = Effect.degaultObject();

        currentEffects.push(newEffect);
        this.item.update({ "data.effects": currentEffects });
    }

    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const item = this.item;
        if (item.type === 'perk') return;

        const newItem = await Item.implementation.fromDropData(data);
        const newItemData = newItem.toObject();

        switch (newItemData.type) {
            case 'perk':
                const newPerks = newItemData instanceof Array ? newItemData : [newItemData];
                this.item.addPerks(newPerks);
                break;
        }
    }

    async _onSubmit(event) {
        await super._onSubmit(event);
    }

    async _updateObject(event, formData) {
        // find formData elements containing [digit] and convert them to list of objects
        const formattedData = Object.entries(formData).reduce((acc, [key, value]) => {
            if (key.match(/\[\d+\]/)) {
                const [, index] = key.match(/\[(\d+)\]/);
                const objectName = key.split(`[${index}]`)[0];
                const keyName = key.split(`[${index}].`)[1];
                if (!acc[objectName]) acc[objectName] = [];
                if (acc[objectName][index]) {
                    acc[objectName][index][keyName] = value;
                } else {
                    acc[objectName][index] = { [keyName]: value };
                }
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        return await super._updateObject(event, formattedData);
    }

    _onDelete(event) {
        event.preventDefault();
        const itemId = this._getItemId(event);

        this.item.removePerk(itemId);
    }

    _onDeleteSelf(event) {
        event.preventDefault();

        this.actor.deleteEmbeddedDocuments("Item", [this.item.id]);
    }

    _getItemId(event) {
        return event.currentTarget.closest(".item").dataset.itemId;
    }
}
