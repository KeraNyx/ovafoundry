export default class Effect {
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

    apply(data) {
        const { type, target, key, mode, priority, value } = this.data;
        if (type === 'apply-changes') {
            data.item = this.item.data;
            const current = foundry.utils.getProperty(data, key);
            let updade = Number.fromString(this._safeEval(data, value));
            switch (parseInt(mode)) {
                case CONST.ACTIVE_EFFECT_MODES.ADD:
                    updade = current + updade;
                    break;
                case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
                    updade = current * updade;
                    break;
                case CONST.ACTIVE_EFFECT_MODES.DOWGRADE:
                    updade = Math.min(current, updade);
                    break;
                case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
                    updade = Math.max(current, updade);
                    break;
            }
            foundry.utils.setProperty(data, key, updade);
        }
    }

    /** shamelesly stolen and modified from Roll.safeEval */
    _safeEval(data, expression) {
        let result;
        try {
            // replacing all @ symbols with "data"
            expression = expression.replace(/@/g, 'data.');
            const src = 'with (sandbox) { return ' + expression + '}';
            const evl = new Function('sandbox', 'data', src);
            result = evl({ ...data, ...Roll.MATH_PROXY }, data);
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
            value: "1",
        }
    }
}