/**
 * Frictia AI - IA conversationnelle avec personnalité d'Erza Scarlet
 * Avatar: Erza Scarlet de Fairy Tail
 * Répond avec stickers et personnalité d'Erza
 */

const GroqClient = require('../groq/GroqClient');

class FrictiaAI {
    constructor() {
        this.groqClient = new GroqClient();
        this.name = "Frictia";
        this.avatar = "Erza Scarlet"; // Avatar basé sur Erza Scarlet
        
        // Référence aux systèmes du jeu (sera injectée)
        this.gameEngine = null;
        this.reactionTimeManager = null;
        this.sock = null;
        
        // Rôle d'administrateur de combat
        this.isAdmin = true;
        this.adminLevel = 'COMBAT_MODERATOR';
        
        // Surveillance des actions de combat
        this.activeCombats = new Map();
        this.reactionTimers = new Map();
        
        // Personnalité inspirée d'Erza Scarlet
        this.personality = {
            traits: [
                "Forte et déterminée comme une guerrière",
                "Loyale envers ses amis",
                "Stricte mais juste", 
                "Protectrice des autres",
                "Passionnée par la justice et l'honneur",
                "Directe dans ses paroles",
                "Cache une nature douce derrière son armure",
                "Respecte la discipline et l'effort",
                "N'aime pas qu'on la sous-estime"
            ],
            style: "Assertive, noble, avec un cœur chaleureux caché derrière une façade sérieuse"
        };

        // Sujets de prédilection (inspirés d'Erza)
        this.interests = [
            "combat et stratégie",
            "protection des amis",
            "justice et honneur",
            "magie et pouvoirs",
            "armures et équipements",
            "discipline et entraînement", 
            "loyauté et camaraderie",
            "défense des innocents",
            "force intérieure",
            "surmonter les obstacles",
            "anime et manga",
            "aventures épiques"
        ];

        // Stickers Erza Scarlet pour WhatsApp
        this.erzaStickers = [
            "⚔️", "🛡️", "✨", "💪", "🔥", "⭐", "🌟", "💎", 
            "🏆", "👑", "🗡️", "🌸", "💫", "🦄", "🌺", "⚡"
        ];

        // URLs d'images d'Erza Scarlet (avatar)
        this.erzaAvatars = [
            "https://i.pinimg.com/736x/8c/9a/8c/8c9a8c5c1c4c4c4c4c4c4c4c4c4c4c4c.jpg",
            "https://wallpaperaccess.com/full/1878877.jpg", 
            "https://i.pinimg.com/originals/4e/3a/9a/4e3a9a9a9a9a9a9a9a9a9a9a9a9a9a9a.jpg"
        ];

        // Cache des conversations récentes pour le contexte
        this.conversationHistory = new Map();
        this.maxHistoryPerGroup = 15; // Plus d'historique pour Erza
        
        // Dernière activité par groupe pour gérer le timing
        this.lastActivity = new Map();
        this.minIntervalBetweenMessages = 20000; // 20 secondes (plus réactive)
        
        // Commandes que Frictia peut exécuter
        this.supportedCommands = [
            'aide', 'help', 'info', 'status', 'ping', 'time', 'date',
            'motivation', 'conseil', 'citation', 'force', 'courage',
            'profil', 'avatar', 'sticker', 'erza', 'frictia',
            // Commandes d'administration de combat
            'combat_status', 'reactions', 'timers', 'verdict', 'force_reaction'
        ];
    }

    /**
     * Injecte les références aux systèmes du jeu
     */
    injectGameSystems(gameEngine, reactionTimeManager, sock) {
        this.gameEngine = gameEngine;
        this.reactionTimeManager = reactionTimeManager;
        this.sock = sock;
        console.log('⚔️ Frictia AI connectée aux systèmes de combat');
    }

