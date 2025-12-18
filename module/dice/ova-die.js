export default class OVADie extends foundry.dice.terms.Die {
    constructor(termData = {}) {
        super(termData);
        // Register custom modifier if not already present
        if (!foundry.dice.DIE_MODIFIERS.hasOwnProperty('khs')) {
            foundry.dice.DIE_MODIFIERS['khs'] = 'keepHighestSum';
        }
    }

    /** Custom 'keepHighestSum' modifier */
    keepHighestSum(modifier) {
        // Calculate sum of results for each unique die value
        const dieSums = {};
        for (const roll of this.results) {
            dieSums[roll.result] = (dieSums[roll.result] || 0) + roll.result;
        }

        // Find die value with the highest sum
        let highestSum = 0;
        let highestDie = 0;
        for (const dieValue in dieSums) {
            const sum = dieSums[dieValue];
            if (sum > highestSum) {
                highestSum = sum;
                highestDie = Number(dieValue);
            }
        }

        // Discard all dice that are not the highest sum
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
