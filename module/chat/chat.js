import ApplyDamagePrompt from "../dialogs/apply-damage-prompt.js";
import OVACombatMessage from "./combat-message.js";

let lastAttack = null;
let lastRoll = null;

export const chatListeners = function (message, html, data) {
    html.on("click", "button[data-action='apply-damage']", _onApplyDamageClick);
    html.on("click", "button[data-action='apply-effect']", _onApplyEffectClick);
    html.on("click", "button[data-action='apply-heal']", _onApplyHealClick);
    html.on("click", ".msg-roll-data", _onMessageRollDataClick);
}

function _onMessageRollDataClick(e) {
    // IT'S JUST AN EXAMPLE
    // e.preventDefault();

    // // Toggle the message flag
    // let roll = event.currentTarget;
    // const message = game.messages.get(roll.closest(".message").dataset.messageId);
    // message._rollExpanded = !message._rollExpanded;

    // // Expand or collapse tooltips
    // const tooltips = roll.querySelectorAll(".dice-tooltip");
    // for ( let tip of tooltips ) {
    //   if ( message._rollExpanded ) $(tip).slideDown(200);
    //   else $(tip).slideUp(200);
    //   tip.classList.toggle("expanded", message._rollExpanded);
    // }
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
    if (!message.getFlag("ova", "combat-data")) {
        await message.setFlag("ova", "combat-data", {
            turn: game.combat.turn,
            round: game.combat.round,
        });
    }

    if (!lastRoll) return;
    const c1 = lastRoll.getFlag("ova", "combat-data");
    const c2 = message.getFlag("ova", "combat-data");
    if (c1.round !== c2.round || c1.turn !== c2.turn) {
        lastAttack = null;
    }
}

async function _onDramaRoll(message, html, data) {
    if (!lastRoll || !lastRoll.isOwner || !lastRoll.data.flags["roll-data"]) return;

    ui.chat.updateMessage(await OVACombatMessage.addDramaDice(lastRoll, message));
    if (message.data.flags["miracle"]) lastRoll.data.flags["roll-data"].miracle = true;
}

function _onAttackRoll(message, html, data) {
    if (lastAttack && _getMessageAuthor(lastAttack.message).id !== _getMessageAuthor(message).id) {
        return _onCounterRoll(message, html, data);
    }
    html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Attack"));
    if (message.data.flags["roll-data"].dx >= 0) {
        lastAttack = {
            message: message,
            html: html,
        }
    } else {
        html.find("button[data-action='apply-heal']").removeClass("hidden");
    }
}

function _onCounterRoll(message, html, data) {
    html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Counter"));

    const attackRollData = lastAttack.message.data.flags["roll-data"];
    const counterRollData = message.data.flags["roll-data"];

    let result = lastAttack.message.roll.result - message.roll.result;
    if (attackRollData.miracle) result = Math.max(1, result);
    if (counterRollData.miracle) result = Math.min(-1, result);
    if (attackRollData.miracle && counterRollData.miracle) result = 0;

    if (result > 0) {
        html.find("button[data-action='apply-damage']").removeClass("hidden");
        message.data.flags["attack-roll-data"] = attackRollData;
    } else if (result < 0) {
        lastAttack.html.find("button[data-action='apply-damage']").removeClass("hidden");
        lastAttack.message.data.flags["attack-roll-data"] = counterRollData;
    }
}

function _onDefenseRoll(message, html, data) {
    html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Defense"));
    if (!lastAttack) return;
    const attackRollData = lastAttack.message.data.flags["roll-data"];
    const defenseRollData = message.data.flags["roll-data"];

    let result = lastAttack.message.roll.result - message.roll.result;
    message.data.flags["attack-roll-data"] = attackRollData;
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
    resultText = game.i18n.localize(`OVA.Attack.${resultText}`);
    const attackName = game.i18n.localize("OVA.Roll.Attack");
    html.
        find(".dice-total").
        append(`<br/> ${lastAttack.message.roll.result} (${attackName}) - ${message.roll.result} = ${result} <span style="color: ${result > 0 ? "green" : "red"}">(${resultText})</span>`);

    // enable apply damage button
    if (result > 0) {
        html.find("button[data-action='apply-damage']").removeClass("hidden");
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
        const attack = _getMessageAuthor(message).items.find(i => i.id === attackObj._id);
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
    const attacker = _getMessageAuthor(lastAttack.message);

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

async function _onApplyDamageClick(e) {
    e.preventDefault();

    // find message id
    const messageId = e.currentTarget.closest(".chat-message").dataset.messageId;
    const message = game.messages.get(messageId)

    const target = _getMessageAuthor(message);

    const attackRoll = message.data.flags["attack-roll-data"];
    const defenseRoll = message.data.flags["roll-data"];

    const rollData = {
        attack: {
            roll: attackRoll.roll,
            dx: attackRoll.dx,
            result: attackRoll.result,
            ignoreArmor: attackRoll.ignoreArmor,
            fatiguing: attackRoll.fatiguing,
        },
        defense: {
            roll: defenseRoll.roll,
            result: defenseRoll.result,
        }
    }

    const attacker = _getMessageAuthor(lastAttack.message);

    const promptData = {
        effects: {
            self: attackRoll.effects.filter(e => e.target === "self"),
            target: attackRoll.effects.filter(e => e.target === "target"),
        },
        rollData: rollData,
        targets: [target],
        attacker: attacker,
    };

    const prompt = new ApplyDamagePrompt({ ...promptData, data: {} });
    prompt.render(true);
}

function _getMessageAuthor(message) {
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

