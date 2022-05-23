import RollPrompt from "../dialogs/roll-prompt.js";
import RollDialog from "../dialogs/roll-prompt.js";

export default class OVACharacterSheet extends ActorSheet {
    /** @override */
    constructor(...args) {
        super(...args);
        this.selectedAbilities = [];
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/ova/templates/sheets/ova-character-sheet.html',
        });
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        html.find('.item-view').click(this._startEditingItem.bind(this));
        html.find('.item-edit').on("blur", this._endEditingItem.bind(this));
        html.find('.item-edit').click(this._editItem.bind(this));
        html.find('.item-value').on("input", this._onItemValueChange.bind(this));
        html.find('.item-value').keypress(this._itemValueValidator.bind(this));
        html.find('.ability-description').on("contextmenu", this._editItem.bind(this));
        html.find('.ability-name').click(this._selectAbility.bind(this));
        html.find('.ability-active').click(this._toggleAbility.bind(this));

        html.find('.roll-dice').click(this._makeManualRoll.bind(this));

        html.find('.attack-block').on("contextmenu", this._editItem.bind(this));
        html.find('.add-attack').click(this._addAttack.bind(this));

        html.find('.attack-block').click(this._makeAttackRoll.bind(this));
        html.find('.defense-value').click(this._makeDefenseRoll.bind(this));

        html.find('.effect-delete').click(this._removeEffect.bind(this));

        const inputs = html.find("input");
        inputs.focus(ev => ev.currentTarget.select());
        inputs.addBack().find('[data-dtype="Number"]').change(this._onChangeInputDelta.bind(this));
    }

    async _addAttack(e) {
        e.preventDefault();
        const attack = await this.actor.createAttack();
        attack[0].sheet.render(true, { editable: true });
    }

    _endEditingItem(e) {
        e.stopPropagation();
        e.preventDefault();

        var view = e.target.parentNode.querySelector(".item-view");
        view.classList.toggle("hidden");
        e.target.classList.toggle("hidden");
    }

    _startEditingItem(e) {
        e.stopPropagation();
        e.preventDefault();

        var input = e.target.parentNode.querySelector(".item-value");
        input.classList.toggle("hidden");
        e.target.classList.toggle("hidden");
        input.focus();
        input.select();
    }

    async _onSubmit(event, options) {
        const formData = this._getSubmitData({});
        this._submitItems(formData);
        await super._onSubmit(event, options);
    }

    _removeEffect(event) {
        event.preventDefault();

        const effectId = this._getItemId(event);
        this.actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
    }

    _submitItems(data) {
        const changedItems = []

        for (const item in data) {
            // if it start with "item-"
            if (!item.startsWith("item-")) continue;
            const itemId = item.split("-")[1];
            const itemData = data[item];

            changedItems.push({ _id: itemId, "data.level.value": itemData });
        }

        this.actor.updateEmbeddedDocuments("Item", changedItems);
    }

    _makeDefenseRoll(event) {
        event.preventDefault();
        const defense = event.currentTarget.dataset.deftype;

        const dice = this.actor.data.defenses[defense];
        this._makeRoll({ roll: dice, type: "defense" });
    }

    _makeAttackRoll(event) {
        event.preventDefault();
        const attackId = this._getItemId(event);

        const attack = this.actor.items.find(i => i.id === attackId);
        if (!attack) {
            console.log(`Could not find attack with id ${attackId}`);
            return;
        }

        this._makeRoll({ ...attack.data, type: "attack", attack: attack });
    }

    _makeManualRoll(event) {
        event.preventDefault();
        const abilities = this.actor.items.filter(i => this.selectedAbilities.includes(i.id));

        const rollData = {
            mod: 2
        };

        const perks = [];
        for (const ability of abilities) {
            const abilityData = ability.data;
            let sign = 1;
            if (abilityData.data.type === "weakness") sign = -1;
            if (abilityData.name.toLowerCase() in rollData) {
                rollData[abilityData.name.toLowerCase()] += sign * abilityData.data.level.value;
            } else {
                rollData[abilityData.name.toLowerCase()] = sign * abilityData.data.level.value;
            }
            if (abilityData.data.perks) {
                perks.push(...abilityData.data.perks);
            }
        }
        let enduranceCost = perks.reduce((cost, perk) => cost + perk.data.level.value * perk.data.enduranceCost, 0);
        if (enduranceCost < 0) enduranceCost = 0;

        // sum roll modifiers
        let diceTotal = Object.values(rollData).reduce((a, b) => a + b, 0);

        this._makeRoll({ roll: diceTotal, changes: perks, enduranceCost: enduranceCost});
    }

    async _makeRoll({ roll = 2, dx = 1, effects = [], enduranceCost = 0, ignoreArmor = 0, type = "manual", changes = [], attack = null }) {
        const result = await RollPrompt.RenderPrompt("");
        if (result === false) return;

        // TODO: add changes to list of changes
        roll += result;
        let negativeDice = false;
        if (roll <= 0) {
            negativeDice = true;
            roll = 2 - roll;
        }

        // roll dice
        let dice;
        if (negativeDice) {
            dice = new Roll(`${roll}d6kl`);
        } else {
            dice = new Roll(`${roll}d6khs`);
        }
        dice.evaluate({ async: false })
        this.actor.addActiveEffects(effects.filter(e => e.target === 'self'));
        const rollData = {
            roll: roll,
            dx: dx,
            result: dice.result,
            ignoreArmor: ignoreArmor,
            effects: effects.filter(e => e.target === 'target'),
            type: type,
            changes: changes,
        };
        const templateData = { 
            attack: attack, 
            changes: changes,
            rollResults: await dice.render({isPrivate: false})
        };

        let html = await renderTemplate("systems/ova/templates/chat/attack-message.html", templateData);

        const msgData = {
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            user: game.user.data._id,
            flavor: type,
            roll: dice,
            content: html,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flags: { "roll-data": rollData },
        };

        ChatMessage.applyRollMode(msgData, game.settings.get("core", "rollMode"));

        ChatMessage.create(msgData);
    };
    //** allow only numbers */
    _itemValueValidator(event) {
        if (event.which < 48 || event.which > 57) event.preventDefault();
    }

    _editItem(event) {
        event.preventDefault();
        const itemId = this._getItemId(event);

        const item = this.actor.items.find(i => i.id === itemId);
        if (!item) {
            console.log(`Could not find item with id ${itemId}`);
            return;
        }

        item.sheet.render(true, { editable: true });
    }

    _toggleAbility(event) {
        event.preventDefault();

        const abilityId = this._getItemId(event);
        const ability = this.actor.items.find(i => i.id === abilityId);
        if (!ability) {
            console.log(`Could not find item with id ${abilityId}`);
            return;
        }

        const newValue = !ability.data.data.active;
        const values = [{ _id: ability.id, "data.active": newValue }];

        // find children of ability
        const children = this.actor.items.filter(i => i.data.data.rootId === abilityId);
        for (const child of children) {
            values.push({ _id: child.id, "data.active": newValue });
        }

        this.actor.updateEmbeddedDocuments("Item", values);
    }

    /** shamelesly stolen from dnd5e. You have my thanks! */
    _onChangeInputDelta(event) {
        const input = event.target;
        const value = input.value;
        if (["+", "-"].includes(value[0])) {
            let delta = parseFloat(value);
            input.value = getProperty(this.actor.data, input.name) + delta;
        } else if (value[0] === "=") {
            input.value = value.slice(1);
        }
    }


    _selectAbility(event) {
        event.preventDefault();

        const abilityId = this._getItemId(event);
        const ability = this.actor.items.find(i => i.id === abilityId);
        if (ability.data.data.passive) return;
        if (this.selectedAbilities.includes(abilityId)) {
            this.selectedAbilities = this.selectedAbilities.filter(id => id !== abilityId);
        } else {
            this.selectedAbilities.push(abilityId);
        }

        this.render(true);
    }

    _onItemValueChange(event) {
        const itemId = this._getItemId(event);

        const item = this.actor.items.find(i => i.id === itemId);
        if (!item) {
            console.log(`Could not find item with id ${itemId}`);
            return;
        }

        let value = parseInt(event.currentTarget.value);
        value = (isNaN(value) || value == 0) ? 1 : value;

        this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "data.level.value": value }]);
    }

    _getItemId(event) {
        return event.currentTarget.closest('.item').dataset.itemId;
    }

    /** @override */
    getData() {
        const context = super.getData();
        context.config = CONFIG.OVA;
        context.actor = this.actor;
        context.data = this.actor.data;
        context.abilities = [];
        context.weaknesses = [];
        context.attacks = [];
        context.selectedAbilities = this.selectedAbilities;
        for (const item of this.actor.items) {
            const itemData = item.data;
            if (itemData.type === "attack") {
                context.attacks.push(itemData);
                continue;
            }
            if (itemData.data.rootId != '') continue;

            if (itemData.data.type === "ability") {
                context.abilities.push(itemData);
            } else if (itemData.data.type === "weakness") {
                context.weaknesses.push(itemData);
            }
        }

        context.abilities.sort((a, b) => a.name.localeCompare(b.name));
        context.weaknesses.sort((a, b) => a.name.localeCompare(b.name));

        return context;
    }
}