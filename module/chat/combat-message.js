export default class OVACombatMessage extends ChatMessage {
  static lastAttack = null;

  /** @override */
  static async create({ roll, rollData, speaker, attack, perks = [], abilities = [] }) {
    const attackData = attack?.toObject();
    const templateData = {
      attack: attackData,
      rollData,
      item: {
        perks,
        abilities,
      },
      rollResults: await roll.render({ isPrivate: false, template: "systems/ova/templates/chat/roll.html" }),
    };

    rollData.fatiguing = !!attack?.data.ovaFlags?.fatiguing;
    rollData.affinity = attack?.data.affinity;

    const html = await renderTemplate("systems/ova/templates/chat/combat-message.html", templateData);

    const msgData = {
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      user: game.user.id, // V16-safe
      flavor: game.i18n.localize(`OVA.Roll.${rollData.type.capitalize()}`),
      roll,
      content: html,
      speaker: ChatMessage.getSpeaker({ actor: speaker }),
      flags: { "roll-data": rollData, attack: attackData },
    };

    // Miracle roll
    if (rollData.type === "drama" && rollData.roll === 6) {
      msgData.flavor = game.i18n.localize("OVA.Roll.Miracle");
      msgData.flags["miracle"] = true;
    }

    super.applyRollMode(msgData, game.settings.get("core", "rollMode"));
    return super.create(msgData);
  }

  /** Adds a drama dice roll to an existing roll */
  static async addDramaDice(originalRoll, dramaRoll) {
    const originalDice = originalRoll.roll.dice[0];
    const dramaDice = dramaRoll.roll.dice[0];

    // Adjust keep/drop logic if using "kl" modifier
    if (originalDice.modifiers[0] === "kl") {
      const diff = originalDice.results.length - dramaDice.results.length;

      if (diff <= 1) originalDice.modifiers[0] = "khs";

      if (diff >= 1) {
        // Remove lowest dice
        let toRemove = dramaDice.results.length + 1;
        originalDice.results.sort((a, b) => a.result - b.result);
        originalDice.results.splice(0, toRemove);
      } else {
        const totalDice = 2 - originalDice.results.length - dramaDice.results.length;
        dramaDice.results.sort((a, b) => a.result - b.result);
        originalDice.results = dramaDice.results.splice(0, dramaDice.results.length - totalDice);
      }
    }

    originalDice.results.forEach(r => r.discarded = false);
    originalDice.results.push(...dramaDice.results);

    for (let r of originalDice.results) {
      delete r.discarded;
      r.active = true;
    }

    originalDice._evaluateModifiers();
    originalRoll.roll._formula = `${originalDice.results.length}d6${originalDice.modifiers[0]}`;
    originalRoll.roll._total = originalRoll.roll._evaluateTotal();

    const attack = originalRoll.data.flags["attack"];
    const templateData = {
      attack,
      rollResults: await originalRoll.roll.render({ isPrivate: false })
    };

    originalRoll.data.content = await renderTemplate("systems/ova/templates/chat/combat-message.html", templateData);
    return originalRoll;
  }
}
