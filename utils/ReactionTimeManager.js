
/**
 * ReactionTimeManager - Gère les temps de réaction par rang
 * Système de combat avec temps limité basé sur le niveau de puissance
 */
class ReactionTimeManager {
    constructor(gameEngine, sock) {
        this.gameEngine = gameEngine;
        this.sock = sock;
        this.activeReactions = new Map();
        
        // Temps de réaction par rang (en millisecondes)
        this.reactionTimes = {
            'G': 360000,     // 6 minutes
            'F': 300000,     // 5 minutes  
            'E': 240000,     // 4 minutes
            'D': 180000,     // 3 minutes
            'C': 120000,     // 2 minutes
            'B': 60000,      // 1 minute
            'A': 30000,      // 30 secondes
            'S': 15000,      // 15 secondes
            'S+': 10000,     // 10 secondes
            'SS': 8000,      // 8 secondes
            'SSS': 5000,     // 5 secondes
            'MONARQUE': 3000 // 3 secondes
        };
    }

    /**
     * Démarre un compte à rebours de réaction
     */
    async startReactionTimer(actionId, defenderId, chatId, actionDescription) {
        const character = await this.gameEngine.dbManager.getCharacterByPlayer(defenderId);
        if (!character) return false;

        const reactionTime = this.reactionTimes[character.powerLevel] || this.reactionTimes['G'];
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

        const character = await this.gameEngine.dbManager.getCharacterByPlayer(reactionData.defenderId);
        
        await this.sock.sendMessage(reactionData.chatId, {
            text: `⏰ **TEMPS ÉCOULÉ !** ⏰

🗿 **${character.name}** n'a pas réagi à temps !
💀 Il reste immobile face à l'attaque !

⚡ Rang ${character.powerLevel} = ${Math.floor(reactionData.reactionTime / 1000)} secondes max
❌ Aucune défense ne sera appliquée !

💥 L'attaque va maintenant être traitée...`
        });

        // Notifier le système de combat
        this.gameEngine.processActionTimeout(actionId);
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
