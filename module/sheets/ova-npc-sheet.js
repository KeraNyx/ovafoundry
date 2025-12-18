import OVACharacterSheet from "./ova-character-sheet.js";

export default class OVANPCSheet extends OVACharacterSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/ova/templates/sheets/ova-npc-sheet.html',
      height: 500
    });
  }

  getData() {
    const data = super.getData();

    // NPCs treat weaknesses as abilities
    if (Array.isArray(data.weaknesses)) {
      data.abilities.push(...data.weaknesses);
    }

    return data;
  }
}