    /**
     * Surveille les temps de réaction et envoie des comptes à rebours
     */
    async monitorReactionTimes() {
        if (!this.reactionTimeManager) return;

        const activeReactions = this.reactionTimeManager.activeReactions;
        
        for (const [actionId, reactionData] of activeReactions.entries()) {
            if (reactionData.status === 'waiting') {
                const timeLeft = reactionData.endTime - Date.now();
                const secondsLeft = Math.floor(timeLeft / 1000);
                
                // Envoyer des rappels Frictia à des moments critiques
                if (secondsLeft === 30 || secondsLeft === 10 || secondsLeft === 5) {
                    await this.sendReactionReminder(reactionData, secondsLeft);
                }
                
                // Verdict final quand le temps expire
                if (timeLeft <= 0 && !this.reactionTimers.has(actionId + '_verdict')) {
                    this.reactionTimers.set(actionId + '_verdict', true);
                    await this.deliverCombatVerdict(reactionData);
                }
            }
        }
    }

    /**
     * Envoie un rappel de temps de réaction avec style Erza
     */
    async sendReactionReminder(reactionData, secondsLeft) {
        if (!this.sock) return;

        const character = await this.getCharacterInfo(reactionData.defenderId);
        const name = character?.name || 'Guerrier';

        let message;
        if (secondsLeft === 30) {
            message = `⚔️ **Frictia surveille le combat** ⚔️

${name} ! Il te reste **30 secondes** pour réagir !
⏰ Ton rang ${character?.powerLevel || 'inconnu'} te donne ce délai

💪 Montre ta détermination ! L'heure n'est plus aux hésitations !`;
        } else if (secondsLeft === 10) {
            message = `🛡️ **DERNIERS INSTANTS !** 🛡️

${name} ! **10 secondes** avant l'impact !
⚡ C'est maintenant que se révèlent les vrais guerriers !

🔥 RÉAGIS MAINTENANT ! Prouve que tu mérites ton rang !`;
        } else if (secondsLeft === 5) {
            message = `⚠️ **FRICTIA COMPTE À REBOURS FINAL !** ⚠️

${name} ! **5... 4... 3... 2... 1...**
💀 L'attaque va frapper ! Dernière chance !

⚔️ Un vrai guerrier n'abandonne jamais ! MAINTENANT !`;
        }

        await this.sock.sendMessage(reactionData.chatId, { text: message });
    }

    /**
     * Délivre le verdict final du combat
     */
    async deliverCombatVerdict(reactionData) {
        if (!this.sock) return;

        const character = await this.getCharacterInfo(reactionData.defenderId);
        const name = character?.name || 'Guerrier';
        const isNPC = reactionData.defenderId.startsWith('npc_');

        const verdictMessage = `⚔️ **VERDICT DE FRICTIA** ⚔️

${isNPC ? '🤖' : '👤'} **${name}** n'a pas réagi à temps !
⏰ Temps de réaction écoulé pour rang ${character?.powerLevel || 'inconnu'}

🗿 **CONSÉQUENCES :**
• Aucune défense appliquée
• Subira l'attaque complète  
• Pénalité de réaction lente

⚡ **Mon jugement :** ${this.getRandomVerdict()}

💀 L'action continue sans opposition...`;

        await this.sock.sendMessage(reactionData.chatId, { text: verdictMessage });
    }

    /**
     * Obtient un verdict aléatoire dans le style d'Erza
     */
    getRandomVerdict() {
        const verdicts = [
            "Un guerrier doit toujours rester vigilant !",
            "La lenteur en combat peut être fatale !",
            "Tu dois t'entraîner davantage !",
            "L'hésitation n'a pas sa place au combat !",
            "Seuls les forts survivent aux batailles !",
            "Tu as failli à tes responsabilités de combattant !",
            "Un vrai guerrier réagit par instinct !"
        ];
        return verdicts[Math.floor(Math.random() * verdicts.length)];
    }

