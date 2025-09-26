
/**
 * ReactionTimeManager - Gère les temps de réaction par rang
 * Système de combat avec temps limité basé sur le niveau de puissance
 */
class ReactionTimeManager {
    constructor(gameEngine, sock) {
        this.gameEngine = gameEngine;
        this.sock = sock;
        this.activeReactions = new Map();
        
        // Temps de réaction par rang (en millisecondes) - Les faibles ont PLUS de temps
        this.reactionTimes = {
            'NIVEAU_1': 480000,  // 8 minutes - Extrêmement lent
            'G': 360000,         // 6 minutes
            'F': 300000,         // 5 minutes  
            'E': 240000,         // 4 minutes
            'D': 180000,         // 3 minutes
            'C': 120000,         // 2 minutes
            'B': 60000,          // 1 minute
            'A': 30000,          // 30 secondes
            'S': 15000,          // 15 secondes
            'S+': 10000,         // 10 secondes
            'SS': 8000,          // 8 secondes
            'SSS': 5000,         // 5 secondes
            'MONARQUE': 3000     // 3 secondes
        };
    }

    /**
     * Démarre un compte à rebours de réaction
     */
    async startReactionTimer(actionId, defenderId, chatId, actionDescription) {
        let character;
        let reactionTime;
        
        // Gérer les PNJ simulés (ID commençant par 'npc_')
        if (defenderId.startsWith('npc_')) {
            // PNJ simulé - utiliser des valeurs par défaut
            const npcPowerLevels = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];
            const randomPowerLevel = npcPowerLevels[Math.floor(Math.random() * npcPowerLevels.length)];
            
            character = {
                name: `PNJ-${defenderId.slice(-5)}`,
                powerLevel: randomPowerLevel
            };
            reactionTime = this.reactionTimes[randomPowerLevel];
            console.log(`🤖 PNJ simulé créé: ${character.name} (${character.powerLevel}) - ${Math.floor(reactionTime/1000)}s`);
        } else {
            // Joueur réel
            character = await this.gameEngine.dbManager.getCharacterByPlayer(defenderId);
            if (!character) return false;
            reactionTime = this.reactionTimes[character.powerLevel] || this.reactionTimes['G'];
        }

        if (!character) return false;

        const endTime = Date.now() + reactionTime;

        const reactionData = {
            actionId,
            defenderId,
            chatId,
            actionDescription,
            startTime: Date.now(),
            endTime,
            reactionTime,
            status: 'waiting'
        };

        this.activeReactions.set(actionId, reactionData);

        // Envoyer le message d'avertissement
        await this.sendReactionWarning(reactionData, character);

        // Programmer l'expiration
        setTimeout(() => {
            this.processReactionTimeout(actionId);
        }, reactionTime);

