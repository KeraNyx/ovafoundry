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
        this.enduranceCost = enduranceCost;
        this.roll = roll;
        this.enduranseSelection = 'base';
        this.sizeSelection = 'normal';
        this.attack = attack;
    }

    get template() {
        return 'systems/ova/templates/dialogs/roll-dialog.html';
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.querySelector('#endurance-cost')?.addEventListener('input', this._changeEnduranceCost.bind(this));
        html.querySelectorAll('.size[data-selection]').forEach(el => el.addEventListener('click', this._selectSize.bind(this)));
        html.querySelectorAll('.enduranse-pool[data-selection]').forEach(el => el.addEventListener('click', this._selectEnduransePool.bind(this)));
    }

    _changeEnduranceCost(e) {
        e.preventDefault();
        this.enduranceCost = parseInt(e.currentTarget.value);
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
        data.enduranceCost = this.type === 'drama' && this.enduranceCost > 0
            ? `${this.enduranceCost}/${this.enduranceCost * 6}`
            : this.enduranceCost;
        data.enduranseSelection = this.enduranseSelection;
        data.type = this.type;
        data.sizeSelection = this.sizeSelection;
        return data;
    }

    _close() {
        this.resolve?.(false);
    }

    _roll(html, multiplier) {
        let mod = parseInt(html.querySelector('#roll-modifier')?.value) || 0;

        let roll = this.roll + mod + sizeMods[this.sizeSelection];
        let negativeDice = false;

        if (roll <= 0) {
            negativeDice = true;
            roll = 2 - roll;
        }

        roll = negativeDice && multiplier !== 0 ? Math.ceil(roll / multiplier) : roll * multiplier;

        const dice = this._makeRoll(roll, negativeDice);

        this.resolve?.({ dice, roll });

        if (this.type === 'drama') this.enduranceCost *= multiplier;

        this.actor.changeEndurance?.(-this.enduranceCost, this.enduranseSelection === 'reserve');
    }

    _makeRoll(roll, negative = false) {
        const formula = negative ? `${roll}d6kl` : `${roll}d6khs`;
        const dice = new Roll(formula);
        dice.evaluate({ async: false });
        return dice;
    }

    async show() {
        this.render(true);
        return new Promise(resolve => this.resolve = resolve);
    }
}
