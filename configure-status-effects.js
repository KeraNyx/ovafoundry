export default function configureStatusEffects() {
    return [
        {
            id: "dead",
            label: "EFFECT.StatusDead",
            icon: "icons/svg/skull.svg"
        },
        {
            id: "unconscious",
            label: "EFFECT.StatusUnconscious",
            icon: "icons/svg/unconscious.svg"
        },
        {
            id: "stun",
            label: "EFFECT.StatusStunned",
            icon: "icons/svg/daze.svg"
        },
        {
            id: "paralysis",
            label: "EFFECT.StatusParalysis",
            icon: "icons/svg/paralysis.svg"
        },
        {
            id: "impaired",
            label: "EFFECT.StatusImpaired",
            icon: "icons/svg/down.svg"
        },
        {
            id: "disarmed",
            label: "EFFECT.StatusDisarmed",
            icon: "icons/svg/sword.svg"
        },
        {
            id: "blind",
            label: "EFFECT.StatusBlind",
            icon: "icons/svg/blind.svg"
        },
        {
            id: "fly",
            label: "EFFECT.StatusFlying",
            icon: "icons/svg/wing.svg"
        },
        {
            id: "eye",
            label: "EFFECT.StatusMarked",
            icon: "icons/svg/eye.svg"
        }
    ];
}