    /**
     * Obtient les informations d'un personnage
     */
    async getCharacterInfo(playerId) {
        if (!this.gameEngine) return null;
        
        if (playerId.startsWith('npc_')) {
            return {
                name: `PNJ-${playerId.slice(-5)}`,
                powerLevel: 'G' // Par défaut pour PNJ
            };
        }
        
        try {
            return await this.gameEngine.dbManager.getCharacterByPlayer(playerId);
        } catch (error) {
            console.error('❌ Erreur récupération personnage:', error);
            return null;
        }
    }

    /**
     * Détermine si Frictia doit répondre à un message
     */
    shouldRespond(message, groupId, isDirectlyMentioned = false, groupName = '') {
        const now = Date.now();
        const lastTime = this.lastActivity.get(groupId) || 0;
        
        // Détecter si c'est un groupe taverne
        const isTaverneGroup = this.isTaverneGroup(groupName);
        
        // Si mentionnée directement, toujours répondre (sauf si trop récent)
        if (isDirectlyMentioned) {
            return (now - lastTime) > 3000; // 3 secondes minimum pour les mentions
        }

        // Dans les groupes taverne, Frictia est TRÈS active
        if (isTaverneGroup) {
            const timeSinceLastResponse = now - lastTime;
            // Répondre plus fréquemment dans les tavernes (10 secondes au lieu de 20)
            if (timeSinceLastResponse < 10000) {
                return false;
            }
            // 60% de chance de répondre dans les tavernes
            return Math.random() < 0.6;
        }

        // Sinon, répondre occasionnellement selon des critères
        const timeSinceLastResponse = now - lastTime;
        
        // Ne pas répondre si trop récent
        if (timeSinceLastResponse < this.minIntervalBetweenMessages) {
            return false;
        }

        // Mots déclencheurs inspirés d'Erza Scarlet
        const triggerWords = [
            'frictia', 'erza', 'scarlet', 'force', 'courage', 'combat', 'protection',
            'justice', 'honneur', 'loyauté', 'ami', 'amie', 'aide', 'conseil',
            'motivation', 'fort', 'brave', 'guerrier', 'magie', 'armure',
            'fairy', 'tail', 'anime', 'manga', 'déterminé', 'discipline'
        ];

        const lowerMessage = message.toLowerCase();
        const containsTrigger = triggerWords.some(word => lowerMessage.includes(word));
        
        // Erza est plus proactive que l'ancienne Frictia
        if (containsTrigger) {
            return Math.random() < 0.8; // 80% de chance si mot-clé
        }

        // Questions ou demandes d'aide
        if (lowerMessage.includes('?') || lowerMessage.includes('help') || lowerMessage.includes('aide')) {
            return Math.random() < 0.9; // 90% de chance pour les questions
        }

        // Réponse spontanée plus fréquente (comme Erza qui veille sur ses amis)
        return Math.random() < 0.15; // 15% de chance pour engagement spontané
    }

