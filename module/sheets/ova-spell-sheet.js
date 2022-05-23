export default class OVASpellSheet extends ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "systems/ova/templates/sheets/ova-spell-sheet.html"
        });
    }
}