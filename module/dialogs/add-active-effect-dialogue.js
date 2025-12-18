import OVAEffect from "../effects/ova-effect.js";

export default class AddActiveEffectPrompt extends Application {
  constructor(actor) {
    super({});

    this.actor = actor;
    this.effect = OVAEffect.defaultObject();
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ova", "dialog"],
      template: "systems/ova/templates/dialogs/add-active-effect-dialog.html",
      width: 500,
      height: "auto",
      title: game.i18n.localize('OVA.AddActiveEffect'),
      resizable: true,
      close: () => {}
    });
  }

  /** @override */
  activateListeners(html) {
    html.querySelectorAll('.effect-key-select').forEach(el => {
      el.addEventListener('change', ev => {
        const valueContainer = html.querySelector('.effect-key-value');
        if (ev.currentTarget.value.includes("?")) valueContainer.classList.remove('hidden');
        else valueContainer.classList.add('hidden');
      });
    });
    super.activateListeners(html);
  }

  /** @override */
  getData() {
    const data = super.getData();
    data.config = CONFIG.OVA;
    data.effect = this.effect;
    return data;
  }

  /** @override */
  async _updateObject(event, formData) {
    event.preventDefault();
    const effectData = {
      active: true,
      source: {
        name: formData['name'],
        data: {},
        level: 0,
      },
      overTime: {
        when: "each-round",
      }
    };

    // Map additional fields from formData
    for (const key in formData) {
      foundry.utils.setProperty(effectData, key, formData[key]);
    }

    const activeEffect = OVAEffect.createActiveEffect(effectData, this.actor.system);
    await this.actor.addAttackEffects([activeEffect]);
  }
}
