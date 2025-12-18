export default class OVATokenHUD extends foundry.applications.hud.TokenHUD {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "token-hud",
            template: "systems/ova/templates/token/token-hud.html"
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('[data-action="trigger-effects"]').click(this._triggerActiveEffects.bind(this));
    }

    _triggerActiveEffects(event) {
        event.preventDefault();
        const targets = canvas.tokens.controlled.map(t => t.actor);
        targets.forEach(t => t.triggerOverTimeEffects());
    }
}