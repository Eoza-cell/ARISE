/**
 * RPEncounterManager - Gère les rencontres RP entre joueurs avec système de 6 minutes
 */
class RPEncounterManager {
    constructor(gameEngine, sock) {
        this.gameEngine = gameEngine;
        this.sock = sock;
        this.activeEncounters = new Map(); // encounterId => encounterData
        this.playerInEncounter = new Map(); // playerId => encounterId
        this.actionTimers = new Map(); // actionId => timerData
        this.waitingForAction = new Map(); // encounterId => {playerId, action, timer}
    }

    /**
     * Démarre une rencontre RP entre deux joueurs
     * @param {Object} player1 - Premier joueur
     * @param {Object} player2 - Deuxième joueur  
     * @param {string} chatId - ID du chat
     * @param {string} location - Lieu de la rencontre
     */
    async startRPEncounter(player1, player2, chatId, location) {
        const encounterId = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const encounterData = {
            id: encounterId,
            players: [player1.id, player2.id],
            playerNames: [player1.name, player2.name],
            chatId,
            location,
            startTime: Date.now(),
            currentTurn: 0, // Index du joueur dont c'est le tour
            turnHistory: [], // Historique des actions
            status: 'active',
            narrativeContext: `Rencontre RP entre ${player1.name} et ${player2.name} à ${location}`,
            waitingForAction: false,
            actionDeadline: null
        };

        this.activeEncounters.set(encounterId, encounterData);
        this.playerInEncounter.set(player1.id, encounterId);
        this.playerInEncounter.set(player2.id, encounterId);

        // Générer une narration d'introduction avec l'IA
        const introNarration = await this.generateEncounterIntroduction(player1, player2, location);

        const currentPlayerId = encounterData.players[encounterData.currentTurn];
        const currentPlayerTag = `@${currentPlayerId}`;

        const welcomeMessage = `🎭 **RENCONTRE ROLEPLAY INITIÉE** 🎭

${introNarration}

👥 **Participants :**
• **${player1.name}** (${player1.powerLevel}) @${player1.id}
• **${player2.name}** (${player2.powerLevel}) @${player2.id}

📍 **Lieu :** ${location}
⏰ **Système de tours :** 6 minutes par action
🎯 **Tour actuel :** ${encounterData.playerNames[encounterData.currentTurn]}

📋 **Règles :**
• Chaque joueur a 6 minutes pour agir
• Décrivez vos actions en roleplay
• Le narrateur IA décrit les résultats
• Si vous ne répondez pas dans les 6 minutes, vous restez immobile
• Les messages hors RP seront supprimés automatiquement

🎬 **${currentPlayerTag} ${encounterData.playerNames[encounterData.currentTurn]}, c'est à vous de commencer !**
⏱️ Vous avez 6 minutes pour décrire votre première action.`;

        await this.sock.sendMessage(chatId, { 
            text: welcomeMessage,
            mentions: [player1.id, player2.id, currentPlayerId]
        });

        // Démarrer le timer pour le premier joueur
        this.startActionTimer(encounterId, encounterData.players[encounterData.currentTurn]);

        return encounterId;
    }

    /**
     * Démarre le timer d'action pour un joueur
     * @param {string} encounterId - ID de la rencontre
     * @param {string} playerId - ID du joueur
     */
    startActionTimer(encounterId, playerId) {
        const encounterData = this.activeEncounters.get(encounterId);
        if (!encounterData) return;

        const actionId = `${encounterId}_${playerId}_${Date.now()}`;
        const timeout = 6 * 60 * 1000; // 6 minutes
        const deadline = Date.now() + timeout;

        encounterData.waitingForAction = true;
        encounterData.actionDeadline = deadline;

        const timerData = {
            actionId,
            encounterId,
            playerId,
            deadline,
            status: 'waiting'
        };

        this.actionTimers.set(actionId, timerData);

        // Programmer les rappels de temps
        this.scheduleActionReminders(actionId, timeout);

        // Programmer l'expiration
        setTimeout(() => {
            this.handleActionTimeout(actionId);
        }, timeout);

        console.log(`⏰ Timer RP démarré: ${actionId} - 6 minutes pour ${playerId}`);
    }

