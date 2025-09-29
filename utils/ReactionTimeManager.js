/**
 * ReactionTimeManager - Gère les temps de réaction par rang
 * Système de combat avec temps limité basé sur le niveau de puissance
 */
class ReactionTimeManager {
    constructor(gameEngine, sock) {
        this.gameEngine = gameEngine;
        this.sock = sock;
        this.activeTimers = new Map(); // actionId -> timer info
        this.reactionTimes = {
            'G': 360000,    // 6 minutes
            'F': 300000,    // 5 minutes
            'E': 240000,    // 4 minutes
            'D': 180000,    // 3 minutes
            'C': 120000,    // 2 minutes
            'B': 60000,     // 1 minute
            'A': 30000,     // 30 secondes
            'S': 15000,     // 15 secondes
            'S+': 10000,    // 10 secondes
            'SS': 8000,     // 8 secondes
            'SSS': 5000,    // 5 secondes
            'MONARQUE': 3000 // 3 secondes
        };
    }

    async startReactionTimer(actionId, chatId, targetPlayerId, attackerName, targetName, reactionTimeMs) {
        const startTime = Date.now();
        const endTime = startTime + reactionTimeMs;

        const timerInfo = {
            actionId,
            chatId,
            targetPlayerId,
            attackerName,
            targetName,
            startTime,
            endTime,
            reactionTimeMs,
            isActive: true
        };

        this.activeTimers.set(actionId, timerInfo);

        // Envoyer le message initial avec compte à rebours
        await this.sendCountdownMessage(timerInfo);

        // Démarrer les mises à jour périodiques
        this.startPeriodicUpdates(timerInfo);

        // Programmer l'expiration
        setTimeout(() => {
            this.handleTimeout(actionId);
        }, reactionTimeMs);

        return actionId;
    }