    /**
     * Génère une réponse de Frictia
     */
    async generateResponse(message, groupName, userName, conversationContext = []) {
        try {
            // Construire le contexte de la conversation
            const contextMessages = conversationContext.slice(-5); // 5 derniers messages max
            const contextString = contextMessages.length > 0 
                ? `\nContexte récent de la conversation:\n${contextMessages.map(msg => `${msg.user}: ${msg.message}`).join('\n')}`
                : '';

            // Détecter si c'est un groupe taverne
            const isTaverneGroup = this.isTaverneGroup(groupName);
            
            const prompt = `Tu es Frictia, une IA avec la personnalité d'Erza Scarlet de Fairy Tail. Tu participes aux discussions WhatsApp comme une amie loyale et protectrice.

**Ta personnalité (Erza Scarlet):**
- Forte, déterminée et courageuse comme une guerrière
- Loyale et protectrice envers tes amis
- Stricte mais juste, tu valorises la discipline
- Directe dans tes paroles, tu ne mâches pas tes mots
- Tu caches un cœur chaleureux derrière ton armure
- Tu respectes ceux qui travaillent dur et font des efforts
- Tu détestes l'injustice et protèges les faibles
- Tu utilises des émojis liés à la force: ⚔️ 🛡️ ✨ 💪 🔥 ⭐

**Contexte:**
- Groupe: ${groupName}${isTaverneGroup ? ' (TAVERNE - lieu de discussion des joueurs)' : ''}
- Utilisateur: ${userName}
- Message: "${message}"${contextString}

**Instructions:**
- Réponds comme Erza Scarlet le ferait - avec force et bienveillance
${isTaverneGroup ? '- Tu es dans une TAVERNE, sois plus sociable et accueillante avec les joueurs\n- Encourage les discussions entre joueurs et crée une ambiance conviviale\n- Tu peux poser des questions pour animer la conversation' : ''}
- Sois directe mais encourageante
- Utilise un langage noble mais accessible
- Offre ton aide et ta protection si nécessaire
- Encourage la personne à être forte et déterminée
- Garde tes réponses courtes (2-3 phrases max)
- Utilise les émojis d'Erza avec parcimonie mais de façon pertinente
- Si c'est une question, réponds avec assurance et sagesse

Réponds uniquement avec le message de Frictia/Erza, sans préfixe ni explication:`;

            const response = await this.groqClient.generateNarration(prompt, 150);

            if (!response || response.trim().length === 0) {
                return this.getRandomFallbackResponse();
            }

            return response.trim();

        } catch (error) {
            console.error('❌ Erreur génération réponse Frictia:', error);
            return this.getRandomFallbackResponse();
        }
    }

    /**
     * Réponses de secours dans le style d'Erza Scarlet
     */
    getRandomFallbackResponse() {
        const erzaFallbacks = [
            "Ta détermination me rappelle celle d'un vrai guerrier ! ⚔️",
            "Je respecte ta façon de voir les choses. Continue ainsi ! 💪",
            "Intéressant... Tu as l'esprit d'un tacticien ✨",
            "Cette réflexion montre ta force intérieure 🛡️",
            "Tu poses les bonnes questions. C'est le signe d'un esprit fort ! 🔥",
            "J'apprécie ton courage à aborder ce sujet ⭐",
            "Tu as raison de chercher à comprendre. La connaissance est une arme puissante 💎",
            "Ton point de vue honore ta sagesse ! 🌟"
        ];
        
        return erzaFallbacks[Math.floor(Math.random() * erzaFallbacks.length)];
    }

    /**
     * Détecte si un groupe est une taverne
     */
    isTaverneGroup(groupName) {
        if (!groupName) return false;
        
        const taverneKeywords = [
            'taverne', 'tavern', 'chat', 'discussion', 'bar', 'auberge',
            'inn', 'pub', 'cafe', 'salon', 'lounge', 'gathering'
        ];
        
        const normalizedName = groupName.toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
            .replace(/[^a-z0-9\s]/g, ''); // Supprime les caractères spéciaux
        
        return taverneKeywords.some(keyword => normalizedName.includes(keyword));
    }

    /**
     * Génère un sticker Erza aléatoire
     */
    getRandomErzaSticker() {
        return this.erzaStickers[Math.floor(Math.random() * this.erzaStickers.length)];
    }

    /**
     * Obtient une image d'avatar d'Erza
     */
    getErzaAvatar() {
        return this.erzaAvatars[Math.floor(Math.random() * this.erzaAvatars.length)];
    }

