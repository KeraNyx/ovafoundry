import OVAEffect from "./effects/ova-effect.js";
import Socket from "./sockets/socket.js";

export default class OVACharacter extends Actor {
    static async create(data, options) {
        const subtype = options?.subtype || "character";
        data.token = {
            actorLink: subtype === "character",
            disposition: subtype === "character" ? 1 : -1,
            vision: true,
            bar1: { attribute: "attributes.hp" },
            bar2: { attribute: "attributes.endurance" },
        }
        data.img = "icons/svg/mystery-man-black.svg";
        
        if (subtype === "npc") {
            data.flags = { "core": { "sheetClass": "ova.OVANPCSheet" } };
        }

        await super.create(data, options)
    }

    async createAttack() {
        const attackData = {
            name: game.i18n.localize("OVA.Attack.DefaultName"),
            type: "attack",
        };
        return this.createEmbeddedDocuments("Item", [attackData]);
    }

    async createSpell() {
        const spellData = {
            name: game.i18n.localize("OVA.Spell.DefaultName"),
            type: "spell",
        };
        return this.createEmbeddedDocuments("Item", [spellData]);
    }

    async _preUpdate(data, options, user) {
        const charData = this.data;

        let currentHP = data.data?.hp?.value || charData.hp.value;
        let currentEndurance = data.data?.endurance?.value || charData.endurance.value;

        if (data.data?.hp?.value < 0) {
            currentEndurance += data.data.hp.value;
            foundry.utils.setProperty(data, "data.endurance.value", currentEndurance)
            foundry.utils.setProperty(data, "data.hp.value", 0)
        };
        if (data.data?.endurance?.value < 0) {
            currentHP += data.data.endurance.value;
            foundry.utils.setProperty(data, "data.hp.value", currentHP);
            foundry.utils.setProperty(data, "data.endurance.value", 0);
        }
        if (data.data?.enduranceReserve?.value < 0) {
            foundry.utils.setProperty(data, "data.enduranceReserve.value", 0);
        }

        if (currentHP <= 0 && currentEndurance <= 0) {
            foundry.utils.setProperty(data, "data.hp.value", 0)
            foundry.utils.setProperty(data, "data.endurance.value", 0);
            // TODO: death hook
        }

        // show text notifications
        if (data.data?.hp?.value && data.data.hp.value != charData.hp.value) {
            this._showValueChangeText(data.data.hp.value - charData.hp.value);
        }

        if (data.data?.endurance?.value && data.data.endurance.value != charData.endurance.value) {
            this._showValueChangeText(data.data.endurance.value - charData.endurance.value, '#427ef5');
        }

        if (data.data?.enduranceReserve?.value && data.data.enduranceReserve.value != charData.enduranceReserve.value) {
            this._showValueChangeText(data.data.enduranceReserve.value - charData.enduranceReserve.value, '#427ef5');
        }
    }

    prepareData() {
        super.prepareData();

        const charData = this.data;

        charData.defenses.evasion += charData.speed;
        for (const defense in charData.defenses) {
            charData.defenses[defense] += (charData.globalDefMod + charData.globalMod);
            if (charData.defenses[defense] < 0) {
                charData.defenses[defense] = 0;
            }
        }
        if (charData.armor < 0) {
            charData.armor = 0;
        }
        charData.hasResistances = Object.keys(charData.resistances).length > 0;

        if (charData.data.hp.value > charData.hp.max) {
            charData.data.hp.value = charData.hp.max;
        }

        if (charData.data.endurance.value > charData.endurance.max) {
            charData.data.endurance.value = charData.endurance.max;
        }

        if (charData.data.enduranceReserve.value > charData.enduranceReserve.max) {
            charData.data.enduranceReserve.value = charData.enduranceReserve.max;
        }

        charData.tv = charData.data.tv > 0 ? charData.data.tv : this._calculateThreatValue();
    }

