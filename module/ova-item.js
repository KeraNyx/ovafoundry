import OVAEffect from './effects/ova-effect.js';

export default class OVAItem extends Item {
    /** @Param []Item */
    async addPerks(perks) {
        const currentPerks = this.data.perks || [];
        // increase level by one or add there is no perk with the same name
        const newPerkData = [];
        const updatedPerkData = [];
        perks.forEach(p => {
            const index = currentPerks.findIndex(pk => pk.name === p.name);
            if (index === -1) {
                newPerkData.push(p);
            } else {
                updatedPerkData.push({
                    _id: currentPerks[index]._id,
                    "data.level.value": currentPerks[index].data.level.value + 1
                });
            }
        });
        currentPerks.sort((a, b) => a.name.localeCompare(b.name));

        const newPerks = newPerkData.length ? await this.actor.createEmbeddedDocuments("Item", newPerkData) : [];
        await this.actor.updateEmbeddedDocuments("Item", updatedPerkData);

        this.data.data.perks.push(...newPerks.map(p => p.id));
        await this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": this.data.data.perks }]);
    }

    // removing single perk with specified id
    async removePerk(perkId) {
        const currentPerks = this.data.perks || [];

        // reduce level by one or remove if level is 1
        const index = currentPerks.findIndex(p => p._id === perkId);
        if (currentPerks[index].data.level.value > 1) {
            await this.actor.updateEmbeddedDocuments("Item", [{
                _id: currentPerks[index]._id,
                "data.level.value": currentPerks[index].data.level.value - 1
            }]);
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": this.data.data.perks }]);
        } else {
            // remove perk at index
            await this.actor.deleteEmbeddedDocuments("Item", [perkId]);
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": this.data.data.perks.filter(p => p !== perkId) }]);
        }
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    /** @override */
    prepareItemData() {
        if (!this.isEmbedded) return;

        this._preparePerks();
        if (this.type === 'ability') this._prepareAbilittyData();
        if (this.type === 'attack') this._prepareAttackData();
        if (this.type === 'spell') this._prepareSpellData();
    }

    static SPELL_COST = [
// Spell  1   2   3   4   5   // Magic
        [20, 30, 40, 50, 60], // 1
        [10, 20, 30, 40, 50], // 2
        [ 5, 10, 20, 30, 40], // 3
        [ 2,  5, 10, 20, 30], // 4
        [ 0,  2,  5, 10, 20], // 5
    ]

    _preparePerks() {
        const itemData = this.data;
        if (!itemData.data.perks) return;

        const actorData = this.actor.data;
        const perks = actorData.items.filter(i => i.type === 'perk' && itemData.data.perks.includes(i.id)).map(i => i.data);

        perks.sort((a, b) => a.name.localeCompare(b.name));
        itemData.perks = perks;

        itemData.ovaEffects = [];
        itemData.combinedPerks = [];
        let enduranceCost = itemData.data.enduranceCost || 0;
        // calculalte endurance cost from perks
        if (itemData.perks) {
            itemData.perks.forEach(p => {
                itemData.combinedPerks.push(p);
                enduranceCost += p.data.level.value * p.data.enduranceCost;
                p.data.effects.forEach(e => itemData.ovaEffects.push(new OVAEffect(p, e)));
            });
        }
        if (enduranceCost < 0) enduranceCost = 0;
        itemData.enduranceCost = enduranceCost;
        if (itemData.data.limitedUse && itemData.data.limitedUse.max > 0) {
            itemData.limitedUse = itemData.data.limitedUse;
        }
        // prepare effect data 
        if (this.type === 'perk' || this.type === 'ability') {
            itemData.data.effects.forEach(e => {
                itemData.ovaEffects.push(new OVAEffect(itemData, e));
            });
        }
    }

    _getRollAbilities() {
        const itemData = this.data;

        // fill selected abilities from actor
        const selectedAbilities = itemData.data.abilities.
            map(a => this.actor.getEmbeddedDocument("Item", a)).
            filter(a => a != undefined && a.data.data.active);

        // add abilities selected on sheet abilities
        if (this.actor.sheet) {
            const additionalAbilities = this.actor.sheet._getSelectedAbilities();
            selectedAbilities.push(...additionalAbilities.filter(a => !itemData.data.abilities.includes(a.id)));
        }

        return selectedAbilities;
    }

    _prepareSpellData() {
        const spellData = this.data;
        const data = spellData.data;
        const spellEffects = this.actor.items.map(i => i.data).filter(i => i.data.rootId === this.id);
        data.spellEffects = spellEffects;

        // find magic in selected abilities
        // get selected abilities from actor
        const selectedAbilities = this._getRollAbilities();
        const magicAbility = selectedAbilities.find(i => i.data.data.magic)
        spellData._linkedAbilities = selectedAbilities;

        let spellDN = 0;
        spellData.enduranceCost = 0;

        if (magicAbility) {
            data.magicName = magicAbility.name;
            data.magicLevel = magicAbility.data.data.level.value;
            // sum effect levels
            data.effectName = spellEffects[0]?.name;
            data.effectLevel = spellEffects.reduce((sum, e) => sum + e.data.level.value, 0);
            spellData.enduranceCost = data.effectLevel ? OVAItem.SPELL_COST[data.magicLevel - 1][data.effectLevel - 1] : 0;

            if (data.effectLevel > data.magicLevel) {
                spellDN = 2 + 2 * data.effectLevel;
            }
        }
        spellData.attack = {
            roll: this.actor.data.globalMod,
            dn: spellDN,
        }

        spellData.combinedAbilities = [];
        magicAbility && spellData.combinedAbilities.push(magicAbility);
        spellData.combinedAbilities.push(selectedAbilities);

        spellData.attack.roll += selectedAbilities.reduce((sum, a) => sum + (a.data.data.type == "ability" ? a.data.data.level.value : -a.data.data.level.value), 0);
        spellData.enduranceCost += selectedAbilities.reduce((sum, a) => sum + a.data.enduranceCost, 0);

        this.sheet == null || this.sheet.render(false);
    }

    _prepareAttackData() {
        const itemData = this.data;

        // get selected abilities from actor
        const selectedAbilities = this._getRollAbilities();

        // transfer effects from selected abilities to attack
        selectedAbilities.forEach(a => a.data.ovaEffects.forEach(e => itemData.ovaEffects.push(e)));

        // add cost of selected abilities
        itemData.enduranceCost += selectedAbilities.reduce((sum, a) => sum + a.data.enduranceCost, 0);
        itemData._linkedAbilities = selectedAbilities;

        // base roll values
        const attackData = {
            attack: {
                roll: this.actor.data.globalMod + this.actor.data.globalRollMod,
                dx: 1,
                ignoreArmor: 0
            },
            defense: {}
        };

        itemData.combinedAbilities = selectedAbilities;
        // apply effects to attack data
        itemData.ovaEffects.sort((a, b) => a.data.priority - b.data.priority).forEach(e => e.apply(attackData));
        Object.assign(itemData, attackData);
    }

    resetLimitedUse() {
        this.update({ "data.limitedUse.value": this.data.data.limitedUse.max });
    }

    get hasUses() {
        return this.data.data.limitedUse.max <= 0 || this.data.data.limitedUse.value > 0;
    }

    async use() {
        if (this.data.limitedUse) {
            if (this.data.limitedUse.value <= 0) {
                return;
            }
            this.update({ "data.limitedUse.value": this.data.limitedUse.value - 1 });

        }
        this.data._linkedAbilities?.forEach(a => a.use());
    }

    _prepareAbilittyData() {
        const itemData = this.data;
        const data = itemData.data;
        data.level.mod = 0;
        data.isEmbedded = this.isEmbedded;

        if (data.isRoot) {
            // add child abilities
            const abilities = this.actor.items.filter(i => i.data.data.rootId === this.id);
            itemData._linkedAbilities = abilities;
            data.abilities = abilities.map(i => i.data);
            data.abilities.sort((a, b) => {
                // sort by type and name
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type.localeCompare(b.type);
            });

        }
        //  else if (itemData.rootId == '') {
        //     // add abilities with the same name
        //     const modifierRoots = this.actor.items.filter(i => i.data.data.isRoot && i.data.data.rootType == 'modifier' && i.data.data.active).map(i => i.id);
        //     // find abilities with modifier roots
        //     const abilities = this.actor.items.filter(i => i.data.name === this.name && modifierRoots.includes(i.data.data.rootId));
        //     itemData.level.mod = abilities.reduce((sum, a) => sum + a.data.data.level.value, 0);
        // }
        data.level.total = data.level.value + data.level.mod;
        this.sheet == null || this.sheet.render(false);
    }

    async _onDelete() {
        super._onDelete();
        if (this.data.data.perks) {
            await this.actor?.deleteEmbeddedDocuments("Item", this.data.data.perks)
        }
        if (this.data.data.isRoot) {
            const abilities = this.actor.items.filter(i => i.data.data.rootId === this.id).map(i => i.id);
            await this.actor?.deleteEmbeddedDocuments("Item", abilities)
        }
    }

    static async createDialog(data = {}, { parent = null, pack = null, ...options } = {}) {

        // Collect data
        const documentName = this.metadata.name;
        const types = ["ability", "perk"];
        const folders = parent ? [] : game.folders.filter(f => (f.data.type === documentName) && f.displayed);
        const label = game.i18n.localize(this.metadata.label);
        const title = game.i18n.format("DOCUMENT.Create", { type: label });

        // Render the document creation form
        const html = await renderTemplate(`templates/sidebar/document-create.html`, {
            name: data.name || game.i18n.format("DOCUMENT.New", { type: label }),
            folder: data.folder,
            folders: folders,
            hasFolders: folders.length >= 1,
            type: data.type || types[0],
            types: types.reduce((obj, t) => {
                const label = CONFIG[documentName]?.typeLabels?.[t] ?? t;
                obj[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
                return obj;
            }, {}),
            hasTypes: types.length > 1
        });

        // Render the confirmation dialog window
        return Dialog.prompt({
            title: title,
            content: html,
            label: title,
            callback: html => {
                const form = html[0].querySelector("form");
                const fd = new FormDataExtended(form);
                foundry.utils.mergeObject(data, fd.toObject(), { inplace: true });
                if (!data.folder) delete data["folder"];
                if (types.length === 1) data.type = types[0];
                return this.create(data, { parent, pack, renderSheet: true });
            },
            rejectClose: false,
            options: options
        });
    }
}