export default class OVACombatMessage extends ChatMessage {
    static lastAttack = null;

    static async create({ roll, rollData, speaker, attack }) {
        const templateData = {
            attack: attack,
            rollResults: await roll.render({ isPrivate: false })
        };
        const html = await renderTemplate("systems/ova/templates/chat/combat-message.html", templateData);
        const msgData = {
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            user: game.user.data._id,
            flavor: game.i18n.localize(`OVA.Roll.${rollData.type.capitalize()}`),
            roll: roll,
            content: html,
            speaker: ChatMessage.getSpeaker({ actor: speaker }),
            flags: { "roll-data": rollData, "attack": attack },
        };
        super.applyRollMode(msgData, game.settings.get("core", "rollMode"));
        return super.create(msgData);
    }
}