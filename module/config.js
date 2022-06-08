import OVAEffect from "./effects/ova-effect.js";

export const OVA = {};

OVA.abilityTypes = {
    "ability": "OVA.Ability.Name",
    "weakness": "OVA.Weakness.Name",
};

OVA.perkTypes = {
    "perk": "OVA.Perk.Name",
    "flaw": "OVA.Flaw.Name",
};

OVA.rootAbilityTypes = {
    "modifier": "OVA.Ability.Type.Modifier",
    "entity": "OVA.Ability.Type.Entity"
};

OVA.effectTargets = OVAEffect.TARGETS;
OVA.effectTypes = OVAEffect.TYPES;
OVA.activeEffectModes = Object.entries(CONST.ACTIVE_EFFECT_MODES).reduce((obj, e) => {
    obj[e[1]] = "EFFECT.MODE_" + e[0];
    return obj;
}, {});

OVA.activeEffectKeys = {
    "globalMod": "OVA.Effects.List.GlobalMod",
    "globalRollMod": "OVA.Effects.List.GlobalRollMod",
    "globalDefMod": "OVA.Effects.List.GlobalDefMod",
    "armor": "OVA.Effects.List.Armor",
    "speed": "OVA.Effects.List.Speed",
    "hp.max": "OVA.Effects.List.HP.Max",
    "endurance.max": "OVA.Effects.List.Endurance.Max",
    "resistances.?": "OVA.Effects.List.Resistances",
    "defenses.?": "OVA.Effects.List.Defenses",
    "enduranceReserve.max": "OVA.Effects.List.EnduranceReserve.Max",
    "dramaDice.free": "OVA.Effects.List.DramaDice.Free",
}

OVA.effectChangeKeys = {
    "attack.dx": "OVA.Effects.List.Attack.DX",
    "attack.roll": "OVA.Effects.List.Attack.Roll",
    "attack.ignoreArmor": "OVA.Effects.List.IgnoreArmor",
    "ovaFlags.?": "OVA.Effects.List.Flags",
    "affinity.?": "OVA.Effects.List.Affinity",
    ...OVA.activeEffectKeys,
};

OVA.overTimeEffect = {
    "data.hp.value": "OVA.Effects.List.HP.Value",
    "data.endurance.value": "OVA.Effects.List.Endurance.Value",
    "data.enduranceReserve.value": "OVA.Effects.List.EnduranceReserve.Value",
};

OVA.overTimeModes = OVAEffect.OVER_TIME_MODES;

OVA.allEffects = {
    ...OVA.effectChangeKeys,
    ...OVA.overTimeEffect,
};

