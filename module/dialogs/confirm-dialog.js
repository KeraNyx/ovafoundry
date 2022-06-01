export default class ConfirmDialog {
    static show({ title, description }) {
        return new Promise((resolve, reject) => {
            new Dialog({
                title: title,
                content: `<p>${description}</p>`,
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize("OVA.Prompt.Yes"),
                        callback: () => resolve()
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize("OVA.Prompt.No"),
                        callback: () => reject()
                    }
                },
                close: () => reject(),
                default: "no"
            }).render(true);
        });
    }
}