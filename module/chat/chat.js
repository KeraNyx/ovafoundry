let lastAttack = null;
let lastAttackHtml = null;
export const listenToAttackRoll = function (message, html, data) {
    if (!message.isRoll) return;
    const rollData = data.message.flags["roll-data"];
    if (!rollData) return;

    // record the last attack roll
    if (rollData.type === "attack") {
        html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Attack"));

        lastAttack = message;
        lastAttackHtml = html;
        return;
    }

    // || lastAttack.user.id === message.user.id
    if (rollData.type !== "attack" && !lastAttack) {
        html.find(".flavor-text").html(game.i18n.localize(`OVA.Roll.${rollData.type.capitalize()}`));
        return;
    }
    // replace flavor text
    html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Defense"));
    const attackRollData = lastAttack.data.flags["roll-data"];

    // compare attack and defense rolls
    // if the attack roll is higher, show the attack roll
    const result = lastAttack.roll.result - message.roll.result;
    lastAttack.data.flags["def-roll-data"] = rollData;

    let resultText = result > 0 ? "Hit" : "Miss";
    resultText = game.i18n.localize(`OVA.Attack.${resultText}`);
    lastAttackHtml.
        find(".dice-total").
        append(` - ${message.roll.result} = ${result} <span style="color: ${result > 0 ? "green" : "red"}">(${resultText})</span>`);

    // enable apply damage button
    if (result > 0) {
        lastAttackHtml.find("button[data-action='apply-damage']").removeClass("hidden");
    }
    lastAttack = null;
    lastAttackHtml = null;

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

    const attackRoll = message.data.flags["roll-data"];
    const defenseRoll = message.data.flags["def-roll-data"];

    const finalRoll = attackRoll.result - defenseRoll.result;

    const targets = canvas.tokens.controlled;
    targets.forEach(t => {
        const actor = t.actor;

        actor.applyDamage({ roll: finalRoll, dx: attackRoll.dx, ignoreArmor: attackRoll.ignoreArmor });
    })
}