import OVADie from "../dice/ova-die.js";

const sizeMods = {
    disadvantage: -5,
    normal: 0,
    advantage: 5,
};

export default class RollPrompt extends Dialog {
    resolve = null;

    constructor(title, type, actor, attack, enduranceCost, roll = 2) {
        const defenseButtons = {
            '0': { label: '0', callback: html => this._roll(html, 0) },
            roll: { icon: '<i class="fas fa-dice"></i>', label: game.i18n.localize('OVA.MakeRoll'), callback: html => this._roll(html, 1) },
            double: { label: 'x2', callback: html => this._roll(html, 2) },
        };

        const stdButtons = {
            roll: { icon: '<i class="fas fa-dice"></i>', label: game.i18n.localize('OVA.MakeRoll'), callback: html => this._roll(html, 1) },
        };

        const dramaButtons = {
            drama: { icon: '<i class="fas fa-dice"></i>', label: `${game.i18n.localize('OVA.Roll.Drama')} (5)`, callback: html => this._roll(html, 1) },
            miracle: { icon: '<i class="fas fa-dice"></i>', label: `${game.i18n.localize('OVA.Roll.Miracle')} (30)`, callback: html => this._roll(html, 6) },
        };

        let buttons = type === 'drama' ? dramaButtons : stdButtons;
        buttons = type === 'defense' ? defenseButtons : buttons;
        const defaultButton = type === 'drama' ? 'drama' : 'roll';

        super({
            title,
            content: 'html',
            buttons,
            default: defaultButton,
            close: () => this._close(),
        });

        this.actor = actor;
        this.type = type;
        this.roll = roll;
        this.enduranseSelection = 'base';
        this.sizeSelection = 'normal';
        this.attack = attack;
        this._baseEnduranceCost = enduranceCost;
    }

    get template() {
        return 'systems/ova/templates/dialogs/roll-dialog.html';
    }

    activateListeners(html) {
        super.activateListeners(html);
        const root = html instanceof HTMLElement ? html : html[0];

        root?.querySelector('#endurance-cost')?.addEventListener('input', this._changeEnduranceCost.bind(this));
        root?.querySelectorAll('.size[data-selection]').forEach(el => el.addEventListener('click', this._selectSize.bind(this)));
        root?.querySelectorAll('.enduranse-pool[data-selection]').forEach(el => el.addEventListener('click', this._selectEnduransePool.bind(this)));
    }

    _changeEnduranceCost(e) {
        e.preventDefault();
        this._baseEnduranceCost = parseInt(e.currentTarget.value);
    }

    _selectSize(e) {
        e.preventDefault();
        this.sizeSelection = e.currentTarget.dataset.selection;
        this.render(true);
    }

    _selectEnduransePool(e) {
        e.preventDefault();
        this.enduranseSelection = e.currentTarget.dataset.selection;
        this.render(true);
    }

    getData() {
        const data = super.getData();
        data.actor = this.actor;
        data.enduranceCost = this.type === 'drama' && this._baseEnduranceCost > 0
            ? `${this._baseEnduranceCost}/${this._baseEnduranceCost * 6}`
            : this._baseEnduranceCost;
        data.enduranseSelection = this.enduranseSelection;
        data.type = this.type;
        data.sizeSelection = this.sizeSelection;
        return data;
    }

    _close() {
        this.resolve?.(false);
    }

    async _roll(html, multiplier) {
        const root = html instanceof HTMLElement ? html : html?.[0];
        if (!root) return;

        let mod = parseInt(root.querySelector('#roll-modifier')?.value) || 0;
        let rollValue = this.roll + mod + sizeMods[this.sizeSelection];
        let negativeDice = false;

        if (rollValue <= 0) {
            negativeDice = true;
            rollValue = 2 - rollValue;
        }

        rollValue = negativeDice && multiplier !== 0
            ? Math.ceil(rollValue / multiplier)
            : rollValue * multiplier;

        const dice = await this._makeRoll(rollValue, negativeDice);

        this.resolve?.({ dice, roll: rollValue });

        let effectiveCost = this._baseEnduranceCost;
        if (this.type === 'drama') effectiveCost *= multiplier;

        this.actor?.changeEndurance?.(
            -effectiveCost,
            this.enduranseSelection === 'reserve'
        );
    }

    async _makeRoll(roll, negative = false) {
        const formula = negative ? `${roll}d6kl` : `${roll}d6khs`;
        const dice = new Roll(formula);

        // Foundry 13 automatically handles async dice terms
        await dice.evaluate();
        return dice;
    }

    async show() {
        this.render(true);
        return new Promise(resolve => this.resolve = resolve);
    }
}
