export default class OVAActiveEffect extends ActiveEffect {
    /**
     * Apply this ActiveEffect to a provided Actor.
     * @override
     * @param {Actor} actor                   The Actor to whom this effect should be applied
     * @param {data.EffectChangeData} change  The change data being applied
     * @return {*}                            The resulting applied value
     */
    apply(actor, change) {
        let evaluatedValue = Number.fromString(this._safeEval(data, value));

        super.apply(actor, change);
    }

    // TODO: duplcated code from ova-effect.js - refactor
    _safeEval(data, expression) {
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
}