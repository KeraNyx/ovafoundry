import BaseItemSheet from "./base-item-sheet.js";

export default class OVAPerkSheet extends BaseItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "systems/ova/templates/sheets/ova-perk-sheet.html"
        });
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
}