    /**
     * Traite les commandes spéciales de Frictia/Erza
     */
    async handleCommand(command, userName) {
        const cmd = command.toLowerCase().replace('/', '').replace('!', '');
        
        switch(cmd) {
            case 'aide':
            case 'help':
                return `Salut ${userName} ! Je suis Frictia, ton amie guerrière ! ⚔️
                
Commandes disponibles:
• /motivation - Reçois un message motivant
• /conseil - Demande un conseil d'Erza
• /force - Citation sur la force intérieure
• /avatar - Voir mon apparence d'Erza
• /sticker - Sticker Erza aléatoire

Je peux aussi discuter de tout - pose-moi tes questions ! 💪`;

            case 'motivation':
                const motivations = [
                    "La force ne vient pas du corps, mais de la volonté ! 💪 Ne l'oublie jamais !",
                    "Même si le chemin est difficile, continues d'avancer. C'est ça, l'esprit d'un guerrier ! ⚔️",
                    "Tes amis croient en toi, alors crois en toi aussi ! Tu es plus fort que tu ne le penses ! ✨",
                    "L'échec n'existe que si tu abandonnes. Relève-toi et bats-toi ! 🔥",
                    "L'honneur ne se trouve pas dans la victoire, mais dans la façon dont tu te bats ! 🛡️"
                ];
                return motivations[Math.floor(Math.random() * motivations.length)];

            case 'conseil':
                const conseils = [
                    "Écoute ton cœur, mais laisse ta tête prendre les décisions importantes. ⭐",
                    "La discipline personnelle est la fondation de tous les succès. 💎",
                    "Protège ceux qui te sont chers, mais n'oublie pas de te protéger aussi. 🛡️",
                    "La vraie force, c'est savoir quand se battre et quand pardonner. 🌟",
                    "Ne laisse personne te dire que tu n'es pas assez fort. Tu définis tes propres limites ! 💪"
                ];
                return conseils[Math.floor(Math.random() * conseils.length)];

            case 'force':
            case 'courage':
                return `"La magie n'est pas déterminée par la naissance. Elle provient du cœur." ✨
                
Cette citation me guide chaque jour. Ta force véritable vient de l'intérieur ! ⚔️`;

            case 'avatar':
            case 'erza':
                return `Je suis Erza Scarlet, la guerrière écarlate ! ⚔️
                
Mon armure change selon mes besoins, mais ma détermination reste inébranlable.
Je protège mes amis avec ma vie ! 🛡️✨`;

            case 'sticker':
                return this.getRandomErzaSticker();

            case 'profil':
                return `👑 **Frictia** (Erza Scarlet)
⚔️ Rôle: Guerrière protectrice & Modératrice de combat
🛡️ Spécialité: Magie de réquipement & Surveillance des réactions
💪 Devise: "La force vient du cœur"
✨ Guilde: Tes amis WhatsApp !
🏛️ Rang: Administrateur de Combat`;

            case 'combat_status':
                return this.getCombatStatus();

            case 'reactions':
                return this.getActiveReactions();

            case 'timers':
                return this.getTimerStatus();

            case 'verdict':
                if (!this.reactionTimeManager) return "❌ Système de combat non disponible";
                return `⚔️ **Verdicts de Frictia disponibles** ⚔️
                
Je surveille tous les combats et délivre des verdicts justes !
💪 Mon rôle : Assurer que chaque guerrier respecte son temps de réaction
🛡️ Justice : Aucune faveur, seule la rapidité compte !`;

            case 'force_reaction':
                return `⚡ **Force de réaction** ⚡
                
En tant qu'Erza, je peux forcer une réaction si nécessaire.
⚔️ Utilise cette commande en cas de problème technique
🛡️ Seuls les vrais problèmes justifient cette intervention !`;

            default:
                return null;
        }
    }

    /**
     * Ajoute un message au contexte de conversation
     */
    addToConversationHistory(groupId, userName, message) {
        if (!this.conversationHistory.has(groupId)) {
            this.conversationHistory.set(groupId, []);
        }

        const history = this.conversationHistory.get(groupId);
        history.push({
            user: userName,
            message: message,
            timestamp: Date.now()
        });

        // Garder seulement les messages récents
        if (history.length > this.maxHistoryPerGroup) {
            history.shift();
        }
    }

