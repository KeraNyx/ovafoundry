export default class OVAEffect {
    data = {};
    item = null;
    constructor(item, data) {
        /**
         * {
         * type: "apply-changes|apply-active-effect",
         * target: actor, // the target of the effect (only active effect)
         * key: "str|dex|con|int|wis|cha",
         * mode: CONST.ACTIVE_EFFECT_MODES,
         * priority: 0, // only for active effects
         * value: "1",
         * duration: "1", // duration in rounds,only for active effects
         * }
         */
        this.data = data;
        this.item = item;
    }

    static TYPES = {
        "apply-changes": "OVA.Effects.Types.ApplyChanges",
        "apply-active-effect": "OVA.Effects.Types.ApplyActiveEffect",
    }

    static TARGETS = {
        "self": "OVA.Effects.Targets.Self",
        "target": "OVA.Effects.Targets.Target",
    }

    static OVER_TIME_MODES = {
        "each-round": "OVA.Effects.OverTimeModes.EachRound",
        "once": "OVA.Effects.OverTimeModes.Once",
    }


    apply(data) {
        // do not remove all of them are used in ActiveEffecs!
        const { type, target, key, mode, duration, value } = this.data;
        data.item = this.item.data || {};
        data.level = this.item.data.level?.value || 0;
        if (!data.changes) data.changes = [];
        if (type === 'apply-changes') {
            if (!value) return;
            let evaluatedValue = Number.fromString(OVAEffect._safeEval(data, value));

            data.changes.push({
                source: {
                    data: this.item.data,
                    name: this.item.name,
                    type: this.item.type
                }, key: key, mode: mode, value: evaluatedValue
            });
            OVAEffect.applyEffectChanges({ key, mode, value: evaluatedValue }, data);
        } else if (type === 'apply-active-effect') {
            if (!data.effects) data.effects = [];
            data.effects.push({
                source: {
                    uuid: this.item.uuid,
                    data: this.item.data,
                    name: this.item.name,
                    type: this.item.type,
                    level: this.item.data.level.value
                },
                ...this.data,
            });
        }
    }

    static applyEffectChanges(effect, data) {
        const { key, mode, value } = effect;
        let current = foundry.utils.getProperty(data, key) || 0;
        switch (parseInt(mode)) {
            case CONST.ACTIVE_EFFECT_MODES.ADD:
                current = current + value;
                break;
            case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
                current = current * value;
                break;
            case CONST.ACTIVE_EFFECT_MODES.DOWGRADE:
                current = Math.min(current, value);
                break;
            case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
                current = Math.max(current, value);
                break;
        }
        foundry.utils.setProperty(data, key, current);
    }

    static createActiveEffect(effect, data) {
        data.item = effect.source.data;
        data.level = effect.source.level;

        const evaluatedValue = effect.value ? Number.fromString(OVAEffect._safeEval(data, effect.value)) : "";
        // replace ? in key with keyValue
        const key = effect.key.replace(/\?/g, effect.keyValue);
        const effectData = {
            label: effect.source.name,
            origin: effect.source.uuid,
            active: effect.active,
            changes: [{
                key: key,
                mode: effect.mode,
                value: evaluatedValue,
                priority: effect.priority
            }],
            duration: {
                rounds: effect.duration,
            }
        }

        // checking if all overTime values are present
        if (effect.overTime && effect.overTime.when && effect.overTime.key && effect.overTime.value) {
            const evaluatedoverTimeValue = effect.overTime.value ? Number.fromString(OVAEffect._safeEval(data, effect.overTime.value)) : "";
            const overTimeKey = effect.overTime.key?.replace(/\?/g, effect.overTime.keyValue);
            effectData.flags = {};
            effectData.flags[effect.overTime.when] = {
                key: overTimeKey,
                mode: effect.overTime.mode,
                value: evaluatedoverTimeValue,
            }
        }

        return effectData;
    }

    /** shamelesly stolen and modified from Roll.safeEval */
    static _safeEval(data, expression) {
        let result;
        try {
            // replacing all @ symbols with "data"
            expression = expression.replace(/@/g, 'data.');
            const src = 'with (sandbox) { return ' + expression + '; }';
            const evl = new Function('sandbox', 'data', src);
            result = evl({ ...Roll.MATH_PROXY }, data);
        } catch {
            result = undefined;
        }
        if (!Number.isNumeric(result)) {
            throw new Error(`Effect.safeEval produced a non-numeric result from expression "${expression}" (${result})`);
        }
        return result;
    };

    static degaultObject() {
        return {
            type: "apply-changes",
            target: "self",
            key: "",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            priority: 0,
            value: "",
            overTime: {
                when: "each-round",
                key: "",
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                value: "",
            }
        }
    }
}