    /**
     * Programme les rappels de temps pour une action
     * @param {string} actionId - ID de l'action
     * @param {number} totalTime - Temps total en millisecondes
     */
    scheduleActionReminders(actionId, totalTime) {
        // Rappel à 3 minutes (50%)
        setTimeout(() => {
            if (this.actionTimers.has(actionId) && this.actionTimers.get(actionId).status === 'waiting') {
                this.sendTimeReminder(actionId, '⏰ 3 minutes restantes pour votre action RP !');
            }
        }, totalTime * 0.5);

        // Rappel à 1 minute (83%)
        setTimeout(() => {
            if (this.actionTimers.has(actionId) && this.actionTimers.get(actionId).status === 'waiting') {
                this.sendTimeReminder(actionId, '⚠️ Plus que 1 minute ! Dépêchez-vous !');
            }
        }, totalTime * 0.833);

        // Rappel à 30 secondes (92%)
        setTimeout(() => {
            if (this.actionTimers.has(actionId) && this.actionTimers.get(actionId).status === 'waiting') {
                this.sendTimeReminder(actionId, '🚨 URGENT ! 30 secondes restantes !');
            }
        }, totalTime * 0.916);
    }

    /**
     * Envoie un rappel de temps
     * @param {string} actionId - ID de l'action
     * @param {string} message - Message de rappel
     */
    async sendTimeReminder(actionId, message) {
        const timerData = this.actionTimers.get(actionId);
        if (!timerData) return;

        const encounterData = this.activeEncounters.get(timerData.encounterId);
        if (!encounterData) return;

        const timeLeft = Math.max(0, timerData.deadline - Date.now());
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);

        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        // Envoyer un nouveau message au lieu d'essayer d'éditer
        await this.sock.sendMessage(encounterData.chatId, {
            text: `${message}\n⏳ Temps restant: **${timeDisplay}**`,
            mentions: [timerData.playerId]
        });

