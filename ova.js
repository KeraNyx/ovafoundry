import { OVA } from "./module/config.js";

import OVAAbilitySheet from "./module/sheets/ova-ability-sheet.js";
import OVACharacterSheet from "./module/sheets/ova-character-sheet.js";
import OVANPCSheet from "./module/sheets/ova-npc-sheet.js";
import OVACharacter from "./module/ova-character.js";
import OVAPerkSheet from "./module/sheets/ova-perk-sheet.js";
import OVAItem from "./module/ova-item.js";
import OVADie from "./module/dice/ova-die.js";
import OVAAttackSheet from "./module/sheets/ova-attack-sheet.js";
import OVASpellSheet from "./module/sheets/ova-spell-sheet.js";
import OVACombatant from "./module/combat/ova-combatant.js";
import OVAEffect from "./module/effects/ova-effect.js";
import OVAActiveEffect from "./module/effects/ova-active-effect.js";
import CombatTracker from "./module/combat/tracker.js";

import * as chat from "./module/chat/chat.js";
import registerHandlebarsHelpers from "./ova-handlebars-helpers.js";
import configureStatusEffects from "./configure-status-effects.js";
import Socket from "./module/sockets/socket.js";
import OVATokenHUD from "./module/token/ova-token-hud.js";

Hooks.once("init", async function () {
  console.log("OVA | Initializing OVA System");

  // Set document classes
  CONFIG.Item.documentClass = OVAItem;
  CONFIG.Actor.documentClass = OVACharacter;
  CONFIG.Combatant.documentClass = OVACombatant;
  CONFIG.ActiveEffect.documentClass = OVAActiveEffect;

  CONFIG.Dice.types = [OVADie];
  CONFIG.Dice.terms["d"] = OVADie;

  CONFIG.Item.typeLabels["ability"] = "OVA.Ability.Name";
  CONFIG.Item.typeLabels["perk"] = "OVA.Perk.Name";
  CONFIG.Actor.typeLabels["character"] = "OVA.Character.Name";
  CONFIG.Actor.typeLabels["npc"] = "OVA.NPC.Name";

  // Unregister core sheets using V2 namespace
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);

  // Register Item sheets
  foundry.documents.collections.Items.registerSheet("ova", OVAAbilitySheet, { types: ["ability"], label: "OVA.Ability.Name" });
  foundry.documents.collections.Items.registerSheet("ova", OVAPerkSheet, { types: ["perk"], label: "OVA.Perk.Name" });
  foundry.documents.collections.Items.registerSheet("ova", OVAAttackSheet, { types: ["attack"] });
  foundry.documents.collections.Items.registerSheet("ova", OVASpellSheet, { types: ["spell"] });

  // Register Actor sheets
  foundry.documents.collections.Actors.registerSheet("ova", OVACharacterSheet, { makeDefault: true, label: "OVA.Sheets.Character" });
  foundry.documents.collections.Actors.registerSheet("ova", OVANPCSheet, { label: "OVA.Sheets.NPC" });

  // Initialize socket
  Socket.initialize();

  // Listen for value changes across clients
  OVACharacter.listenForValueChange();

  // Preload templates
  await preloadTemplates();

  // Handlebars helpers
  registerHandlebarsHelpers();

  // System settings
  registerSystemSettings();

  // Replace combat tracker
  game.CombatTracker = CombatTracker;
});

Hooks.on("ready", async function () {
  canvas.hud.token = new OVATokenHUD();
});

async function preloadTemplates() {
  return foundry.applications.handlebars.loadTemplates([
    "systems/ova/templates/parts/ability-list.html",
    "systems/ova/templates/parts/effects.html",
    "systems/ova/templates/parts/effect-inline-desc.html",
    "systems/ova/templates/parts/perk-list.html",
    "systems/ova/templates/parts/combat-stats.html"
  ]);
}

function registerSystemSettings() {
  game.settings.register("ova", "rulebookName", {
    name: "PDFoundry Rulebook Name",
    scope: "world",
    config: true,
    type: String,
    default: "Rulebook"
  });
}

// Updated to renderChatMessageHTML
Hooks.on("renderChatMessageHTML", (message, html, data) => {
  if (message.roll) {
    chat.listenToCombatRolls(message, html, data);
  }
});

Hooks.on("chatMessage", (log, content, message) => {
  return chat.listenToCommands(log, content, message);
});

Hooks.on("renderChatLog", (html, options) => {
  chat.chatListeners(html, options);
});

Hooks.on('preUpdateCombat', async (combat, updateData, options, userId) => {
  if (!game.user.isGM) return;

  for (let turn of combat.turns) {
    const actor = turn.actor ?? turn.token.actor;
    if (!actor) continue;

    for (let effect of actor.data.effects) {
      if (effect.data.flags["each-round"]) {
        if (updateData.turn === undefined ||
          (effect.data.duration.startTurn === updateData.turn &&
            (updateData.turn > combat.turn || updateData.round > combat.round))) {

          const overTimeEffect = effect.data.flags["each-round"];
          const newData = { data: foundry.utils.deepClone(actor.data.data) };
          OVAEffect.applyEffectChanges(overTimeEffect, newData);
          await actor.update(newData);
          await actor.sheet?.refreshActiveEffects(effect);
        }
      }
    }

    actor.clearExpiredEffects();
  }
});
