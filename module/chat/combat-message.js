export default class OVACombatMessage extends ChatMessage {
    static lastAttack = null;

    /** @override */
    static async create({ roll, rollData, speaker, attack }) {
        const attackData = attack?.toObject();
        const templateData = {
            attack: attackData,
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
            flags: { "roll-data": rollData, "attack": attackData },
        };
        super.applyRollMode(msgData, game.settings.get("core", "rollMode"));
        return super.create(msgData);
    }

    static async addDramaDice(originalRoll, dramaRoll) {
        const originalRollDice = originalRoll.roll.dice[0];
        const dramaRollDice = dramaRoll.roll.dice[0];
        if (originalRollDice.modifiers[0] === 'kl') {
            if (originalRollDice.results.length - dramaRollDice.results.length <= 1) {
                originalRollDice.modifiers[0] = 'khs';
            }
            // remove drama.results.length + 1 from original roll results
            if (originalRollDice.results.length - dramaRollDice.results.length >= 1) {
                // remove lowest results
                let toRemove = dramaRollDice.results.length + 1;
                originalRollDice.results.sort((a, b) => a.result - b.result);
                originalRollDice.results.splice(0, toRemove);
            } else {
                const totalDice = 2 - originalRollDice.results.length - dramaRollDice.results.length;
                dramaRollDice.results.sort((a, b) => a.result - b.result);
                dramaRollDice.results.splice(0, dramaRollDice.results.length - totalDice);
            }
        }

        originalRollDice.results.forEach(r => r.discarded = false);
        originalRollDice.results.push(...dramaRollDice.results);
        for (let i = 0; i < originalRollDice.results.length; i++) {
            delete originalRollDice.results[i].discarded;
            originalRollDice.results[i].active = true;
        }
        originalRollDice._evaluateModifiers();
        originalRoll.roll._formula = `${originalRollDice.results.length}d6${originalRollDice.modifiers[0]}`;
        originalRoll.roll._total = originalRoll.roll._evaluateTotal();
        const attack = originalRoll.data.flags["attack"];
        const templateData = {
            attack: attack,
            rollResults: await originalRoll.roll.render({ isPrivate: false })
        };

        originalRoll.data.content = await renderTemplate("systems/ova/templates/chat/combat-message.html", templateData);
        return originalRoll;
    }
}