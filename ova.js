import { OVA } from "./module/config.js";

import OVAAbilitySheet from "./module/sheets/ova-ability-sheet.js";
import OVACharacterSheet from "./module/sheets/ova-character-sheet.js";
import OVACharacter from "./module/ova-character.js";
import OVAPerkSheet from "./module/sheets/ova-perk-sheet.js";
import OVAItem from "./module/ova-item.js";
import OVADie from "./module/dice/ova-die.js";
import OVAAttackSheet from "./module/sheets/ova-attack-sheet.js";

import * as chat from "./module/chat/chat.js";

Hooks.once("init", function () {
    console.log("OVA | Initializing OVA System");

    CONFIG.OVA = OVA;
    CONFIG.Item.documentClass = OVAItem;
    CONFIG.Actor.documentClass = OVACharacter;
    CONFIG.Dice.types = [OVADie, FateDie]
    CONFIG.Dice.terms['d'] = OVADie;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("ova", OVAAbilitySheet, { types: ["ability"] });
    Items.registerSheet("ova", OVAPerkSheet, { types: ["perk"] });
    Items.registerSheet("ova", OVAAttackSheet, { types: ["attack"] });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("ova", OVACharacterSheet, { makeDefault: true });

    preloadTemplates();
    registerHelper();
});

function registerHelper() {
    Handlebars.registerHelper("abilitySign", (ability) => {
        return ability.data.type === "ability" ? "+" : "-";
    })

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

    Handlebars.registerHelper("contains", (list, el) => {
        if (!list) return false;
        return list.includes(el);
    });

    // concatinate perk names with ; separator, combine duplicates (add amount of duplicates)
    Handlebars.registerHelper("inlinePerks", (ability) => {
        let perks = ability.data.perks;
        if (!perks) return "";

        let perkString = formatPerks(ability);
        let enduranceCost = 0;
        for (let i = 0; i < perks.length; i++) {
            enduranceCost += perks[i].data.enduranceCost * perks[i].data.level.value;
        }

        if (enduranceCost > 0) {
            perkString += "; " + enduranceCost + " " + game.i18n.format("OVA.Endurance.Short");
        }

        // add brackets
        if (perkString !== "") {
            perkString = "(" + perkString + ")";
        }

        return perkString;
    })

    Handlebars.registerHelper("printPerks", formatPerks);
}

function formatPerks(ability) {
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
    }
    perkString = perkString.substring(0, perkString.length - 2);

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