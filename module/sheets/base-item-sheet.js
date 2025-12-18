import OVAEffect from "../effects/ova-effect.js";

export default class BaseItemSheet extends ItemSheet {

  /** -------------------------------------------- */
  /** Default Options                              */
  /** -------------------------------------------- */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [...super.defaultOptions.classes, "ova"],
      width: 630,
      height: 460,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content" }],
      dragDrop: [{ dropSelector: ".perks" }, { dropSelector: ".items" }],
      scrollY: [".ability-card"]
    });
  }

  /** -------------------------------------------- */
  /** Event Listeners                               */
  /** -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".rulebook-link").on("click", this._openRulebook.bind(this));
    html.find(".perk-delete").on("click", this._onDelete.bind(this));
    html.find(".item-delete").on("click", this._onDeleteSelf.bind(this));
    html.find(".add-effect").on("click", this._onAddEffect.bind(this));
    html.find(".effect-remove").on("click", this._onDeleteEffect.bind(this));

    if (this.actor) {
      html.find(".perk").on("contextmenu", this.actor.sheet._editItem.bind(this.actor.sheet));
    }
  }

  /** -------------------------------------------- */
  /** Open rulebook page                            */
  /** -------------------------------------------- */
  _openRulebook(event) {
    event.preventDefault();
    if (ui.PDFoundry) {
      const rulebookName = game.settings.get("ova", "rulebookName");
      const page = Number(this.item.data.data.page);
      ui.PDFoundry.openPDFByName(rulebookName, { page });
    } else {
      ui.notifications.warn(game.i18n.localize("OVA.PDFoundry.NotInstalled"));
    }
  }

  /** -------------------------------------------- */
  /** Add/Remove Effects                             */
  /** -------------------------------------------- */
  _onAddEffect(event) {
    event.preventDefault();
    const effects = this.item.data.data.effects ?? [];
    const newEffect = OVAEffect.defaultObject();
    effects.push(newEffect);
    this.item.update({ "data.effects": effects });
  }

  _onDeleteEffect(event) {
    event.preventDefault();
    const effectIndex = $(event.currentTarget).closest(".effect").data("index");
    const effects = this.item.data.data.effects ?? [];
    effects.splice(effectIndex, 1);
    this.item.update({ "data.effects": effects });
  }

  /** -------------------------------------------- */
  /** Handle Item Drops                              */
  /** -------------------------------------------- */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (this.item.type === "perk") return false;

    const newItem = await Item.implementation.fromDropData(data);
    const newItemData = newItem.toObject();

    if (newItemData.type === "perk") {
      const newPerks = Array.isArray(newItemData) ? newItemData : [newItemData];
      this.item.addPerks(newPerks);
    }

    return true;
  }

  /** -------------------------------------------- */
  /** Update Object                                 */
  /** -------------------------------------------- */
  async _updateObject(event, formData) {
    // Convert form data keys like "foo[0].bar" into objects
    const formattedData = Object.entries(formData).reduce((acc, [key, value]) => {
      const match = key.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const objectName = key.split(`[${index}]`)[0];
        const keyName = key.split(`[${index}].`)[1];
        acc[objectName] = acc[objectName] || [];
        acc[objectName][index] = acc[objectName][index] || {};
        foundry.utils.setProperty(acc[objectName][index], keyName, value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    return super._updateObject(event, formattedData);
  }

  /** -------------------------------------------- */
  /** Delete Perk / Delete Self                     */
  /** -------------------------------------------- */
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

  /** -------------------------------------------- */
  /** Data Preparation                              */
  /** -------------------------------------------- */
  getData() {
    const data = super.getData();
    data.perks = this.item.data.perks ?? [];
    data.isEmbedded = this.item.isEmbedded;
    return data;
  }
}
