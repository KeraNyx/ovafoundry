export default class OVADie extends foundry.dice.terms.Die {
    constructor(termData = {}) {
        termData.faces ??= 6;
        termData.results ??= [];
        termData.modifiers ??= [];
        termData.options ??= {};
        super(termData);
    }

    /** OVADie only supports 'khs' as a custom modifier internally */
    modifyResults(modifier) {
        if (modifier === 'khs') this.keepHighestSum();
        return super.modifyResults(modifier);
    }

    /** Custom 'keepHighestSum' behavior */
    keepHighestSum() {
        const dieSums = {};
        for (const roll of this.results) {
            dieSums[roll.result] = (dieSums[roll.result] || 0) + roll.result;
        }

        let highestSum = 0;
        let highestDie = 0;
        for (const dieValue in dieSums) {
            const sum = dieSums[dieValue];
            if (sum > highestSum) {
                highestSum = sum;
                highestDie = Number(dieValue);
            }
        }

        for (const roll of this.results) {
            if (roll.result !== highestDie) {
                roll.discarded = true;
                roll.active = false;
            } else {
                roll.discarded = false;
                roll.active = true;
            }
        }
    }
}