        return true;
    }

    /**
     * Envoie l'avertissement de temps de réaction
     */
    async sendReactionWarning(reactionData, character) {
        const timeInSeconds = Math.floor(reactionData.reactionTime / 1000);
        const timeInMinutes = Math.floor(timeInSeconds / 60);
        const remainingSeconds = timeInSeconds % 60;
        
        let timeDisplay;
        if (timeInMinutes > 0) {
            timeDisplay = remainingSeconds > 0 ? 
                `${timeInMinutes}m ${remainingSeconds}s` : 
                `${timeInMinutes}m`;
        } else {
            timeDisplay = `${timeInSeconds}s`;
        }

        const warningMessage = `⚠️ **TEMPS DE RÉACTION ACTIVÉ !** ⚠️

🎯 **${character.name}** (Rang ${character.powerLevel})
⏰ **Temps limité:** ${timeDisplay}

📢 **Action en cours:** ${reactionData.actionDescription}

🛡️ **VOUS DEVEZ RÉAGIR !**
• Tapez votre action de défense
• Ou tapez votre contre-attaque
• Ou tapez votre esquive

⚡ **Rang ${character.powerLevel}** = ${timeDisplay} pour réagir

❌ **Si vous ne répondez pas à temps:**
• Vous resterez immobile
• Vous subirez l'attaque complète
• Aucune défense ne sera appliquée

💀 **LE TEMPS PRESSE !** 💀`;

        await this.sock.sendMessage(reactionData.chatId, { text: warningMessage });

        // Envoyer des rappels
        this.scheduleReminders(reactionData);
    }

    /**
     * Programme des rappels de temps
     */
    scheduleReminders(reactionData) {
        const { actionId, reactionTime } = reactionData;
        
        // Rappel à 50% du temps
        setTimeout(() => {
            if (this.activeReactions.has(actionId) && this.activeReactions.get(actionId).status === 'waiting') {
                this.sendTimeReminder(actionId, '50% du temps écoulé');
            }
        }, reactionTime * 0.5);

        // Rappel à 80% du temps  
        setTimeout(() => {
            if (this.activeReactions.has(actionId) && this.activeReactions.get(actionId).status === 'waiting') {
                this.sendTimeReminder(actionId, '80% du temps écoulé - DÉPÊCHEZ-VOUS !');
            }
        }, reactionTime * 0.8);

        // Rappel à 95% du temps
        setTimeout(() => {
            if (this.activeReactions.has(actionId) && this.activeReactions.get(actionId).status === 'waiting') {
                this.sendTimeReminder(actionId, '⚠️ DERNIÈRE CHANCE ! 5% du temps restant !');
            }
        }, reactionTime * 0.95);
    }

    /**
     * Envoie un rappel de temps
     */
    async sendTimeReminder(actionId, message) {
        const reactionData = this.activeReactions.get(actionId);
        if (!reactionData) return;

        const timeLeft = reactionData.endTime - Date.now();
        const secondsLeft = Math.floor(timeLeft / 1000);

        await this.sock.sendMessage(reactionData.chatId, {
            text: `⏰ **RAPPEL DE TEMPS** ⏰\n\n${message}\n⏳ Temps restant: ${secondsLeft} secondes`
        });
    }

    /**
     * Traite l'expiration du temps de réaction
     */
    async processReactionTimeout(actionId) {
        const reactionData = this.activeReactions.get(actionId);
        if (!reactionData || reactionData.status !== 'waiting') {
            return;
        }

        reactionData.status = 'timeout';

        let character;
        let isNPC = false;
        
        // Vérifier si c'est un PNJ simulé
        if (reactionData.defenderId.startsWith('npc_')) {
            isNPC = true;
            const npcPowerLevels = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];
            const randomPowerLevel = npcPowerLevels[Math.floor(Math.random() * npcPowerLevels.length)];
            character = {
                name: `PNJ-${reactionData.defenderId.slice(-5)}`,
                powerLevel: randomPowerLevel
            };
        } else {
            character = await this.gameEngine.dbManager.getCharacterByPlayer(reactionData.defenderId);
        }
        
        if (!character) {
            console.log(`⚠️ Personnage introuvable pour timeout: ${reactionData.defenderId}`);
            this.activeReactions.delete(actionId);
            return;
        }

        const timeoutMessage = isNPC ? 
            `⏰ **TEMPS ÉCOULÉ !** ⏰

🤖 **${character.name}** (PNJ ${character.powerLevel}) n'a pas réagi à temps !
💀 Il reste immobile face à l'attaque !

⚡ Rang ${character.powerLevel} = ${Math.floor(reactionData.reactionTime / 1000)} secondes max
❌ Aucune défense ne sera appliquée !

💥 L'attaque continue sans opposition...` :
            `⏰ **TEMPS ÉCOULÉ !** ⏰

🗿 **${character.name}** n'a pas réagi à temps !
💀 Il reste immobile face à l'attaque !

⚡ Rang ${character.powerLevel} = ${Math.floor(reactionData.reactionTime / 1000)} secondes max
❌ Aucune défense ne sera appliquée !

💥 L'attaque va maintenant être traitée...`;
        
        await this.sock.sendMessage(reactionData.chatId, { text: timeoutMessage });

        // Notifier le système de combat si la méthode existe
        if (typeof this.gameEngine.processActionTimeout === 'function') {
            this.gameEngine.processActionTimeout(actionId);
        } else {
            console.log(`💥 Action timeout traité: ${actionId} - ${character.name} (${isNPC ? 'PNJ' : 'Joueur'})`);
        }
        
        this.activeReactions.delete(actionId);
    }

    /**
     * Annule un temps de réaction (si le joueur réagit)
     */
    cancelReactionTimer(actionId) {
        const reactionData = this.activeReactions.get(actionId);
        if (reactionData && reactionData.status === 'waiting') {
            reactionData.status = 'responded';
            this.activeReactions.delete(actionId);
            return true;
        }
        return false;
    }

    /**
     * Vérifie si un joueur est en temps de réaction
     */
    isInReactionTime(playerId) {
        for (const [actionId, data] of this.activeReactions.entries()) {
            if (data.defenderId === playerId && data.status === 'waiting') {
                return { actionId, data };
            }
        }
        return null;
    }

    /**
     * Obtient les statistiques des temps de réaction
     */
    getReactionStats() {
        return {
            activeReactions: this.activeReactions.size,
            reactionTimes: this.reactionTimes
        };
    }
}

module.exports = ReactionTimeManager;
