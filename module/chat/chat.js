import ApplyDamagePrompt from "../dialogs/apply-damage-prompt.js";
import OVACombatMessage from "./combat-message.js";

let lastAttack = null;
let lastRoll = null;

export const chatListeners = function (message, html, data) {
    html.on("click", "button[data-action='apply-damage']", _onApplyDamageClick);
    html.on("click", "button[data-action='take-damage']", _onTakeDamageClick);
    html.on("click", "button[data-action='apply-effect']", _onApplyEffectClick);
    html.on("click", "button[data-action='apply-heal']", _onApplyHealClick);
    html.on("click", ".msg-roll-info", _onMessageRollDataClick);
}

function _onMessageRollDataClick(e) {
    // IT'S JUST AN EXAMPLE
    e.preventDefault();

    // Toggle the message flag
    let roll = e.currentTarget;
    const message = game.messages.get(roll.closest(".message").dataset.messageId);
    message._abilitiesExpanded = !message._abilitiesExpanded;

    // Expand or collapse tooltips
    const abs = roll.parentNode.querySelector(".roll-abilities");
    if (message._abilitiesExpanded) $(abs).slideDown(200);
    else $(abs).slideUp(200);
}

export const listenToCommands = function (chat, content, message) {
    let regExp;
    regExp = /(\S+)/g;
    let commands = content.match(regExp);

    if (!['/d', '/defense', '/a', '/attack'].includes(commands[0])) {
        return true;
    }

    let type = "manual";
    let dx = commands[2] || 1;
    let roll = commands[1] || 2;

    let negative = false;
    if (roll <= 0) {
        negative = true;
        roll = 2 - roll;
    }
    
    let dice;
    if (negative) {
        dice = new Roll(`${roll}d6kl`);
    } else {
        dice = new Roll(`${roll}d6khs`);
    }
    dice.evaluate({ async: false })

    switch (commands[0]) {
        case '/d':
        case '/defense':
            type = "defense";
            break;

        case '/a':
        case '/attack':
            type = "attack";
            break;
    }

    const rollData = {
        roll: roll,
        dx: dx,
        result: dice.result,
        ignoreArmor: 0,
        effects: [],
        type: type,
        dn: 0,
    };

    OVACombatMessage.create({
        roll: dice,
        rollData: rollData,
        // speaker: this.actor,
        // attack: attack,
        perks: [],
        abilities: [],
    });

    return false;
}

export const listenToCombatRolls = async function (message, html, data) {
    _checkClear();

    if (!message.isRoll) return;
    const rollData = data.message.flags["roll-data"];
    if (!rollData) return;
    await _updateCombatData(message, html, data);

    if (rollData.type === "drama") _onDramaRoll(message, html, data);
    if (rollData.type !== "drama") lastRoll = message;
    if (rollData.type === "attack") _onAttackRoll(message, html, data);
    if (rollData.type === "manual" && lastAttack) rollData.type = "defense";
    if (rollData.type === "defense") _onDefenseRoll(message, html, data);
    if (rollData.type === "spell") _onSpellRoll(message, html, data);
}

function _checkClear() {
    if (game.messages.length === 0) {
        lastAttack = null;
        lastRoll = null;
    }
}

async function _updateCombatData(message, html, data) {
    if (game.combat && !message.getFlag("ova", "combat-data")) {
        await message.setFlag("ova", "combat-data", {
            turn: game.combat.turn,
            round: game.combat.round,
            combatId: game.combat.id,
        });
    }

    if (!lastRoll) return;
    const c1 = lastRoll.getFlag("ova", "combat-data");
    const c2 = message.getFlag("ova", "combat-data");
    if (c1.round !== c2.round || c1.turn !== c2.turn || c1.combatId !== c2.combatId) {
        lastAttack = null;
    }
}

async function _onDramaRoll(message, html, data) {
    if (!lastRoll || !lastRoll.isOwner || !lastRoll.data.flags["roll-data"]) return;

    ui.chat.updateMessage(await OVACombatMessage.addDramaDice(lastRoll, message));
    if (message.data.flags["miracle"]) lastRoll.data.flags["roll-data"].miracle = true;
}

function _onAttackRoll(message, html, data) {
    if (message.data.flags["roll-data"].dx >= 0) {
        if (lastAttack && _getMessageAuthorActor(lastAttack.message).id !== _getMessageAuthorActor(message).id) {
            return _onCounterRoll(message, html, data);
        }

        html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Attack"));
        lastAttack = {
            message: message,
            html: html,
        }
    } else {
        html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Heal"));
        html.find("button[data-action='apply-heal']").removeClass("hidden");
    }
}

