export default class OVAEffect {

  data = {};
  item = null;

  constructor(item, data) {
    this.item = item;
    this.data = data;
  }

  /* -------------------------------------------- */
  /*  Static Configuration                        */
  /* -------------------------------------------- */
  static TYPES = {
    "apply-changes": "OVA.Effects.Types.ApplyChanges",
    "apply-active-effect": "OVA.Effects.Types.ApplyActiveEffect",
  };

  static TARGETS = {
    self: "OVA.Effects.Targets.Self",
    target: "OVA.Effects.Targets.Target",
  };

  static OVER_TIME_MODES = {
    "each-round": "OVA.Effects.OverTimeModes.EachRound",
    once: "OVA.Effects.OverTimeModes.Once",
  };

  /* -------------------------------------------- */
  /*  Apply Effect (Derived Data Phase)           */
  /* -------------------------------------------- */
  apply(targetData) {
    const { type, key, mode, keyValue, value, priority } = this.data;
    const itemSystem = this.item.system ?? {};
    const sign = ["weakness", "flaw"].includes(this.item.type) ? -1 : 1;

    targetData.item = itemSystem;
    targetData.level = sign * (itemSystem.level?.value ?? 0);

    const resolvedKeyValue = keyValue ?? itemSystem.flavor ?? "";

    if (!targetData.changes) targetData.changes = [];

    /* ---------------- APPLY CHANGES ---------------- */
    if (type === "apply-changes" && value !== "" && value !== undefined) {
      const evaluatedValue = Number(OVAEffect._safeEval(targetData, value));

      targetData.changes.push({
        source: {
          item: this.item,
          name: this.item.name,
          type: this.item.type
        },
        key,
        mode,
        value: evaluatedValue,
        keyValue: resolvedKeyValue,
        priority
      });

      OVAEffect.applyEffectChanges(
        { key, mode, value: evaluatedValue, keyValue: resolvedKeyValue },
        targetData
      );
    }

    /* -------------- APPLY ACTIVE EFFECT ------------ */
    if (type === "apply-active-effect") {
      if (!targetData.activeEffects) targetData.activeEffects = [];

      targetData.activeEffects.push({
        source: {
          uuid: this.item.uuid,
          name: this.item.name,
          type: this.item.type,
          level: targetData.level
        },
        ...this.data
      });
    }
  }

  /* -------------------------------------------- */
  /*  Immediate Change Application                */
  /* -------------------------------------------- */
  static applyEffectChanges(effect, targetData) {
    const { key, mode, value, keyValue = "" } = effect;
    const resolvedKey = key.replace(/\?/g, keyValue);
    let current = foundry.utils.getProperty(targetData, resolvedKey) ?? 0;

    switch (Number(mode)) {
      case CONST.ACTIVE_EFFECT_MODES.ADD:
        current += value;
        break;
      case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
        current *= value;
        break;
      case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
        current = Math.min(current, value);
        break;
      case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
        current = Math.max(current, value);
        break;
      case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
        current = value;
        break;
    }

    foundry.utils.setProperty(targetData, resolvedKey, current);
  }

  /* -------------------------------------------- */
  /*  ActiveEffect Document Builder               */
  /* -------------------------------------------- */
  static createActiveEffect(effect, rollData) {
    rollData.item = effect.source.item ?? {};
    rollData.level = effect.source.level ?? 0;

    const evaluatedValue = effect.value !== ""
      ? Number(OVAEffect._safeEval(rollData, effect.value))
      : "";

    const resolvedKey = effect.key.replace(/\?/g, effect.keyValue ?? "");

    const aeData = {
      label: effect.source.name,
      origin: effect.source.uuid,
      disabled: false,
      changes: [{
        key: resolvedKey,
        mode: effect.mode,
        value: evaluatedValue,
        priority: effect.priority ?? 0
      }],
      duration: {
        rounds: effect.duration ?? null
      },
      flags: {}
    };

    /* -------- Over-Time Effect Support -------- */
    if (effect.overTime?.when && effect.overTime.key) {
      const otValue = effect.overTime.value !== ""
        ? Number(OVAEffect._safeEval(rollData, effect.overTime.value))
        : "";

      aeData.flags[effect.overTime.when] = {
        key: effect.overTime.key.replace(/\?/g, effect.overTime.keyValue ?? ""),
        mode: effect.overTime.mode,
        value: otValue
      };
    }

    return aeData;
  }

  /* -------------------------------------------- */
  /*  Safe Expression Evaluation                  */
  /* -------------------------------------------- */
  static _safeEval(data, expression) {
    let result;
    try {
      expression = expression.replace(/@/g, "data.");
      const fn = new Function("sandbox", "data", `with(sandbox){ return ${expression}; }`);
      result = fn({ ...Roll.MATH_PROXY }, data);
    } catch {
      result = undefined;
    }

    if (!Number.isFinite(result)) {
      throw new Error(`OVAEffect._safeEval produced non-numeric result: ${expression} → ${result}`);
    }

    return result;
  }

  /* -------------------------------------------- */
  /*  Default Effect Template                    */
  /* -------------------------------------------- */
  static defaultObject() {
    return {
      type: "apply-changes",
      target: "self",
      key: "",
      keyValue: "",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      priority: 0,
      value: "",
      overTime: {
        when: "each-round",
        key: "",
        keyValue: "",
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: ""
      }
    };
  }
}
