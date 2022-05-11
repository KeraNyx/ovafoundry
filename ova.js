import { OVA } from "./module/config.js";

import OVAAbilitySheet from "./module/sheets/ova-ability-sheet.js";
import OVACharacterSheet from "./module/sheets/ova-character-sheet.js";
import OVACharacter from "./module/ova-character.js";
import OVAPerkSheet from "./module/sheets/ova-perk-sheet.js";
import OVAItem from "./module/ova-item.js";

Hooks.once("init", function () {
    console.log("OVA | Initializing OVA System");

    CONFIG.OVA = OVA;
    CONFIG.Item.documentClass = OVAItem;
    CONFIG.Actor.documentClass = OVACharacter;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("ova", OVAAbilitySheet, { types: ["ability"] });
    Items.registerSheet("ova", OVAPerkSheet, { types: ["perk"] });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("ova", OVACharacterSheet, { makeDefault: true });

    preloadTemplates();
    registerHelper();
});

function registerHelper() {
    Handlebars.registerHelper("abilitySign", (ability) => {
        return ability.data.type === "ability" ? "+" : "-";
    })

    // concatinate perk names with ; separator, combine duplicates (add amount of duplicates)
    Handlebars.registerHelper("printPerks", (ability) => {
        let perks = ability.data.perks;
        if (!perks) return "";

        let enduranceCost = 0;
        let perkNames = [];
        let perkAmounts = [];
        for (let perk of perks) {
            let perkName = perk.name;
            enduranceCost += perk.data.enduranceCost;
            if (perkNames.includes(perkName)) {
                let index = perkNames.indexOf(perkName);
                perkAmounts[index]++;
            } else {
                perkNames.push(perkName);
                perkAmounts.push(1);
            }
        }

        let perkString = "";
        for (let i = 0; i < perkNames.length; i++) {
            perkString += perkNames[i].toUpperCase();
            if (perkAmounts[i] > 1) {
                perkString += " X" + perkAmounts[i];
            }
            if (i < perkNames.length - 1) {
                perkString += "; ";
            }
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
}

async function preloadTemplates() {
    return loadTemplates([
        "systems/ova/templates/parts/ability-list.html"
    ]);
}