function _onCounterRoll(message, html, data) {
    html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Counter"));

    const attackRollData = lastAttack.message.data.flags["roll-data"];
    const counterRollData = message.data.flags["roll-data"];

    let counterResult = lastAttack.message.roll.result - message.roll.result;
    if (attackRollData.miracle) counterResult = Math.max(1, counterResult);
    if (counterRollData.miracle) counterResult = Math.min(-1, counterResult);
    if (attackRollData.miracle && counterRollData.miracle) counterResult = 0;

    message.data.flags["attack-roll-data"] = attackRollData;
    message.data.flags["attack-message-id"] = lastAttack.message.id;

    let resultText = '';
    let dx = 0;
    let result = 0;
    if (counterResult > 0) {
        resultText = "Failure";
        html.find("button[data-action='take-damage']").removeClass("hidden");
        dx = attackRollData.dx;
        result = attackRollData.result
        message.data.flags["roll-data"].resultOverride = 0;
    } else if (counterResult < 0) {
        resultText = "Success";
        html.find("button[data-action='apply-damage']").removeClass("hidden");
        dx = counterRollData.dx;
        result = counterRollData.result;
        message.data.flags["attack-roll-data"].resultOverride = 0;
    } else {
        resultText = "Tie";
    }

    resultText = game.i18n.localize(`OVA.Attack.${resultText}`);
    const attackName = game.i18n.localize("OVA.Roll.Attack");
    const rawDamageText = game.i18n.localize("OVA.Roll.RawDamage");
    const rawDamage = Math.max(result * dx, 0);
    html.
        find(".roll-result-math").
        append(`<div class="roll-math"> ${lastAttack.message.roll.result} (${attackName}) - ${message.roll.result} = ${counterResult}`).
        append(`<h3 class="center">${rawDamageText}: ${rawDamage} <span style="color: ${counterResult < 0 ? "green" : "red"}">(${resultText})</span></h3>`);
}

function _onDefenseRoll(message, html, data) {
    html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Defense"));
    if (!lastAttack) return;
    const attackRollData = lastAttack.message.data.flags["roll-data"];
    const defenseRollData = message.data.flags["roll-data"];

    let result = lastAttack.message.roll.result - message.roll.result;

    // miracle calculation first for attacker the defender 
    if (attackRollData.miracle) result = Math.max(1, result);
    if (defenseRollData.miracle) result = Math.min(-1, result);
    if (attackRollData.miracle && defenseRollData.miracle) result = 0;

    let resultText = '';
    if (result > 0) {
        resultText = "Hit";
    } else if (result < 0) {
        resultText = "Miss";
    } else {
        resultText = "Tie";
    }
    message.data.flags["attack-roll-data"] = attackRollData;

    resultText = game.i18n.localize(`OVA.Attack.${resultText}`);
    const attackName = game.i18n.localize("OVA.Roll.Attack");
    const rawDamageText = game.i18n.localize("OVA.Roll.RawDamage");
    const rawDamage = Math.max(result * attackRollData.dx, 0);
    html.
        find(".roll-result-math").
        append(`<div class="roll-math"> ${lastAttack.message.roll.result} (${attackName}) - ${message.roll.result} = ${result}`).
        append(`<h3 class="center">${rawDamageText}: ${rawDamage} <span style="color: ${result > 0 ? "green" : "red"}">(${resultText})</span></h3>`);
    // enable apply damage button
    if (result > 0) {
        html.find("button[data-action='take-damage']").removeClass("hidden");
    }
}

function _onSpellRoll(message, html, data) {
    html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Spell"));

    const spellRoll = message.data.flags["roll-data"];
    let result = spellRoll.result - spellRoll.dn;
    if (spellRoll.miracle) result = Math.max(1, result);

    if (spellRoll.dn > 0) {
        let resultText = result >= 0 ? "Success" : "Failure";
        resultText = game.i18n.localize(`OVA.Attack.${resultText}`);
        const attackName = game.i18n.localize("OVA.DN.Short");
        html.
            find(".dice-total").
            append(`<br/><span style="color: ${result >= 0 ? "green" : "red"}">${resultText}</span> (${attackName} ${spellRoll.dn})`);
    }
    if (result >= 0) {
        const attackObj = message.data.flags["attack"];
        const attack = _getMessageAuthorActor(message).items.find(i => i.id === attackObj._id);
        attack?.update({ "data.active": true });
        html.find("button[data-action='apply-effect']").removeClass("hidden");
    }
}

