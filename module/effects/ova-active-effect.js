export default class OVAActiveEffect extends ActiveEffect {

  /* -------------------------------------------- */
  /*  Creation Hook                               */
  /* -------------------------------------------- */
  async _onCreate(options, userId) {
    await super._onCreate(options, userId);

    const createItemFlag = this.flags?.["create-item"];
    if (!createItemFlag) return;

    const actor = this.parent;
    if (!actor) return;

    // Find root item (rootId === "")
    const rootData = createItemFlag.find(i => i.system?.rootId === "");
    if (!rootData) return;

    const [root] = await actor.createEmbeddedDocuments("Item", [rootData]);
    await this.setFlag("ova", "linked-item", root.id);

    // Create child items
    const children = createItemFlag
      .filter(i => i.system?.rootId !== "")
      .map(i => {
        i.system.rootId = root.id;
        return i;
      });

    if (children.length) {
      await actor.createEmbeddedDocuments("Item", children);
    }
  }

  /* -------------------------------------------- */
  /*  Deletion Hook                               */
  /* -------------------------------------------- */
  async _onDelete(options, userId) {
    const linkedItem = this.getFlag("ova", "linked-item");
    if (linkedItem && this.parent) {
      await this.parent.deleteEmbeddedDocuments("Item", [linkedItem]);
    }
    await super._onDelete(options, userId);
  }

  /* -------------------------------------------- */
  /*  Duration Override                           */
  /* -------------------------------------------- */
  /** @override */
  get duration() {
    const d = this.system?.duration ?? {};

    /* ---------- Time-Based ---------- */
    if (Number.isFinite(d.seconds)) {
      const start = d.startTime ?? game.time.worldTime;
      const elapsed = game.time.worldTime - start;
      const remaining = Math.max(d.seconds - elapsed, 0);

      return {
        type: "seconds",
        duration: d.seconds,
        remaining,
        label: `${Math.ceil(remaining)} Seconds`
      };
    }

    /* ---------- Turn-Based ---------- */
    if (d.rounds || d.turns) {
      const combat = game.combat;
      const currentRound = combat?.round ?? 0;
      const currentTurn = combat?.turn ?? 0;
      const nTurns = combat?.turns.length ?? 1;

      const current = this._getCombatTime(currentRound, currentTurn);
      const duration = this._getCombatTime(d.rounds, d.turns);
      const start = this._getCombatTime(d.startRound, d.startTurn, nTurns);

      if (current <= start) {
        return {
          type: "turns",
          duration,
          remaining: duration,
          label: this._getDurationLabel(d.rounds, d.turns)
        };
      }

      const remaining = Math.max((start + duration) - current, 0);
      const remainingRounds = Math.floor(remaining);
      const remainingTurns = Math.min(((remaining - remainingRounds) * 100), nTurns - 1);

      return {
        type: "turns",
        duration,
        remaining,
        label: this._getDurationLabel(remainingRounds, remainingTurns)
      };
    }

    /* ---------- Infinite ---------- */
    return {
      type: "none",
      duration: null,
      remaining: null,
      label: "∞"
    };
  }

  /* -------------------------------------------- */
  /*  Duration Label Helper                       */
  /* -------------------------------------------- */
  _getDurationLabel(rounds = 0, turns = 0) {
    const parts = [];

    if (rounds > 0) {
      parts.push(`${rounds} ${game.i18n.localize(rounds === 1 ? "COMBAT.Round" : "COMBAT.Rounds")}`);
    }
    if (turns > 0) {
      parts.push(`${turns} ${game.i18n.localize(turns === 1 ? "COMBAT.Turn" : "COMBAT.Turns")}`);
    }
    if (!parts.length) parts.push("∞");

    return parts.join(", ");
  }

  /* -------------------------------------------- */
  /*  Helper: Convert rounds/turns to float time */
  /* -------------------------------------------- */
  _getCombatTime(rounds = 0, turns = 0, nTurns = 1) {
    return (rounds || 0) + ((turns || 0) / nTurns);
  }
}
