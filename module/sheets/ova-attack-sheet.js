import BaseItemSheet from "./base-item-sheet.js";

export default class OVAAttackSheet extends BaseItemSheet {
    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "systems/ova/templates/sheets/ova-attack-sheet.html"
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.ability-description').click(this._selectAbility.bind(this));
    }

    _selectAbility(event) {
        event.preventDefault();

        var dataset = event.currentTarget.closest(".item").dataset;
        const selectionId = dataset.itemId;
        const ability = this.actor.items.find(i => i.id === selectionId);
        if (ability.data.data.passive) return;

        let selected = this.item.data.data.abilities;

        if (selected.includes(selectionId)) {
            selected = selected.filter(id => id !== selectionId);
        } else {
            selected.push(selectionId);
        }

        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.item.id, "data.abilities": selected }]);
    }

    /** @override */
    getData() {
        const data = super.getData();

        const itemData = data.data;
        data.config = CONFIG.OVA;

        data.item = itemData;
        data.data = itemData.data;
        data.selected = itemData.data.abilities;
        data.abilities = this.actor.items.
            filter(i => i.type === 'ability' && i.data.data.rootId === '').
            map(a => a.data).
            sort((a, b) => {
                // sort by type and name
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type.localeCompare(b.type);
            });

        return data;
    }

    /** @override */
    async _canDragDrop(event) {
        return true;
    }
}