        console.log(`⏰ Rappel envoyé pour ${actionId}: ${timeDisplay} restantes`);
    }

    /**
     * Gère l'expiration d'une action
     * @param {string} actionId - ID de l'action
     */
    async handleActionTimeout(actionId) {
        const timerData = this.actionTimers.get(actionId);
        if (!timerData || timerData.status !== 'waiting') return;

        const encounterData = this.activeEncounters.get(timerData.encounterId);
        if (!encounterData) return;

        timerData.status = 'timeout';

        const playerCharacter = await this.gameEngine.dbManager.getCharacterByPlayer(timerData.playerId);
        const playerName = playerCharacter ? playerCharacter.name : `Joueur ${timerData.playerId.slice(-4)}`;

        // Générer une narration d'inaction avec l'IA
        const inactionNarration = await this.generateInactionNarration(playerName, encounterData);

        const timeoutMessage = `⏰ **TEMPS ÉCOULÉ !** ⏰

${inactionNarration}

💀 **${playerName}** reste immobile, perdu dans ses pensées...

🔄 **Tour suivant** - ${encounterData.playerNames[1 - encounterData.currentTurn]}, c'est maintenant à vous !
⏱️ Vous avez 6 minutes pour décrire votre action.`;

        await this.sock.sendMessage(encounterData.chatId, { text: timeoutMessage });

        // Passer au joueur suivant
        this.switchToNextPlayer(timerData.encounterId);

        this.actionTimers.delete(actionId);
    }

    /**
     * Traite une action RP d'un joueur
     * @param {string} playerId - ID du joueur
     * @param {string} message - Message/action du joueur
     * @param {string} chatId - ID du chat
     */
    async handlePlayerAction(playerId, message, chatId) {
        const encounterId = this.playerInEncounter.get(playerId);
        if (!encounterId) return false;

        const encounterData = this.activeEncounters.get(encounterId);
        if (!encounterData || encounterData.status !== 'active') return false;

        // Vérifier si c'est le tour du joueur
        if (encounterData.players[encounterData.currentTurn] !== playerId) {
            await this.sock.sendMessage(chatId, {
                text: `⚠️ Ce n'est pas votre tour ! Attendez que ${encounterData.playerNames[encounterData.currentTurn]} agisse.`
            });
            return true;
        }

        // Annuler le timer actuel
        for (const [actionId, timerData] of this.actionTimers.entries()) {
            if (timerData.encounterId === encounterId && timerData.playerId === playerId && timerData.status === 'waiting') {
                timerData.status = 'responded';
                this.actionTimers.delete(actionId);
                break;
            }
        }

        encounterData.waitingForAction = false;
        encounterData.actionDeadline = null;

        const playerCharacter = await this.gameEngine.dbManager.getCharacterByPlayer(playerId);
        const playerName = playerCharacter ? playerCharacter.name : `Joueur ${playerId.slice(-4)}`;

        // Ajouter l'action à l'historique
        encounterData.turnHistory.push({
            playerId,
            playerName,
            action: message,
            timestamp: Date.now()
        });

        // Générer une narration de réaction avec l'IA
        const actionNarration = await this.generateActionNarration(playerName, message, encounterData);

        const actionResponse = `🎭 **ACTION DE ${playerName.toUpperCase()}**

"${message}"

📖 **NARRATION :**
${actionNarration}

⏭️ **Tour suivant** - ${encounterData.playerNames[1 - encounterData.currentTurn]}, réagissez !
⏱️ Vous avez 6 minutes pour décrire votre réaction.`;

        await this.sock.sendMessage(chatId, { text: actionResponse });

        // Passer au joueur suivant
        this.switchToNextPlayer(encounterId);

        return true;
    }

    /**
     * Passe au joueur suivant
     * @param {string} encounterId - ID de la rencontre
     */
    switchToNextPlayer(encounterId) {
        const encounterData = this.activeEncounters.get(encounterId);
        if (!encounterData) return;

        encounterData.currentTurn = 1 - encounterData.currentTurn; // Alterner entre 0 et 1

        // Démarrer le timer pour le joueur suivant
        this.startActionTimer(encounterId, encounterData.players[encounterData.currentTurn]);
    }

    /**
     * Termine une rencontre RP
     * @param {string} encounterId - ID de la rencontre
     * @param {string} reason - Raison de la fin
     */
    async endRPEncounter(encounterId, reason = 'Fin naturelle') {
        const encounterData = this.activeEncounters.get(encounterId);
        if (!encounterData) return;

        encounterData.status = 'ended';

        // Annuler tous les timers actifs
        for (const [actionId, timerData] of this.actionTimers.entries()) {
            if (timerData.encounterId === encounterId) {
                timerData.status = 'cancelled';
                this.actionTimers.delete(actionId);
            }
        }

        // Retirer les joueurs de la rencontre
        for (const playerId of encounterData.players) {
            this.playerInEncounter.delete(playerId);
        }

        // Générer un résumé final avec l'IA
        const summaryNarration = await this.generateEncounterSummary(encounterData);

        const endMessage = `🎭 **RENCONTRE RP TERMINÉE** 🎭

${summaryNarration}

📊 **Statistiques :**
• Durée: ${Math.floor((Date.now() - encounterData.startTime) / 60000)} minutes
• Actions totales: ${encounterData.turnHistory.length}
• Raison: ${reason}

✨ **Merci pour cette session de roleplay !** ✨`;

        await this.sock.sendMessage(encounterData.chatId, { text: endMessage });

        this.activeEncounters.delete(encounterId);
    }

    /**
     * Génère une introduction de rencontre avec l'IA
     */
    async generateEncounterIntroduction(player1, player2, location) {
        if (!this.gameEngine.groqClient?.hasValidClient()) {
            return `${player1.name} et ${player2.name} se rencontrent à ${location}.`;
        }

        try {
            const prompt = `Créez une introduction immersive pour une rencontre RP entre deux personnages :

**${player1.name}** (${player1.powerLevel}) du royaume ${player1.kingdom}
**${player2.name}** (${player2.powerLevel}) du royaume ${player2.kingdom}

Lieu : ${location}

Style : Médiéval-fantasy, ambiance immersive, 2-3 phrases courtes.
Décrivez l'atmosphere du lieu et comment les deux personnages se voient pour la première fois.`;

            return await this.gameEngine.groqClient.generateNarration(prompt, 200);
        } catch (error) {
            console.error('❌ Erreur génération intro RP:', error.message);
            return `${player1.name} et ${player2.name} se retrouvent face à face à ${location}, l'atmosphère est chargée d'anticipation.`;
        }
    }

    /**
     * Génère une narration d'action avec l'IA
     */
    async generateActionNarration(playerName, action, encounterData) {
        if (!this.gameEngine.groqClient?.hasValidClient()) {
            return `${playerName} ${action}`;
        }

        try {
            const otherPlayerName = encounterData.playerNames.find(name => name !== playerName);
            const recentActions = encounterData.turnHistory.slice(-3).map(turn => 
                `${turn.playerName}: "${turn.action}"`
            ).join('\n');

            const prompt = `Narrateur IA pour une session de roleplay :

**Action actuelle :** ${playerName} dit/fait : "${action}"
**Lieu :** ${encounterData.location}
**Autre participant :** ${otherPlayerName}

**Contexte récent :**
${recentActions}

En tant que narrateur IA expert, décrivez de manière immersive :
- Les conséquences/résultats de cette action
- Les réactions de l'environnement
- L'ambiance créée
- Comment cela affecte la scène

Style : Cinématographique, immersif, 2-3 phrases. Univers médiéval-fantasy.`;

            return await this.gameEngine.groqClient.generateNarration(prompt, 300);
        } catch (error) {
            console.error('❌ Erreur génération narration action:', error.message);
            return `L'action de ${playerName} résonne dans ${encounterData.location}, créant de nouvelles possibilités.`;
        }
    }

    /**
     * Génère une narration d'inaction avec l'IA
     */
    async generateInactionNarration(playerName, encounterData) {
        if (!this.gameEngine.groqClient?.hasValidClient()) {
            return `${playerName} semble perdu dans ses pensées.`;
        }

        try {
            const prompt = `Le joueur ${playerName} n'a pas agi dans les temps impartis lors d'une session RP.

Lieu : ${encounterData.location}

Créez une narration courte et immersive expliquant pourquoi le personnage reste immobile ou hésitant. Soyez créatif mais pas moqueur.

Style : 1-2 phrases, atmosphérique, médiéval-fantasy.`;

            return await this.gameEngine.groqClient.generateNarration(prompt, 150);
        } catch (error) {
            console.error('❌ Erreur génération narration inaction:', error.message);
            return `${playerName} reste figé, comme saisi par la complexité de la situation.`;
        }
    }

    /**
     * Génère un résumé de rencontre avec l'IA
     */
    async generateEncounterSummary(encounterData) {
        if (!this.gameEngine.groqClient?.hasValidClient()) {
            return `Une rencontre mémorable s'achève entre ${encounterData.playerNames.join(' et ')}.`;
        }

        try {
            const allActions = encounterData.turnHistory.map(turn => 
                `${turn.playerName}: "${turn.action}"`
            ).join('\n');

            const prompt = `Résumez cette session de roleplay :

**Participants :** ${encounterData.playerNames.join(' et ')}
**Lieu :** ${encounterData.location}
**Durée :** ${Math.floor((Date.now() - encounterData.startTime) / 60000)} minutes

**Toutes les actions :**
${allActions}

Créez un résumé narratif épique de cette rencontre, en soulignant les moments marquants et l'évolution de l'interaction.

Style : Épique, conclusif, 2-3 phrases. Médiéval-fantasy.`;

            return await this.gameEngine.groqClient.generateNarration(prompt, 250);
        } catch (error) {
            console.error('❌ Erreur génération résumé RP:', error.message);
            return `Cette rencontre entre ${encounterData.playerNames.join(' et ')} restera gravée dans les mémoires de ${encounterData.location}.`;
        }
    }

    /**
     * Vérifie si un joueur est dans une rencontre RP
     * @param {string} playerId - ID du joueur
     * @returns {Object|null} Données de la rencontre ou null
     */
    getPlayerEncounter(playerId) {
        const encounterId = this.playerInEncounter.get(playerId);
        return encounterId ? this.activeEncounters.get(encounterId) : null;
    }

    /**
     * Obtient les statistiques des rencontres RP
     * @returns {Object} Statistiques
     */
    getEncounterStats() {
        return {
            activeEncounters: this.activeEncounters.size,
            activeTimers: this.actionTimers.size,
            playersInEncounters: this.playerInEncounter.size
        };
    }
}

module.exports = RPEncounterManager;