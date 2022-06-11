import RollPrompt from "../dialogs/roll-prompt.js";
import CombatMessage from "../chat/combat-message.js";
import AddActiveEffectPrompt from "../dialogs/add-active-effect-dialog.js";
import ConfirmDialog from "../dialogs/confirm-dialog.js";

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
            tabs: [{ navSelector: ".combat-tabs", contentSelector: ".combat-content" }],
            scrollY: [
                ".ability-card"
            ],
            classes: super.defaultOptions.classes.concat(['ova']),
        });
    }

    async _onDrop(event) {
        event.preventDefault();
        const abilityId = event.target.closest(".item")?.dataset.itemId;
        if (abilityId) {
            const ability = this.actor.items.find(i => i.id === abilityId);
            if (!ability) {
                console.log(`Could not find item with id ${abilityId}`);
                return;
            }
            const dropped = await ability.sheet._onDrop(event);
            if (dropped) return;
        }
        super._onDrop(event);
    }

    _onDragHighlight(event) {
        // event.preventDefault();
        // const abilityBlock = event.target.closest(".item");
        // if (!abilityBlock) return;
        // if (event.type === "dragleave") {
        //     abilityBlock.classList.remove("selected");
        //     return;
        // }
        // const abilityId = abilityBlock.dataset.itemId;
        // const ability = this.actor.items.find(i => i.id === abilityId);
        // if (!ability) {
        //     console.log(`Could not find item with id ${abilityId}`);
        //     return;
        // }
        // if (!ability.data.data.isRoot) return;
        // abilityBlock.classList.add("selected");
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
        html.find('.drama-dice').click(this._makeDramaRoll.bind(this));

        html.find('.attack-block').click(this._makeAttackRoll.bind(this));
        html.find('.defense-value').click(this._makeDefenseRoll.bind(this));

        html.find('.effect-delete').click(this._removeEffect.bind(this));
        html.find('.add-active-effect').click(this._addActiveEffect.bind(this));

        html.find('.endurance-max-value').on("focus", this._onEnduranceMaxFocus.bind(this));
        html.find('.hp-max-value').on("focus", this._onHPMaxFocus.bind(this));

        html.find('input[data-sname]').on("blur", this._onSilentInputChange.bind(this));
        html.find('.give-free-dd').click(this._giveFreeDramaDice.bind(this));
        html.find('.reset-used-dd').click(this._resetUsedDramaDice.bind(this));

        html.find('.reset-uses').click(this._resetAbilityUses.bind(this));
        html.find('.items').on("dragenter", this._onDragHighlight.bind(this)).on("dragleave", this._onDragHighlight.bind(this))
        html.find('input[data-dtype="Number"]').on("keypress", this._onFieldSubmit.bind(this));
        const inputs = html.find("input");
        inputs.focus(ev => ev.currentTarget.select());
        inputs.addBack().find('[data-dtype="Number"]').change(this._onChangeInputDelta.bind(this));
    }

    _resetAbilityUses(event) {
        event.preventDefault();
        event.stopPropagation();

        ConfirmDialog.show({
            title: game.i18n.localize("OVA.ResetAbilityUses.Title"),
            description: game.i18n.localize("OVA.ResetAbilityUses.Description")
        }).then(() => {
            const abilityId = this._getItemId(event);
            const ability = this.actor.items.find(i => i.id === abilityId);
            if (!ability) {
                console.log(`Could not find item with id ${abilityId}`);
                return;
            }

            ability.resetLimitedUse();
        })
    }

    _addActiveEffect(event) {
        event.preventDefault();

        const createDialog = new AddActiveEffectPrompt(this.actor);
        createDialog.render(true);
    }

    _giveFreeDramaDice(event) {
        event.preventDefault();
        ConfirmDialog.show({
            title: game.i18n.localize("OVA.GiveDramaDice.Title"),
            description: game.i18n.localize("OVA.GiveDramaDice.Description")
        }).then(() => {
            this.actor.giveFreeDramaDice();
        });
    }

    _resetUsedDramaDice(event) {
        event.preventDefault();
        ConfirmDialog.show({
            title: game.i18n.localize("OVA.ResetDramaDice.Title"),
            description: game.i18n.localize("OVA.ResetDramaDice.Description")
        }).then(() => {
            this.actor.resetUsedDramaDice();
        })
    }

    async _onSilentInputChange(event) {
        event.preventDefault();
        const field = event.currentTarget.dataset.sname;
        const type = event.currentTarget.dataset.dtype;
        let value = event.currentTarget.value;
        if (!value) return;
        if (type === "Number") {
            value = Number.parseInt(value);
        }

        await this.actor.update({ [field]: value });
        this.render(true);
    }

    _onEnduranceMaxFocus(event) {
        event.preventDefault();

        event.currentTarget.value = this.actor.data.data.endurance.max;
    }

    _onHPMaxFocus(event) {
        event.preventDefault();
        event.currentTarget.value = this.actor.data.data.hp.max;
    }

    _onFieldSubmit(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            this.actor.prepareData();
        }
    }

    async _addAttack(e) {
        e.preventDefault();
        if (this._tabs[0].active === "combat-stats") {
            const attack = await this.actor.createAttack();
            attack[0].sheet.render(true, { editable: true });
        } else {
            const spell = await this.actor.createSpell();
            spell[0].sheet.render(true, { editable: true });
        }
    }

    async _markAbilityUses(abilities) {
        abilities.forEach(ability => {
            const uses = ability.data.data.limitedUse.value;
            if (uses <= 0) return;
            ability.update({ "data.limitedUse.value": uses - 1 });
        })
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

        // removing max endurance and hp

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

    _getSelectedAbilities() {
        return this.actor.items.filter(i => this.selectedAbilities.includes(i.id));
    }

    _makeDefenseRoll(event) {
        event.preventDefault();
        const defense = event.currentTarget.dataset.deftype;

        const abilityIds = Object.values(this.actor.data.defenseAbilities[defense]).map(a => a._id);
        const abilities = this.actor.items.filter(i => abilityIds.includes(i.id));
        const enduranceCost = abilities.reduce((acc, cur) => acc + cur.data.enduranceCost, 0);

        const perks = abilities.reduce((acc, cur) => acc.concat(cur.data.perks), []);
        const dice = this.actor.data.defenses[defense];
        this._makeRoll({
            roll: dice,
            type: "defense",
            enduranceCost: enduranceCost,
            perks: perks,
            abilities: abilities,
            flavor: `Defense (${defense})`,
            callback: () => { this._useAbilities(abilities); },
        });
    }

    _makeAttackRoll(event) {
        event.preventDefault();
        const attackId = this._getItemId(event);

        const attack = this.actor.items.find(i => i.id === attackId);
        if (!attack) {
            console.log(`Could not find attack with id ${attackId}`);
            return;
        }

        let effects = [];
        let type;
        if (attack.type === "spell") {
            // find child ability using rootId
            const ability = this.actor.items.find(i => i.data.data.rootId === attack.id);

            type = "spell";
            effects = [{
                label: attack.name,
                changes: [
                    {
                        key: attack.data.data.effectName,
                        value: ability.data.data.effectLevel,
                    }
                ],
                flags: {
                    "create-item": this._packAbility(ability),
                }
            }];
        } else {
            type = "attack";
            effects = attack.data.activeEffects;
        }

        this._makeRoll({
            ...attack.data.attack,
            effects: effects,
            type: type,
            attack: attack,
            perks: attack.data.combinedPerks,
            abilities: attack.data.combinedAbilities,
            enduranceCost: attack.data.enduranceCost,
            callback: attack.use.bind(attack)
        });
    }

    _makeManualRoll(event) {
        event.preventDefault();

        const rollData = {
            globalMod: this.actor.data.globalMod,
        };
        const abilities = this._getSelectedAbilities();
        const effects = []
        let enduranceCost = 0;
        for (const ability of abilities) {
            const abilityData = ability.data;
            let sign = 1;
            if (abilityData.data.type === "weakness") sign = -1;
            if (abilityData.name.toLowerCase() in rollData) {
                rollData[abilityData.name.toLowerCase()] += sign * abilityData.data.level.value;
            } else {
                rollData[abilityData.name.toLowerCase()] = sign * abilityData.data.level.value;
            }
            effects.push(...abilityData.ovaEffects);
            enduranceCost += abilityData.data.enduranceCost;
        }
        if (enduranceCost < 0) enduranceCost = 0;

        // sum roll modifiers
        let diceTotal = Object.values(rollData).reduce((a, b) => a + b, 0);

        const perks = abilities.reduce((acc, cur) => acc.concat(cur.data.perks), []);

        this._makeRoll({
            roll: diceTotal,
            effects: [],
            perks: perks,            
            abilities: abilities,
            enduranceCost: enduranceCost,
            callback: () => { this._useAbilities(abilities) },
        });
    }

    _useAbilities(abilities) {
        abilities.forEach(a => a.use());
    }

    async _makeDramaRoll(event) {
        event.preventDefault();

        let enduranceCost = 5;
        if (this.actor.data.dramaDice.free > 0) {
            enduranceCost = 0;
        }

        this._makeRoll({ roll: 1, type: "drama", enduranceCost: enduranceCost, callback: this.actor.useDramaDice.bind(this.actor) });
    }

    async _makeRoll({ roll = 2, dn = 0, dx = 0, effects = [], enduranceCost = 0, ignoreArmor = 0, type = "manual", perks = [], abilities = [], attack = null, flavor = '', callback = null }) {
        const result = await new RollPrompt(flavor, type, this.actor, attack, enduranceCost, roll).show();
        if (result === false) return;

        // TODO: add changes to list of changes
        callback?.bind(this)(result.roll);
        this.selectedAbilities = [];
        this.render();

        const rollData = {
            roll: result.roll,
            dx: dx,
            result: result.dice.result,
            ignoreArmor: ignoreArmor,
            effects: effects,
            type: type,
            dn: dn,
        };

        CombatMessage.create({
            roll: result.dice,
            rollData: rollData,
            speaker: this.actor,
            attack: attack,
            perks: perks,
            abilities: abilities,
        });
    }

    _packAbility(ability) {
        // find child ability using rootId
        const rootAbility = ability.toObject();
        rootAbility.data.rootId = "";
        rootAbility.data.temporary = true;
        const children = this.actor.items.
            filter(i => i.data.data.rootId === ability.id).
            map(i => i.toObject());

        return [rootAbility, ...children];
    }

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


    async _selectAbility(event) {
        event.preventDefault();

        const abilityId = this._getItemId(event);
        const ability = this.actor.items.find(i => i.id === abilityId);
        if (ability.data.data.passive) return;
        if (this.selectedAbilities.includes(abilityId)) {
            this.selectedAbilities = this.selectedAbilities.filter(id => id !== abilityId);
        } else {
            this.selectedAbilities.push(abilityId);
        }

        await this.actor.prepareData();
        this.render(false);
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

    _prepareChanges(changes) {
        /*
        change = {
            source: {
                data: ItemData
            }
        }
        */

        const formattedChanges = [];
        for (const change of changes) {
            const source = change.source;
            const data = source.data;

            formattedChanges.push(data);
        }

        return formattedChanges;
    }

    /** @override */
    getData() {
        const context = super.getData();
        context.config = CONFIG.OVA;
        context.actor = this.actor;
        context.data = this.actor.data;

        // TODO: move to character object?
        context.abilities = [];
        context.weaknesses = [];
        context.attacks = [];
        context.spells = [];
        context.selectedAbilities = this.selectedAbilities;
        for (const item of this.actor.items) {
            const itemData = item.data;
            if (itemData.type === "attack") {
                context.attacks.push(itemData);
                continue;
            }
            if (itemData.type === "spell") {
                context.spells.push(itemData);
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