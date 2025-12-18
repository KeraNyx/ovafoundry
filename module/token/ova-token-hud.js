export default class OVATokenHUD extends TokenHUD {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "token-hud",
      template: "systems/ova/templates/token/token-hud.html"
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    html
      .querySelector('[data-action="trigger-effects"]')
      ?.addEventListener("click", this._triggerActiveEffects.bind(this));
  }

  _triggerActiveEffects(event) {
    event.preventDefault();

    const targets = canvas.tokens.controlled
      .map(t => t.actor)
      .filter(Boolean);

    for (const actor of targets) {
      actor.triggerOverTimeEffects?.();
    }
  }
}
