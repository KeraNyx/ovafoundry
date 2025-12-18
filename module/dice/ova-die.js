export default class OVADie extends foundry.dice.terms.Die {
    constructor(termData = {}) {
        super(termData);
        Die.MODIFIERS['khs'] = 'keepHighestSum';
    }

    keepHighestSum(modifier) {
        // sum same this.results
        const dieSum = {};
        for (const roll of this.results) {
            if (!dieSum[roll.result]) {
                dieSum[roll.result] = roll.result;
            } else {
                dieSum[roll.result] += roll.result;
            }
        }

        // find die with highest sum
        let highest = 0;
        let hidhestDie = 0;

        for (const die in dieSum) {
            if (dieSum[die] <= highest) continue;
            highest = dieSum[die];
            hidhestDie = die;
        }

        // discard all dice with lower sum
        for (const roll of this.results) {
            if (roll.result != hidhestDie) {
                roll.discarded = true;
                roll.active = false;
            }
        }
    }

}
