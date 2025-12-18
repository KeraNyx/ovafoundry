import OVAEffect from "./effects/ova-effect.js";

export const OVA = {};

/* -------------------------------------------- */
/*  Ability & Perk Types                        */
/* -------------------------------------------- */

OVA.abilityTypes = {
  ability: "OVA.Ability.Name",
  weakness: "OVA.Weakness.Name",
};

OVA.perkTypes = {
  perk: "OVA.Perk.Name",
  flaw: "OVA.Flaw.Name",
};

OVA.rootAbilityTypes = {
  modifier: "OVA.Ability.Type.Modifier",
  entity: "OVA.Ability.Type.Entity",
};

/* -------------------------------------------- */
/*  Effect Configuration                        */
/* -------------------------------------------- */

OVA.effectTargets = OVAEffect.TARGETS;
OVA.effectTypes = OVAEffect.TYPES;

OVA.activeEffectModes = Object.entries(CONST.ACTIVE_EFFECT_MODES).reduce(
  (obj, [key, value]) => {
    obj[value] = `EFFECT.MODE_${key}`;
    return obj;
  },
  {}
);

/* -------------------------------------------- */
/*  Persistent Effect Keys                      */
/* -------------------------------------------- */

OVA.activeEffectKeys = {
  globalMod: "OVA.Effects.List.GlobalMod",
  globalRollMod: "OVA.Effects.List.GlobalRollMod",
  globalDefMod: "OVA.Effects.List.GlobalDefMod",
  armor: "OVA.Effects.List.Armor",
  speed: "OVA.Effects.List.Speed",
  "hp.max": "OVA.Effects.List.HP.Max",
  "endurance.max": "OVA.Effects.List.Endurance.Max",
  "resistances.?": "OVA.Effects.List.Resistances",
  "defenses.?": "OVA.Effects.List.Defenses",
  "enduranceReserve.max": "OVA.Effects.List.EnduranceReserve.Max",
  "dramaDice.free": "OVA.Effects.List.DramaDice.Free",
};

/* -------------------------------------------- */
/*  Item / Attack Effect Keys                   */
/* -------------------------------------------- */

OVA.effectChangeKeys = {
  "attack.dx": "OVA.Effects.List.Attack.DX",
  "attack.roll": "OVA.Effects.List.Attack.Roll",
  "attack.ignoreArmor": "OVA.Effects.List.IgnoreArmor",
  "ovaFlags.?": "OVA.Effects.List.Flags",
  "affinity.?": "OVA.Effects.List.Affinity",
  "hpReserve.max": "OVA.Effects.List.HPReserve",
  ...OVA.activeEffectKeys,
};

/* -------------------------------------------- */
/*  Over-Time Effects (v13 paths)               */
/* -------------------------------------------- */

OVA.overTimeEffect = {
  "system.hp.value": "OVA.Effects.List.HP.Value",
  "system.endurance.value": "OVA.Effects.List.Endurance.Value",
  "system.enduranceReserve.value": "OVA.Effects.List.EnduranceReserve.Value",
};

OVA.overTimeModes = OVAEffect.OVER_TIME_MODES;

/* -------------------------------------------- */
/*  Unified Effect Map                          */
/* -------------------------------------------- */

OVA.allEffects = {
  ...OVA.effectChangeKeys,
  ...OVA.overTimeEffect,
};