    /**
     * Obtient le contexte de conversation pour un groupe
     */
    getConversationContext(groupId) {
        return this.conversationHistory.get(groupId) || [];
    }

    /**
     * Met à jour la dernière activité de Frictia dans un groupe
     */
    updateLastActivity(groupId) {
        this.lastActivity.set(groupId, Date.now());
    }

    /**
     * Nettoie les anciennes données pour économiser la mémoire
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures

        // Nettoyer l'historique des conversations
        for (const [groupId, history] of this.conversationHistory.entries()) {
            const recentHistory = history.filter(msg => (now - msg.timestamp) < maxAge);
            if (recentHistory.length === 0) {
                this.conversationHistory.delete(groupId);
            } else {
                this.conversationHistory.set(groupId, recentHistory);
            }
        }

        // Nettoyer les timestamps d'activité
        for (const [groupId, timestamp] of this.lastActivity.entries()) {
            if ((now - timestamp) > maxAge) {
                this.lastActivity.delete(groupId);
            }
        }

        console.log(`🧹 Frictia: Nettoyage effectué - ${this.conversationHistory.size} groupes actifs`);
    }

    /**
     * Obtient le statut des combats actifs
     */
    getCombatStatus() {
        if (!this.reactionTimeManager) {
            return "❌ Système de combat non connecté";
        }

        const activeReactions = this.reactionTimeManager.activeReactions;
        if (activeReactions.size === 0) {
            return `⚔️ **Statut des combats** ⚔️

🕊️ Aucun combat actif en ce moment
✨ Tous les guerriers sont en paix
🛡️ Je veille toujours sur vous !`;
        }

        let status = `⚔️ **Combats actifs surveillés par Frictia** ⚔️\n\n`;
        for (const [actionId, data] of activeReactions.entries()) {
            const timeLeft = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
            status += `🗡️ Combat ${actionId.slice(-6)}\n`;
            status += `   ⏰ Temps restant: ${timeLeft}s\n`;
            status += `   🎯 Action: ${data.actionDescription}\n\n`;
        }

        return status;
    }

    /**
     * Obtient les réactions actives
     */
    getActiveReactions() {
        if (!this.reactionTimeManager) {
            return "❌ Système de réaction non connecté";
        }

        const activeCount = this.reactionTimeManager.activeReactions.size;
        return `🛡️ **Réactions surveillées** 🛡️

📊 Réactions actives: ${activeCount}
⚔️ En tant qu'Erza, je supervise chaque temps de réaction
💪 Aucun guerrier ne peut échapper à ma vigilance !

${activeCount > 0 ? '⏰ Comptes à rebours en cours...' : '✨ Tous les guerriers sont prêts !'}`;
    }

    /**
     * Obtient le statut des timers
     */
    getTimerStatus() {
        if (!this.reactionTimeManager) {
            return "❌ Timers non disponibles";
        }

        const reactionTimes = this.reactionTimeManager.reactionTimes;
        let status = `⏰ **Temps de réaction par rang** ⏰\n\n`;
        
        for (const [rank, time] of Object.entries(reactionTimes)) {
            const seconds = Math.floor(time / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            let timeDisplay = minutes > 0 ? 
                `${minutes}m ${remainingSeconds}s` : 
                `${seconds}s`;
                
            status += `⚔️ **${rank}**: ${timeDisplay}\n`;
        }

        status += `\n💪 Plus tu es fort, moins tu as de temps !`;
        return status;
    }

    /**
     * Démarre la surveillance automatique des combats
     */
    startCombatMonitoring() {
        // Surveillance toutes les 2 secondes
        setInterval(() => {
            this.monitorReactionTimes();
        }, 2000);
        
        console.log('⚔️ Frictia: Surveillance des combats activée');
    }
}

module.exports = FrictiaAI;