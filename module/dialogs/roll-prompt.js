const sizeMods = {
    'disadvantage': -5,
    'normal': 0,
    'advantage': 5,
}

export default class RollPrompt extends Dialog {
    resolve = null;
    constructor(title, type, actor, enduranceCost, roll = 2) {
        const defenseButtons = {
            '0': {
                label: '0',
                callback: html => this._roll(html, 0),
            },
            'roll': {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('OVA.MakeRoll'),
                callback: html => this._roll(html, 1),
            },
            'double': {
                label: game.i18n.localize('OVA.Roll.DontHurtMe'),
                callback: html => this._roll(html, 2),
            }
        }

        const stdButtons = {
            roll: {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('OVA.MakeRoll'),
                callback: html => this._roll(html, 1)
            }
        }

        const dramaButtons = {
            drama: {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('OVA.Roll.Drama') + ' (5)',
                callback: html => this._roll(html, 1)
            },
            miracle: {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('OVA.Roll.Miracle') + ' (30)',
                callback: html => this._roll(html, 6)
            }
        }

        let buttons = type === 'drama' ? dramaButtons : stdButtons;
        buttons = type === 'defense' ? defenseButtons : buttons;
        let defButton = type === 'drama' ? 'drama' : 'roll';

        const dialogData = {
            title: title,
            content: "html",
            buttons: buttons,
            default: defButton,
            close: () => this._close,
        };
        super(dialogData, {});

        this.actor = actor;
        this.type = type;
        this.enduranceCost = enduranceCost;
        this.roll = roll;
        this.enduranseSelection = "base";
        this.sizeSelection = "normal";
    }

    get template() {
        return 'systems/ova/templates/dialogs/roll-dialog.html';
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.size[data-selection]').click(this._selectSize.bind(this));
        html.find('.enduranse-pool[data-selection]').click(this._selectEnduransePool.bind(this));
    }

    _selectSize(e) {
        e.preventDefault();
        const size = $(e.currentTarget).data('selection');
        this.sizeSelection = size;
        this.render(true);
    }
    _selectEnduransePool(e) {
        e.preventDefault();
        const enduransePool = $(e.currentTarget).data('selection');
        this.enduranseSelection = enduransePool;
        this.render(true);
    }

    getData() {
        const data = super.getData();
        data.actor = this.actor;
        data.enduranceCost = this.enduranceCost;
        if (this.type === 'drama' && data.enduranceCost > 0) {
            data.enduranceCost = `${this.enduranceCost}/${this.enduranceCost * 6}`;
        }
        data.enduranseSelection = this.enduranseSelection;
        data.type = this.type;
        data.sizeSelection = this.sizeSelection;

        return data;
    }

    _close() {
        this.resolve(false);
    }

    _roll(html, mul) {
        let mod = parseInt(html.find('#roll-modifier').val());
        if (isNaN(mod)) mod = 0;

        let roll = this.roll + mod + sizeMods[this.sizeSelection];
        let negativeDice = false;
        if (roll <= 0) {
            negativeDice = true;
            roll = 2 - roll;
        }

        roll = negativeDice ? Math.ceil(roll / mul) : roll * mul;

        const dice = this._makeRoll(roll, negativeDice);

        this.resolve && this.resolve({
            dice: dice,
            roll: roll,
        });
        // drama dice enduranse cost set for each die
        if (this.type === 'drama') {
            this.enduranceCost = this.enduranceCost * mul;
        }
        this.actor.changeEndurance(-this.enduranceCost, this.enduranseSelection === "reserve");
    }

    _makeRoll(roll, negative = false) {
        // roll dice
        let dice;
        if (negative) {
            dice = new Roll(`${roll}d6kl`);
        } else {
            dice = new Roll(`${roll}d6khs`);
        }
        dice.evaluate({ async: false })

        return dice;
    }

    async show() {
        this.render(true);
        return new Promise(resolve => this.resolve = resolve);
    }
}