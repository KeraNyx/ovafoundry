const TEMPLATE = 'systems/ova/templates/dialogs/roll-dialog.html';

export default class RollPrompt extends Dialog {
    resolve = null;
    constructor(title, type, actor, enduranceCost) {
        const dialogData = {
            title: title,
            content: "html",
            buttons: {
                disadvantage: {
                    icon: '<i class="fas fa-minus-circle"></i>',
                    condition: type !== 'spell',
                    label: game.i18n.localize('OVA.Disadvantage.Name'),
                    callback: html => this._makeRoll(html, -5)
                },
                normal: {
                    icon: '<i class="fas fa-check-circle"></i>',
                    label: game.i18n.localize('OVA.Normal.Name'),
                    callback: html => this._makeRoll(html, 0)
                },
                advantage: {
                    icon: '<i class="fas fa-plus-circle"></i>',
                    condition: type !== 'spell',
                    label: game.i18n.localize('OVA.Advantage.Name'),
                    callback: html => this._makeRoll(html, 5)
                }
            },
            default: "normal",
            close: () => this._close,
        };
        super(dialogData, {});

        this.actor = actor;
        this.enduranceCost = enduranceCost;
        this.selection = {
            base: true,
            reserve: false,
        }
    }

    get template() {
        return 'systems/ova/templates/dialogs/roll-dialog.html';
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.base-end').click(this._baseEnduranceSelect.bind(this));
        html.find('.end-reserve').click(this._enduranceReserveSelect.bind(this));
    }

    _baseEnduranceSelect(event) {
        event.preventDefault();
        this.selection = {
            base: true,
            reserve: false,
        }
        this.render(true);
    }
    _enduranceReserveSelect(event) {
        event.preventDefault();
        this.selection = {
            base: false,
            reserve: true,
        }
        this.render(true);
    }


    getData() {
        const data = super.getData();
        data.actor = this.actor;
        data.enduranceCost = this.enduranceCost;
        data.selection = this.selection;

        return data;
    }

    _close() {
        this.resolve(false);
    }

    _makeRoll(html, adv) {
        const mod = html.find('#roll-modifier').val();

        this.resolve && this.resolve(adv + parseInt(mod));
        this.actor.changeEndurance(-this.enduranceCost);
    }

    async show() {
        this.render(true);
        return new Promise(resolve => this.resolve = resolve);
    }

    static async RenderPrompt(title, actor) {
        const html = await renderTemplate(TEMPLATE, { actor });

        return new Promise((resolve, reject) => {
            const dialog = new Dialog({
                title: title,
                content: html,
                buttons: {
                    disadvantage: {
                        icon: '<i class="fas fa-minus-circle"></i>',
                        label: game.i18n.localize('OVA.Disadvantage.Name'),
                        callback: html => {
                            const mod = html.find('#roll-modifier').val();
                            resolve(-5 + parseInt(mod));
                        }
                    },
                    normal: {
                        icon: '<i class="fas fa-check-circle"></i>',
                        label: game.i18n.localize('OVA.Normal.Name'),
                        callback: html => {
                            const mod = html.find('#roll-modifier').val();
                            resolve(0 + parseInt(mod));
                        }
                    },
                    advantage: {
                        icon: '<i class="fas fa-plus-circle"></i>',
                        label: game.i18n.localize('OVA.Advantage.Name'),
                        callback: html => {
                            const mod = html.find('#roll-modifier').val();
                            resolve(5 + parseInt(mod));
                        }
                    }
                },
                default: "normal",
                close: () => resolve(false),
            });
            dialog.render(resolve);
        });
    }
}