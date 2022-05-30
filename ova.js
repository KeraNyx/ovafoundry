import { OVA } from "./module/config.js";

import OVAAbilitySheet from "./module/sheets/ova-ability-sheet.js";
import OVACharacterSheet from "./module/sheets/ova-character-sheet.js";
import OVACharacter from "./module/ova-character.js";
import OVAPerkSheet from "./module/sheets/ova-perk-sheet.js";
import OVAItem from "./module/ova-item.js";
import OVADie from "./module/dice/ova-die.js";
import OVAAttackSheet from "./module/sheets/ova-attack-sheet.js";
import OVASpellSheet from "./module/sheets/ova-spell-sheet.js";
import OVACombatant from "./module/combat/ova-combatant.js";
import OVAEffect from "./module/effects/ova-effect.js";
import OVAActiveEffect from "./module/effects/ova-active-effect.js";

import * as chat from "./module/chat/chat.js";
import registerHandlebarsHelpers from "./ova-handlebars-helpers.js";

Hooks.once("init", function () {
    console.log("OVA | Initializing OVA System");

    CONFIG.OVA = OVA;
    CONFIG.Item.documentClass = OVAItem;
    CONFIG.Actor.documentClass = OVACharacter;
    CONFIG.Dice.types = [OVADie, FateDie]
    CONFIG.Dice.terms['d'] = OVADie;
    CONFIG.Combatant.documentClass = OVACombatant;
    CONFIG.ActiveEffect.documentClass = OVAActiveEffect;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("ova", OVAAbilitySheet, { types: ["ability"] });
    Items.registerSheet("ova", OVAPerkSheet, { types: ["perk"] });
    Items.registerSheet("ova", OVAAttackSheet, { types: ["attack"] });
    Items.registerSheet("ova", OVASpellSheet, { types: ["spell"] });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("ova", OVACharacterSheet, { makeDefault: true });

    preloadTemplates();
    registerHandlebarsHelpers();
});

async function preloadTemplates() {
    return loadTemplates([
        "systems/ova/templates/parts/ability-list.html",
        "systems/ova/templates/parts/effects.html"
    ]);
}

Hooks.on("renderChatMessage", (message, html, data) => {
    if (message.roll) {
        // chat.listenToAttackRoll(message, html, data);
        chat.listenToCombatRolls(message, html, data);
    }
});

Hooks.on("renderChatLog", chat.chatListeners);

Hooks.on('preUpdateCombat', preUpdateCombat);

Hooks.on('updateCombat', function updateCombat(combat, updateData, context, userId) {

});
async function preUpdateCombat(combat, updateData, context) {
    // removing expired effects
    for (let turn of combat.turns) {
        const turnActor = turn.actor ? turn.actor : turn.token.actor;
        if (!turnActor) continue;

        for (let effect of turnActor.data.effects) {
            if (effect.data.duration.startTurn == updateData.turn && (updateData.turn > combat.turn || updateData.round > combat.round)) {
                if (effect.data.flags["each-round"]) {
                    const overTimeEffect = effect.data.flags["each-round"];
                    const newData = { data: foundry.utils.deepClone(turnActor.data.data) };
                    OVAEffect.applyEffectChanges(overTimeEffect, newData)

                    await turnActor.update(newData);
                }
            }
        }


        // == 0 to end effect on turn end, < 1 to end effect on turn start
        const expiredEffects = turnActor.effects.filter(e => e.duration.remaining === 0);
        turnActor.deleteEmbeddedDocuments("ActiveEffect", expiredEffects.map(e => e.id));
    }
}
