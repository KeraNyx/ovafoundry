export default function registerHandlebarsHelpers() {
    Handlebars.registerHelper("abilitySign", (ability) => {
        if (!ability) return "";
        return ability.data.type === "ability" ? "+" : "-";
    });

    Handlebars.registerHelper("maskedKey", (key) => {
        if (!key) return false;
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

    Handlebars.registerHelper("mapEffectKey", (key) => {
        if (!key) return "";

        let suffix = "";
        // if key starts with defenses or resistances, replace suffix with ?
        if (key.startsWith("defenses.") || key.startsWith("resistances.")) {
            const [type, name] = key.split(".")
            key = type + ".?";
            suffix = ": " + name;
        }
        return game.i18n.localize(CONFIG.OVA.allEffects[key]) + suffix || key;
    });

    Handlebars.registerHelper("mapEffectTime", (value) => {
        return CONFIG.OVA.overTimeModes[value] || "";
    });

    Handlebars.registerHelper("activeEffectMode", (mode) => {
        switch (mode) {
            case 1:
                return "x";
            case 3:
                return "↓";
            case 4:
                return "↑";
            case 5:
                return "⇒";
            default:
                return "";
        }
    });

    // concatinate perk names with ; separator, combine duplicates (add amount of duplicates)
    Handlebars.registerHelper("inlinePerks", (ability) => {
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
    let perks = ability.perks;
    if (!perks) return "";

    perks.sort((a, b) => {
        // sort by type and name
        if (a.type === b.type) {
            return a.name.localeCompare(b.name);
        }
        return a.type.localeCompare(b.type);
    });

    let perkString = "";
    let enduranceCost = ability.enduranceCost;
    for (let i = 0; i < perks.length; i++) {
        perkString += perks[i].name.toUpperCase();
        if (perks[i].data.level.value > 1) {
            perkString += " X" + perks[i].data.level.value;
        }
        if (perks[i].data.flavor) {
            perkString += ": "+perks[i].data.flavor;
        }
        if (i < perks.length - 1 && perks[i].data.type !== perks[i + 1].data.type) {
            perkString += "; ";
        } else {
            perkString += ", ";
        }
    }
    perkString = perkString.substring(0, perkString.length - 2);

    if (enduranceCost < 0) enduranceCost = 0;
    if (enduranceCost > 0 && printEndurance) {
        if (perkString) {
            perkString += "; ";
        }
        perkString += enduranceCost + " " + game.i18n.format("OVA.Endurance.Short");
    }


    return perkString;
}