    prepareBaseData() {
        const charData = this.data;

        charData.globalMod = 2;
        charData.globalRollMod = 0;
        charData.globalDefMod = 0;
        charData.armor = 0;
        charData.resistances = {};
        charData.attacks = [];
        charData.speed = 0;

        // copy data from template
        charData.defenses = { ...charData.data.defenses };
        charData.hp = { ...charData.data.hp };
        charData.hpReserve = { max: charData.data.hpReserve?.max || 0 };
        charData.endurance = { ...charData.data.endurance };
        charData.enduranceReserve = { ...charData.data.enduranceReserve };
        charData.attack = { roll: 0, dx: 0 }; // for effect compability
        charData.data.attributes = {
            hp: charData.hp,
            endurance: charData.endurance,
            enduranceReserve: charData.enduranceReserve,
        }
        charData.dramaDice = { ...charData.data.dramaDice };
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        this.items.filter(i => i.data.type === "ability").forEach(item => item.prepareItemData());
        const charData = this.data;

        // apply active ability effects to data
        this.items.forEach(item => {
            if (item.type !== "ability") return;
            if (!item.data.data.active) return;

            // sort by priority and apply effects
            item.data.ovaEffects.sort((a, b) => a.data.priority - b.data.priority).forEach(e => e.apply(charData));
        });

        charData.hp.max += charData.hpReserve.max;

        // get magical abilities
        const magicAbilities = this.items.filter(item => item.data.type === 'ability' && item.data.data.magic);
        charData.magic = magicAbilities;
        charData.haveMagic = magicAbilities.length > 0;

        // save abilities that have affected defenses for future use
        if (!charData.changes) charData.changes = [];
        const defenseChanges = charData.changes.filter(change => change.key === "defenses.?" || change.key === "speed");
        charData.defenseAbilities = {};
        charData.defenseAbilities["evasion"] = {}; // for default defense     
        defenseChanges.forEach(change => {
            // TODO: do i really need speed as separate modiefier?
            const defense = change.key === "speed" || !change.keyValue ? "evasion" : change.keyValue;
            if (!charData.defenseAbilities[defense]) charData.defenseAbilities[defense] = {};
            charData.defenseAbilities[defense][change.source.data._id] = change.source.data;
        });

        if (charData.data.hp.value <= 0 || charData.data.endurance.value <= 0) {
            charData.globalMod -= 1;
            charData.changes.push({
                source: {
                    name: game.i18n.localize("OVA.Status.No" + charData.data.hp.value <= 0 ? "HP" : "Endurance"),
                    type: "status",
                }, key: "globalMod", mode: 2, value: -1
            })
        }

        this.items.filter(i => i.data.type !== "ability").forEach(item => item.prepareItemData());
    }

    /** 
     *  TV calculated this way: 
     *  1. Highets defence
     *  2. Highest Attack Roll and DX with end cost 0
     *  3. Levels of abilities affecting health and endurance
     */
    _calculateThreatValue() {
        let tv = 0;

        // highest defence
        const defenses = this.data.defenses;
        const highestDef = Object.keys(defenses).reduce((a, b) => defenses[a] > defenses[b] ? a : b);
        tv += defenses[highestDef];

        // highest attack roll and dx with end cost 0
        const attacks = this.items.filter(i => i.data.type === "attack");
        const freeAttacks = attacks.filter(a => a.data.enduranceCost == 0 && a.data.attack.dx >= 0);
        const highestAttack = freeAttacks.reduce((a, b) => a.data.attack.roll > b.data.attack.roll ? a : b, freeAttacks[0]);

        tv += 2 + 1;
        highestAttack?._getRollAbilities().forEach(a => {
            const sign = a.data.type === "ability" ? 1 : -1;
            tv += sign * a.data.data.level.value;
        });

        let healingThreat = 0;
        const healingAbility = attacks.find(a => a.data.attack.dx < 0);
        healingAbility?._getRollAbilities().forEach(a => {
            const sign = a.data.type === "ability" ? 1 : -1;
            healingThreat += sign * a.data.data.level.value;
        });
        tv += Math.ceil(healingThreat / 2);

        // levels of abilities affecting health and  (effect keys endurance.max and hp.max)
        const abilities = this.items.filter(i => i.data.type === "ability");
        abilities.forEach(a => {
            if (!a.data.data.active) return;
            for (const effect of a.data.data.effects) {
                if (effect.key === "endurance.max" || effect.key === "hp.max") {
                    const sign = a.data.data.type === "ability" ? 1 : -1;
                    tv += sign * a.data.data.level.value;
                    break;
                }
            }

            if (a.data.data.boss) {
                tv += a.data.data.level.value * 5;
            }

            if (a.data.data.magic) {
                tv += Math.ceil(a.data.data.level.value / 2);
            }
        });

        tv += this.data.armor;

        return tv;
    }

