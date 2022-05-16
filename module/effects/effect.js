export default class Effect {
    data = {};
    constructor(data) {
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
    }

    apply(data) {
        const { type, target, key, mode, priority, value } = this.data;
        if (type === 'apply-changes') {
            const current = foundry.utils.getProperty(data, key);
            let updade = Number.fromString(_safeEval(data, value));
            switch (mode) {
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
            throw new Error(`Effect.safeEval produced a non-numeric result from expression "${expression}"`);
        }
        return result;
    };
}