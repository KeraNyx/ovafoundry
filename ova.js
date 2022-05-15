import { OVA } from "./module/config.js";

import OVAAbilitySheet from "./module/sheets/ova-ability-sheet.js";
import OVACharacterSheet from "./module/sheets/ova-character-sheet.js";
import OVACharacter from "./module/ova-character.js";
import OVAPerkSheet from "./module/sheets/ova-perk-sheet.js";
import OVAItem from "./module/ova-item.js";
import OVADie from "./module/dice/ova-die.js";
import OVAAttackSheet from "./module/sheets/ova-attack-sheet.js";

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

    // concatinate perk names with ; separator, combine duplicates (add amount of duplicates)
    Handlebars.registerHelper("printPerks", (ability) => {
        let perks = ability.data.perks;
        if (!perks) return "";

        let perkString = "";
        let enduranceCost = 0;
        for (let i = 0; i < perks.length; i++) {
            enduranceCost += perks[i].data.enduranceCost * perks[i].data.level.value;
            perkString += perks[i].name.toUpperCase();
            perkString  += " X" + perks[i].data.level.value;
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
