export default class CombatTracker {
  /**
   * Check if a combatant is currently active in any combat.
   * @param {Combatant} combatant
   * @returns {boolean}
   */
  static ActingNow(combatant) {
    for (const combat of game.combats.contents) {
      // Find the current round combatant matching the actor
      const current = combat.combatant;
      if (current?.actor?.id === combatant.actor?.id) {
        return true;
      }
    }
    return false;
  }
}