    giveFreeDramaDice() {
        this.update({ "data.dramaDice.free": this.data.data.dramaDice.free + 1 });
    }

    resetUsedDramaDice() {
        this.update({ "data.dramaDice.used": 0, "data.dramaDice.free": 0 });
    }

    async useDramaDice(amount) {
        // first use all free dice than add used
        const useFree = Math.min(this.data.dramaDice.free, amount);
        const addUsed = amount - useFree;
        this.update({ "data.dramaDice.free": this.data.data.dramaDice.free - useFree, "data.dramaDice.used": this.data.data.dramaDice.used + addUsed });
    }

    getRollData() {
        return this.data;
    }

    changeHP(amount) {
        if (amount === 0) return;
        let newHp = this.data.data.hp.value + amount;

        this.update({ "data.hp.value": newHp });
    }

    changeEndurance(amount, reserve = false) {
        if (amount === 0) return;

        if (reserve) {
            let newEndurance = this.data.data.enduranceReserve.value + amount;
            this.update({ "data.enduranceReserve.value": newEndurance });
        } else {
            let newEndurance = this.data.data.endurance.value + amount;
            this.update({ "data.endurance.value": newEndurance });
        }
    }

    _showValueChangeText(amount, stroke = 0x000000) {
        const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
        OVACharacter.showValueChangeText(tokens, amount, stroke);
        Socket.emit("tokensAttributeChange", { tokens: tokens.map(t => t.id), amount: amount, stroke: stroke });
    }

    static listenForValueChange() {
        Socket.on("tokensAttributeChange", data => {
            const tokens = data.tokens.map(id => canvas.tokens.get(id));
            OVACharacter.showValueChangeText(tokens, data.amount, data.stroke);
        });
    }

    static showValueChangeText(tokens, amount, stroke = 0x000000) {
        for (let t of tokens) {
            t?.hud.createScrollingText(amount.signedString(), {
                icon: "icons/svg/aura.svg",
                anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
                direction: amount > 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
                fill: amount > 0 ? "green" : "red",
                stroke: stroke,
                strokeThickness: 4,
                jitter: 0.25
            });
        }
    }

    async addAttackEffects(effects) {
        const oneTimeEffects = effects.filter(e => !!e.flags?.once);
        for (const e of oneTimeEffects) {
            const oneTimeEffect = e.flags["once"];
            OVAEffect.applyEffectChanges(oneTimeEffect, this.data)
        };

        const persistantEffect = effects.filter(e => !e.flags?.once);

        await this.update({ data: this.data.data });

        await this.createEmbeddedDocuments("ActiveEffect", persistantEffect);
    }

    async triggerOverTimeEffects() {
        const updates = [];
        for (let effect of this.data.effects) {
            if (effect.data.flags["each-round"]) {
                const overTimeEffect = effect.data.flags["each-round"];
                const newData = { data: foundry.utils.deepClone(this.data.data) };
                OVAEffect.applyEffectChanges(overTimeEffect, newData)

                await this.update(newData);
                updates.push({ _id: effect.id, "duration.rounds": effect.data.duration.rounds - 1 });
            }
        }

        await this.updateEmbeddedDocuments("ActiveEffect", updates);
        await this.clearExpiredEffects();
    }

    async clearExpiredEffects() {
        // == 0 to end effect on turn end, < 1 to end effect on turn start
        const expiredEffects = this.effects.filter(e => e.duration.remaining === 0);
        this.deleteEmbeddedDocuments("ActiveEffect", expiredEffects.map(e => e.id));
    }

    static async createDialog(data = {}, { parent = null, pack = null, ...options } = {}) {

        // Collect data
        const documentName = this.metadata.name;
        const types = ["character", "npc"];
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
                const subtype = data.type;
                data.type = 'character';
                return this.create(data, { parent, pack, renderSheet: true, subtype });
            },
            rejectClose: false,
            options: options
        });
    }
}