export default function registerHandlebarsHelpers() {
    Handlebars.registerHelper("abilitySign", (ability) => {
        if (!ability) return "";
        return ability.system.type === "ability" ? "+" : "-";
    });

    Handlebars.registerHelper("maskedKey", (key) => {
        if (!key) return false;
        return key.includes("?");
    });

    Handlebars.registerHelper("signedValue", (value) => {
        return value > 0 ? "+" + value : value;
    });

    Handlebars.registerHelper("get", (object, field) => object?.[field]);
    Handlebars.registerHelper("gt", (v1, v2) => v1 > v2);
    Handlebars.registerHelper("lt", (v1, v2) => v1 < v2);
    Handlebars.registerHelper("eq", (v1, v2) => v1 === v2);
    Handlebars.registerHelper("mul", (v1, v2) => v1 * v2);
    Handlebars.registerHelper("abs", (v) => Math.abs(v));
    Handlebars.registerHelper("contains", (list, el) => list?.includes(el));

    Handlebars.registerHelper("mapEffectKey", (key) => {
        if (!key) return "";
        let suffix = "";
        if (key.startsWith("defenses.") || key.startsWith("resistances.") || key.startsWith("affinity.")) {
            const [type, name] = key.split(".");
            key = type + ".?";
            suffix = ": " + name;
        }
        return game.i18n.localize(CONFIG.OVA.allEffects[key]) + suffix || key;
    });

    Handlebars.registerHelper("mapEffectTime", (value) => CONFIG.OVA.overTimeModes[value] || "");

    Handlebars.registerHelper("activeEffectMode", (mode) => {
        switch (mode) {
            case 1: return "x";
            case 3: return "↓";
            case 4: return "↑";
            case 5: return "⇒";
            default: return "";
        }
    });

    Handlebars.registerHelper("inlinePerks", (ability) => {
        let perkString = formatPerks(ability, true);
        if (perkString !== "") perkString = "(" + perkString + ")";
        return perkString;
    });

    Handlebars.registerHelper("printPerks", formatPerks);
}

function formatPerks(ability, printEndurance = false) {
    const perks = ability.perks;
    if (!perks) return "";

    perks.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type.localeCompare(b.type);
    });

    let perkString = "";
    let enduranceCost = ability.enduranceCost ?? 0;

    for (let i = 0; i < perks.length; i++) {
        const p = perks[i];
        perkString += p.name.toUpperCase();
        if (p.system.level.value > 1) perkString += " X" + p.system.level.value;
        if (p.system.flavor) perkString += ": " + p.system.flavor;

        if (i < perks.length - 1 && perks[i].type !== perks[i + 1].type) {
            perkString += "; ";
        } else {
            perkString += ", ";
        }
    }

    perkString = perkString.slice(0, -2);

    if (enduranceCost < 0) enduranceCost = 0;
    if (enduranceCost > 0 && printEndurance) {
        if (perkString) perkString += "; ";
        perkString += enduranceCost + " " + game.i18n.format("OVA.Endurance.Short");
    }

    return perkString;
}
