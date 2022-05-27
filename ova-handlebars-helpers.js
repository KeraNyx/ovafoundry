export default function registerHandlebarsHelpers() {
    Handlebars.registerHelper("abilitySign", (ability) => {
        if (!ability) return "";
        return ability.data.type === "ability" ? "+" : "-";
    });

    Handlebars.registerHelper("maskedKey", (key) => {
        // check if key has a mask (?)
        return key.indexOf("?") !== -1;
    });

    Handlebars.registerHelper("signedValue", (value) => {
        return value > 0 ? "+" + value : value;
    });

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
    });

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