    async sendCountdownMessage(timerInfo) {
        const remainingTime = Math.max(0, timerInfo.endTime - Date.now());
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);

        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        await this.sock.sendMessage(timerInfo.chatId, {
            text: `⚔️ **COMBAT INITIÉ !**

🎯 **${timerInfo.attackerName}** attaque **${timerInfo.targetName}** !

⏰ **Temps de réaction restant:** ${timeDisplay}
🛡️ ${timerInfo.targetName} doit répondre avant expiration !

⚠️ Si aucune réponse, ${timerInfo.targetName} subira l'attaque complète !`
        });
    }

    startPeriodicUpdates(timerInfo) {
        const updateInterval = setInterval(() => {
            if (!timerInfo.isActive || !this.activeTimers.has(timerInfo.actionId)) {
                clearInterval(updateInterval);
                return;
            }

            const remainingTime = Math.max(0, timerInfo.endTime - Date.now());

            // Envoyer des mises à jour à intervalles spécifiques
            if (remainingTime <= 10000 && remainingTime > 9000) { // 10 secondes
                this.sendUrgentUpdate(timerInfo, 10);
            } else if (remainingTime <= 5000 && remainingTime > 4000) { // 5 secondes
                this.sendUrgentUpdate(timerInfo, 5);
            } else if (remainingTime <= 3000 && remainingTime > 2000) { // 3 secondes
                this.sendUrgentUpdate(timerInfo, 3);
            }

            if (remainingTime <= 0) {
                clearInterval(updateInterval);
            }
        }, 1000);
    }

    async sendUrgentUpdate(timerInfo, secondsLeft) {
        await this.sock.sendMessage(timerInfo.chatId, {
            text: `🚨 **URGENT !** 🚨

⏰ **${secondsLeft} secondes restantes** pour ${timerInfo.targetName} !

${secondsLeft <= 3 ? '💀 **DERNIÈRE CHANCE !**' : '⚠️ **DÉPÊCHEZ-VOUS !**'}`
        });
    }

    async handleTimeout(actionId) {
        const timerInfo = this.activeTimers.get(actionId);
        if (!timerInfo || !timerInfo.isActive) {
            return;
        }

        timerInfo.isActive = false;

        await this.sock.sendMessage(timerInfo.chatId, {
            text: `⏰ **TEMPS ÉCOULÉ !**

${timerInfo.targetName} n'a pas réagi à temps !
💥 L'attaque de ${timerInfo.attackerName} réussit automatiquement !`
        });

        this.activeTimers.delete(actionId);

        // Traiter l'action automatiquement
        if (this.gameEngine.processActionTimeout) {
            this.gameEngine.processActionTimeout(actionId);
        }
    }

    cancelTimer(actionId) {
        const timerInfo = this.activeTimers.get(actionId);
        if (timerInfo) {
            timerInfo.isActive = false;
            this.activeTimers.delete(actionId);
        }
    }

    /**
     * Démarre un compte à rebours de réaction
     */
    async startReactionTimer(actionId, defenderId, chatId, actionDescription) {
        let character;
        let reactionTime;
        let isNPC = false;

        // Gérer les PNJ simulés (ID commençant par 'npc_')
        if (defenderId.startsWith('npc_')) {
            isNPC = true;
            // PNJ simulé - utiliser des valeurs par défaut
            const npcPowerLevels = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];
            const randomPowerLevel = npcPowerLevels[Math.floor(Math.random() * npcPowerLevels.length)];

            character = {
                name: `PNJ-${defenderId.slice(-5)}`,
                powerLevel: randomPowerLevel,
                type: 'npc'
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
            status: 'waiting',
            isNPC
        };

        this.activeReactions.set(actionId, reactionData);

        // Envoyer le message d'avertissement
        await this.sendReactionWarning(reactionData, character);

        // Si c'est un PNJ, démarrer sa réaction automatique
        if (isNPC) {
            await this.startNPCAutoReaction(actionId, character, actionDescription, chatId);
        }

        // Programmer l'expiration
        setTimeout(() => {
            this.processReactionTimeout(actionId);
        }, reactionTime);

        return true;
    }

    /**
     * Détecte automatiquement les PNJ dans une action et démarre leurs temps de réaction
     */
    async detectAndStartNPCReactions(playerAction, chatId, playerId) {
        const npcKeywords = [
            'garde', 'soldat', 'marchand', 'villageois', 'paysan', 'noble', 
            'roi', 'reine', 'prêtre', 'mage', 'voleur', 'bandit', 'assassin', 
            'forgeron', 'aubergiste', 'pnj', 'personnage', 'homme', 'femme', 
            'enfant', 'vieillard', 'guerrier', 'archer', 'paladin', 'druide'
        ];

        const actionKeywords = [
            'attaque', 'frappe', 'combat', 'tue', 'massacre', 'agresse',
            'parle', 'dit', 'demande', 'questionne', 'interpelle', 'salue',
            'vole', 'dérobe', 'prend', 'saisit', 'menace', 'insulte'
        ];

        const lowerAction = playerAction.toLowerCase();

        // Vérifier s'il y a une action qui nécessite une réaction
        const hasActionKeyword = actionKeywords.some(keyword => lowerAction.includes(keyword));
        if (!hasActionKeyword) return [];

        // Détecter les PNJ mentionnés
        const detectedNPCs = [];
        for (const npcKeyword of npcKeywords) {
            if (lowerAction.includes(npcKeyword)) {
                // Générer un ID unique pour le PNJ
                const npcId = `npc_${npcKeyword}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Démarrer le temps de réaction pour ce PNJ
                const started = await this.startReactionTimer(actionId, npcId, chatId, playerAction);

                if (started) {
                    detectedNPCs.push({
                        actionId,
                        npcId,
                        npcType: npcKeyword,
                        detected: true
                    });

                    console.log(`🎯 Réaction PNJ démarrée: ${npcKeyword} (${actionId})`);
                }
            }
        }

        return detectedNPCs;
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
            
            // Si c'est un joueur qui n'a pas réagi, l'immobiliser
            if (character) {
                const immobilizationTime = Date.now() + (8000 + Math.random() * 7000); // 8-15 secondes
                await this.gameEngine.dbManager.setTemporaryData(reactionData.defenderId, 'immobilized_until', immobilizationTime);
                console.log(`🔒 Joueur ${character.name} immobilisé jusqu'à ${new Date(immobilizationTime).toLocaleTimeString()}`);
            }
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
💀 Vous êtes maintenant IMMOBILISÉ !

⚡ Rang ${character.powerLevel} = ${Math.floor(reactionData.reactionTime / 1000)} secondes max
❌ Vous ne pourrez plus agir pendant quelques secondes !

🎯 Les PNJ peuvent maintenant vous attaquer librement !`;

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
     * Démarre automatiquement une réaction PNJ après un délai calculé
     */
    async startNPCAutoReaction(actionId, npcData, playerAction, chatId) {
        const reactionData = this.activeReactions.get(actionId);
        if (!reactionData) return;

        // Calculer le temps de réaction du PNJ (plus court que le timeout)
        const maxReactionTime = reactionData.reactionTime * 0.8; // 80% du temps max
        const minReactionTime = reactionData.reactionTime * 0.3; // 30% du temps max

        // Temps aléatoire dans cette plage
        const npcReactionTime = Math.random() * (maxReactionTime - minReactionTime) + minReactionTime;

        console.log(`🤖 PNJ ${npcData.name} va réagir dans ${Math.floor(npcReactionTime/1000)} secondes`);

        setTimeout(async () => {
            if (this.activeReactions.has(actionId) && this.activeReactions.get(actionId).status === 'waiting') {
                await this.processNPCReaction(actionId, npcData, playerAction, chatId);
            }
        }, npcReactionTime);
    }

    /**
     * Traite la réaction automatique d'un PNJ
     */
    async processNPCReaction(actionId, npcData, playerAction, chatId) {
        const reactionData = this.activeReactions.get(actionId);
        if (!reactionData || reactionData.status !== 'waiting') {
            return;
        }

        // Marquer comme répondu pour éviter le timeout
        reactionData.status = 'npc_responded';
        this.activeReactions.delete(actionId);

        // Générer une réaction intelligente et potentiellement mortelle du PNJ
        const npcReaction = this.generateAggressiveNPCReaction(npcData, playerAction);

        // Calculer les dégâts que le PNJ peut infliger
        const npcDamage = this.calculateNPCDamage(npcData, npcReaction);
        
        const reactionMessage = this.limitMessage(`🤖 **PNJ ACTIF - ${npcData.powerLevel}** 🤖

⚡ **${npcData.name}** riposte violemment !

🎭 **Action :** ${npcReaction.action}
💭 **"${npcReaction.thought}"**

⚔️ **${npcReaction.type}** 
🎯 **Efficacité:** ${npcReaction.effectiveness}%
💀 **Dégâts potentiels:** ${npcDamage} PV

${npcReaction.canKill ? '☠️ ATTAQUE MORTELLE POSSIBLE !' : '⚠️ Attaque dangereuse !'}

💥 Le PNJ ne se laisse pas faire !`);

        await this.sock.sendMessage(chatId, { text: reactionMessage });

        // Notifier le système de combat de la réaction PNJ
        if (typeof this.gameEngine.processNPCReaction === 'function') {
            this.gameEngine.processNPCReaction(actionId, npcData, npcReaction);
        }

        console.log(`🤖 PNJ ${npcData.name} a réagi agressivement: ${npcReaction.action}`);
    }

    /**
     * Génère une réaction agressive et potentiellement mortelle pour un PNJ
     */
    generateAggressiveNPCReaction(npcData, playerAction) {
        const aggressiveReactions = {
            high_level: [ // PNJ puissants (C+)
                { action: "contre-attaque mortelle", type: "ATTAQUE CRITIQUE", effectiveness: 95, canKill: true },
                { action: "frappe dévastatrice", type: "DESTRUCTION", effectiveness: 90, canKill: true },
                { action: "technique secrète", type: "ART MARTIAL", effectiveness: 85, canKill: false }
            ],
            medium_level: [ // PNJ moyens (F-D)
                { action: "contre-attaque féroce", type: "Riposte", effectiveness: 75, canKill: false },
                { action: "esquive et riposte", type: "Combo", effectiveness: 70, canKill: false },
                { action: "charge brutale", type: "Charge", effectiveness: 65, canKill: false }
            ],
            low_level: [ // PNJ faibles (G)
                { action: "défense désespérée", type: "Défense", effectiveness: 45, canKill: false },
                { action: "recul prudent", type: "Esquive", effectiveness: 40, canKill: false },
                { action: "cri d'alarme", type: "Alerte", effectiveness: 35, canKill: false }
            ]
        };

        // Déterminer le niveau du PNJ
        let reactionType = 'low_level';
        if (['A', 'S', 'S+', 'SS', 'SSS'].includes(npcData.powerLevel)) {
            reactionType = 'high_level';
        } else if (['D', 'C', 'B'].includes(npcData.powerLevel)) {
            reactionType = 'medium_level';
        }

        const availableReactions = aggressiveReactions[reactionType];
        const selectedReaction = availableReactions[Math.floor(Math.random() * availableReactions.length)];

        // Générer une pensée agressive contextuelle
        const aggressiveThoughts = {
            high_level: [
                "Tu oses défier ma puissance !",
                "Je vais te montrer la vraie force !",
                "Cette impertinence mérite la mort !",
                "Prépare-toi à rencontrer ton créateur !"
            ],
            medium_level: [
                "Je ne me laisserai pas faire !",
                "Cette attaque mérite une réponse !",
                "Tu vas regretter ton audace !",
                "Je dois me défendre !"
            ],
            low_level: [
                "Je... je dois fuir !",
                "À l'aide ! Je suis attaqué !",
                "Pitié, épargnez-moi !",
                "Je ne veux pas mourir !"
            ]
        };

        const selectedThought = aggressiveThoughts[reactionType][Math.floor(Math.random() * aggressiveThoughts[reactionType].length)];

        return {
            ...selectedReaction,
            thought: selectedThought
        };
    }

    /**
     * Calcule les dégâts qu'un PNJ peut infliger
     */
    calculateNPCDamage(npcData, npcReaction) {
        const baseDamages = {
            'G': 15, 'F': 25, 'E': 40, 'D': 60, 'C': 85, 
            'B': 120, 'A': 160, 'S': 220, 'S+': 300, 
            'SS': 400, 'SSS': 550
        };
        
        const baseDamage = baseDamages[npcData.powerLevel] || 10;
        const effectivenessMultiplier = npcReaction.effectiveness / 100;
        const criticalMultiplier = npcReaction.canKill ? 1.5 : 1.0;
        
        return Math.floor(baseDamage * effectivenessMultiplier * criticalMultiplier);
    }

    /**
     * Limite un message à 700 caractères
     */
    limitMessage(message) {
        if (message.length <= 700) return message;
        return message.substring(0, 697) + '...';
    }

    /**
     * Génère une réaction intelligente pour un PNJ
     */
    generateNPCReaction(npcData, playerAction) {
        const reactions = {
            aggressive: [
                { action: "contre-attaque férocement", type: "Attaque", effectiveness: 85 },
                { action: "esquive et riposte", type: "Esquive-Attaque", effectiveness: 75 },
                { action: "charge brutalement", type: "Charge", effectiveness: 70 }
            ],
            defensive: [
                { action: "lève son bouclier", type: "Défense", effectiveness: 80 },
                { action: "recule prudemment", type: "Esquive", effectiveness: 60 },
                { action: "pare avec son arme", type: "Parade", effectiveness: 70 }
            ],
            neutral: [
                { action: "observe et analyse", type: "Observation", effectiveness: 50 },
                { action: "se prépare à réagir", type: "Préparation", effectiveness: 55 },
                { action: "évalue la menace", type: "Analyse", effectiveness: 45 }
            ]
        };

        // Déterminer le type de réaction selon le niveau du PNJ et l'action du joueur
        let reactionType = 'neutral';

        if (playerAction.toLowerCase().includes('attaque') || playerAction.toLowerCase().includes('frappe')) {
            reactionType = ['G', 'F'].includes(npcData.powerLevel) ? 'defensive' : 'aggressive';
        } else if (playerAction.toLowerCase().includes('parle') || playerAction.toLowerCase().includes('dit')) {
            reactionType = 'neutral';
        }

        const availableReactions = reactions[reactionType];
        const selectedReaction = availableReactions[Math.floor(Math.random() * availableReactions.length)];

        // Générer une pensée contextuelle
        const thoughts = {
            aggressive: [
                "Cet humain ose me défier !",
                "Je vais lui montrer ma force !",
                "Personne ne m'attaque impunément !",
                "Il va regretter son audace !"
            ],
            defensive: [
                "Je dois me protéger !",
                "Cette attaque semble dangereuse...",
                "Mieux vaut être prudent.",
                "Je ne peux pas me permettre d'être blessé."
            ],
            neutral: [
                "Que veut cette personne ?",
                "Je dois rester vigilant.",
                "Voyons ce qui va se passer...",
                "Cette situation est intéressante."
            ]
        };

        const selectedThought = thoughts[reactionType][Math.floor(Math.random() * thoughts[reactionType].length)];

        return {
            ...selectedReaction,
            thought: selectedThought
        };
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