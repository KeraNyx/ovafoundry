import OVAEffect from "../effects/ova-effect.js";

export default class BaseItemSheet extends foundry.appv1.sheets.ItemSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            tabs: [{ navSelector: ".tabs", contentSelector: ".content" }],
            dragDrop: [{ dropSelector: ".perks" }, { dropSelector: ".items" }],
            scrollY: [
                ".ability-card"
            ],
            height: 460,
            width: 630,
            classes: super.defaultOptions.classes.concat(['ova']),
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(".rulebook-link").click(this._openRulebook.bind(this));

        html.find(".perk-delete").click(this._onDelete.bind(this));
        html.find(".item-delete").click(this._onDeleteSelf.bind(this));

        html.find(".add-effect").click(this._onAddEffect.bind(this));
        html.find(".effect-remove").click(this._onDeleteEffect.bind(this));
        if (this.actor) {
            html.find('.perk').on("contextmenu", this.actor.sheet._editItem.bind(this));
        }
    }

    _openRulebook(event) {
        event.preventDefault();
        if (ui.PDFoundry) {
            const rulebookName = game.settings.get("ova", "rulebookName");
            const page = Number.parseInt(this.item.data.data.page);
            ui.PDFoundry.openPDFByName(rulebookName, { page });
        } else {
            ui.notifications.warn(game.i18n.localize("OVA.PDFoundry.NotInstalled"));
        }
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
        const newEffect = OVAEffect.degaultObject();

        currentEffects.push(newEffect);
        this.item.update({ "data.effects": currentEffects });
    }

    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const item = this.item;
        if (item.type === 'perk') return false;

        const newItem = await Item.implementation.fromDropData(data);
        const newItemData = newItem.toObject();

        switch (newItemData.type) {
            case 'perk':
                const newPerks = newItemData instanceof Array ? newItemData : [newItemData];
                this.item.addPerks(newPerks);
                break;
        }

        return true;
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
                    foundry.utils.setProperty(acc[objectName][index], keyName, value);
                } else {
                    acc[objectName][index] = {};
                    foundry.utils.setProperty(acc[objectName][index], keyName, value);
                }
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        return super._updateObject(event, formattedData);
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

    getData() {
        const data = super.getData();
        data.perks = this.item.data.perks;
        data.isEmbedded = this.item.isEmbedded;

        return data;
    }
}
