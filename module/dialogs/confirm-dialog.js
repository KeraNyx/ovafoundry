export default class ConfirmDialog {
    /**
     * Shows a simple confirmation dialog.
     * @param {Object} options
     * @param {string} options.title - Dialog title
     * @param {string} options.description - Dialog description
     * @returns {Promise<void>} Resolves on yes, rejects on no
     */
    static show({ title, description }) {
        return new Promise((resolve, reject) => {
            const dialog = new Dialog({
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
                default: "no",
                close: () => reject() // ensure rejection if dialog is closed without choice
            });
            dialog.render(true);
        });
    }
}