function _onManualRoll(message, html, data) {
    html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Manual"));
    html.find("button[data-action='apply-effect']").removeClass("hidden");
}


async function _onApplyEffectClick(e) {
    const messageId = e.currentTarget.closest(".chat-message").dataset.messageId;
    const message = game.messages.get(messageId)

    const spellRoll = message.data.flags["roll-data"];

    const targets = canvas.tokens.controlled;
    targets.forEach(t => {
        const targetActor = t.actor;

        targetActor.addAttackEffects(spellRoll.effects);
    })
}

async function _onApplyHealClick(e) {
    const messageId = e.currentTarget.closest(".chat-message").dataset.messageId;
    const message = game.messages.get(messageId)

    const spellRoll = message.data.flags["roll-data"];

    const targets = canvas.tokens.controlled.map(t => t.actor);
    const attacker = _getMessageAuthorActor(message);

    const promptData = {
        effects: {
            self: spellRoll.effects.filter(e => e.target === "self"),
            target: spellRoll.effects.filter(e => e.target === "target"),
        },
        rollData: { attack: spellRoll },
        targets: targets,
        attacker: attacker,
    };

    if (targets.length === 0) return;
    const prompt = new ApplyDamagePrompt({ ...promptData, data: {} });
    prompt.render(true);
}

async function _onTakeDamageClick(e) {
    e.preventDefault();

    // find message id
    const messageId = e.currentTarget.closest(".chat-message").dataset.messageId;
    const message = game.messages.get(messageId)

    const target = _getMessageAuthorActor(message);
    let targets = target ? [target] : canvas.tokens.controlled.map(t => t.actor);

    if (!targets.length) {
        return ui.notifications.warn(game.i18n.format("OVA.ErrorNoActorSelecter"));
    }

    const attackRoll = message.data.flags["attack-roll-data"];
    const defenseRoll = message.data.flags["roll-data"];

    const rollData = {
        attack: {
            roll: attackRoll.roll,
            dx: attackRoll.dx,
            result: attackRoll.result,
            ignoreArmor: attackRoll.ignoreArmor,
            fatiguing: attackRoll.fatiguing,
            affinity: attackRoll.affinity,
        },
        defense: {
            roll: defenseRoll.roll,
            result: defenseRoll.resultOverride ? defenseRoll.resultOverride : defenseRoll.result,
        }
    }

    const attacker = _getMessageAuthorActor(lastAttack.message);

    const promptData = {
        effects: {
            self: attackRoll.effects.filter(e => e.target === "self"),
            target: attackRoll.effects.filter(e => e.target === "target"),
        },
        rollData: rollData,
        targets: targets,
        attacker: attacker,
    };

    const prompt = new ApplyDamagePrompt({ ...promptData, data: {} });
    prompt.render(true);
}

async function _onApplyDamageClick(e) {
    e.preventDefault();

    // find message id
    const currentMessage = e.currentTarget.closest(".chat-message").dataset.messageId;
    const message = game.messages.get(currentMessage);
    const attackMessageId = message.data.flags["attack-message-id"];
    const attackMessage = game.messages.get(attackMessageId);

    const target = _getMessageAuthorActor(attackMessage);

    // only used for counter rolls so we can hardcode it.
    const attackRoll = message.data.flags["attack-roll-data"];
    const counterRoll = message.data.flags["roll-data"];

    const rollData = {
        attack: {
            roll: counterRoll.roll,
            dx: counterRoll.dx,
            result: counterRoll.result,
            ignoreArmor: counterRoll.ignoreArmor,
            fatiguing: counterRoll.fatiguing,
            affinity: counterRoll.affinity,
        },
        defense: {
            roll: attackRoll.roll,
            result: attackRoll.resultOverride !== null ? attackRoll.resultOverride : attackRoll.result, // counter always against zero
        }
    }

    const attacker = _getMessageAuthorActor(message);

    const promptData = {
        effects: {
            self: counterRoll.effects.filter(e => e.target === "self"),
            target: counterRoll.effects.filter(e => e.target === "target"),
        },
        rollData: rollData,
        targets: [target],
        attacker: attacker,
    };

    const prompt = new ApplyDamagePrompt({ ...promptData, data: {} });
    prompt.render(true);
}

function _getMessageAuthorActor(message) {
    let author = null;
    if (message.data.speaker.token) {
        const authorId = message.data.speaker.token;
        author = game.scenes.active?.tokens.get(authorId)?.actor;
    }
    if (!author) {
        const authorId = message.data.speaker.actor;
        author = game.actors.get(authorId);
    }

    return author;
}

