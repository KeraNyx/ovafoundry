let lastAttack = null;

export const listenToAttackRoll = function (message, html, data) {
    if (!message.isRoll) return;
    const rollData = data.message.flags["roll-data"];
    if (!rollData) return;

    // record the last attack roll
    if (rollData.type === "attack") {
        html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Attack"));

        lastAttack = message;
        return;
    }

    // || lastAttack.user.id === message.user.id
    if (rollData.type !== "attack" && !lastAttack) {
        html.find(".flavor-text").html(game.i18n.localize(`OVA.Roll.${rollData.type.capitalize()}`));
        return;
    }
    if (rollData.type !== "defense") {
        // replace flavor text
        html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Defense"));
    }
    const attackRollData = lastAttack.data.flags["roll-data"];

    // compare attack and defense rolls
    // if the attack roll is higher, show the attack roll
    const result = lastAttack.roll.result - message.roll.result;
    message.data.flags["attack-roll-data"] = attackRollData;

    let resultText = result > 0 ? "Hit" : "Miss";
    resultText = game.i18n.localize(`OVA.Attack.${resultText}`);
    const attackName = game.i18n.localize("OVA.Roll.Attack");
    html.
        find(".dice-total").
        append(`<br/> ${lastAttack.roll.result} (${attackName}) - ${message.roll.result} = ${result} <span style="color: ${result > 0 ? "green" : "red"}">(${resultText})</span>`);

    // enable apply damage button
    if (result > 0) {
        html.find("button[data-action='apply-damage']").removeClass("hidden");
    }

    return rollData;
}

export const chatListeners = function (message, html, data) {
    html.on("click", ".attack-buttons button", _onAttackButtonClick);
}

function _onAttackButtonClick(e) {
    e.preventDefault();

    // find message id
    const messageId = e.currentTarget.closest(".chat-message").dataset.messageId;
    const message = game.messages.get(messageId)

    const attackRoll = message.data.flags["attack-roll-data"];
    const defenseRoll = message.data.flags["roll-data"];
    let target = null;
    if (message.data.speaker.token) {
        const tokenId = message.data.speaker.token;
        target = game.scenes.active?.tokens.get(tokenId)?.actor;
    }
    if (!target) {
        const targetId = message.data.speaker.actor;
        target = game.actors.get(targetId);
    }

    const damage = _calculateDamage(target, attackRoll, defenseRoll);
    attackRoll.effects;

    target.changeHP(-damage);

    // const targets = canvas.tokens.controlled;
    // targets.forEach(t => {
    //     const targetActor = t.actor;
    //     const damage = _calculateDamage(targetActor, attackRoll, defenseRoll);
    //     attackRoll.effects;
    //     targetActor.changeHP(-damage);
    // })
}

function _calculateDamage(actor, attackRoll, defenseRoll) {
    const finalResult = attackRoll.result - defenseRoll.result;

    const armor = actor.data.armor || 0;
    const piercing = attackRoll.ignoreArmor || 0
    const effectiveArmor = Math.max(armor - piercing, 0);
    const damage = finalResult * (Math.max(attackRoll.dx - effectiveArmor, 0.5));

    return damage;
}