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
            'profil', 'avatar', 'sticker', 'erza', 'frictia'
        ];
    }

    /**
     * Détermine si Frictia doit répondre à un message
     */
    shouldRespond(message, groupId, isDirectlyMentioned = false) {
        const now = Date.now();
        const lastTime = this.lastActivity.get(groupId) || 0;
        
        // Si mentionnée directement, toujours répondre (sauf si trop récent)
        if (isDirectlyMentioned) {
            return (now - lastTime) > 5000; // 5 secondes minimum
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
- Groupe: ${groupName}
- Utilisateur: ${userName}
- Message: "${message}"${contextString}

**Instructions:**
- Réponds comme Erza Scarlet le ferait - avec force et bienveillance
- Sois directe mais encourageante
- Utilise un langage noble mais accessible
- Offre ton aide et ta protection si nécessaire
- Encourage la personne à être forte et déterminée
- Garde tes réponses courtes (2-3 phrases max)
- Utilise les émojis d'Erza avec parcimonie mais de façon pertinente
- Si c'est une question, réponds avec assurance et sagesse

Réponds uniquement avec le message de Frictia/Erza, sans préfixe ni explication:`;

            const response = await this.groqClient.generateText(prompt, {
                maxTokens: 150,
                temperature: 0.8
            });

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
⚔️ Rôle: Guerrière protectrice
🛡️ Spécialité: Magie de réquipement
💪 Devise: "La force vient du cœur"
✨ Guilde: Tes amis WhatsApp !`;

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
}

module.exports = FrictiaAI;