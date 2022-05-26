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

import * as chat from "./module/chat/chat.js";

Hooks.once("init", function () {
    console.log("OVA | Initializing OVA System");

    CONFIG.OVA = OVA;
    CONFIG.Item.documentClass = OVAItem;
    CONFIG.Actor.documentClass = OVACharacter;
    CONFIG.Dice.types = [OVADie, FateDie]
    CONFIG.Dice.terms['d'] = OVADie;
    CONFIG.Combatant.documentClass = OVACombatant;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("ova", OVAAbilitySheet, { types: ["ability"] });
    Items.registerSheet("ova", OVAPerkSheet, { types: ["perk"] });
    Items.registerSheet("ova", OVAAttackSheet, { types: ["attack"] });
    Items.registerSheet("ova", OVASpellSheet, { types: ["spell"] });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("ova", OVACharacterSheet, { makeDefault: true });

    preloadTemplates();
    registerHelper();
});

function registerHelper() {
    Handlebars.registerHelper("abilitySign", (ability) => {
        return ability.data.type === "ability" ? "+" : "-";
    })

    Handlebars.registerHelper("signedValue", (value) => {
        return value > 0 ? "+" + value : value;
    })

    Handlebars.registerHelper("get", (object, field) => {
        return object[field];
    });

    Handlebars.registerHelper("gt", (v1, v2) => {
        return v1 > v2;
    });

    Handlebars.registerHelper("lt", (v1, v2) => {
        return v1 < v2;
    });

    Handlebars.registerHelper("eq", (v1, v2) => {
        return v1 === v2;
    });

    Handlebars.registerHelper("mul", (v1, v2) => {
        return v1 * v2;
    });

    Handlebars.registerHelper("abs", (v) => {
        return Math.abs(v);
    });

    Handlebars.registerHelper("contains", (list, el) => {
        if (!list) return false;
        return list.includes(el);
    });

    // concatinate perk names with ; separator, combine duplicates (add amount of duplicates)
    Handlebars.registerHelper("inlinePerks", (ability) => {
        let perks = ability.data.perks;
        if (!perks) return "";

        let perkString = formatPerks(ability, true);

        // add brackets
        if (perkString !== "") {
            perkString = "(" + perkString + ")";
        }

        return perkString;
    })

    Handlebars.registerHelper("printPerks", formatPerks);
}

function formatPerks(ability, printEndurance = false) {
    let perks = ability.data.perks;
    if (!perks) return "";

    perks.sort((a, b) => {
        // sort by type and name
        if (a.type === b.type) {
            return a.name.localeCompare(b.name);
        }
        return a.type.localeCompare(b.type);
    });

    let perkString = "";
    let enduranceCost = 0;
    for (let i = 0; i < perks.length; i++) {
        perkString += perks[i].name.toUpperCase();
        if (perks[i].data.level.value > 1) {
            perkString += " X" + perks[i].data.level.value;
        }
        if (i < perks.length - 1 && perks[i].data.type !== perks[i + 1].data.type) {
            perkString += "; ";
        } else {
            perkString += ", ";
        }
        enduranceCost += perks[i].data.enduranceCost * perks[i].data.level.value;
    }
    perkString = perkString.substring(0, perkString.length - 2);

    if (enduranceCost < 0) enduranceCost = 0;
    if (enduranceCost > 0 && printEndurance) {
        perkString += "; " + enduranceCost + " " + game.i18n.format("OVA.Endurance.Short");
    }


    return perkString;
}

async function preloadTemplates() {
    return loadTemplates([
        "systems/ova/templates/parts/ability-list.html",
        "systems/ova/templates/parts/effects.html"
    ]);
}

Hooks.on("renderChatMessage", (message, html, data) => {
    if (message.roll) {
        chat.listenToAttackRoll(message, html, data);
    }
});

Hooks.on("renderChatLog", chat.chatListeners);

Hooks.on('preUpdateCombat', function preUpdateCombat(combat, updateData, context) {
    // removing expired effects
    for (let turn of combat.turns) {
        const turnActor = turn.actor ? turn.actor : turn.token.actor;
        if (!turnActor) continue;
        
        for (let effect of turnActor.data.effects) {
            if (effect.data.duration.startTurn == updateData.turn && (updateData.turn > combat.turn || updateData.round > combat.round)) {
                console.log("Activate");
            }
        }

        // == 0 to end effect on turn end, < 1 to end effect on turn start
        const expiredEffects = turnActor.effects.filter(e => e.duration.remaining === 0);
        turnActor.deleteEmbeddedDocuments("ActiveEffect", expiredEffects.map(e => e.id));
    }
});

Hooks.on('updateCombat', function updateCombat(combat, updateData, context, userId) {
    
});

