
const path = require('path');
const fs = require('fs').promises;

class OgunGuide {
    constructor(groqClient) {
        this.groqClient = groqClient;
        this.name = "Ogun Montgomery";
        this.personality = "Énergique, loyal, passionné par les armes à feu et la technologie. Toujours prêt à aider ses amis.";
        this.stickers = [
            'https://via.placeholder.com/200x200/FF4500/FFFFFF?text=🔥+OGUN',
            'https://via.placeholder.com/200x200/FF6347/FFFFFF?text=⚔️+FIRE',
            'https://via.placeholder.com/200x200/DC143C/FFFFFF?text=💪+FORCE',
            'https://via.placeholder.com/200x200/B22222/FFFFFF?text=🎯+READY',
            'https://via.placeholder.com/200x200/8B0000/FFFFFF?text=⚡+ENERGY'
        ];
        this.responses = [
            "🔥 Yo ! Besoin d'aide avec ton équipement ?",
            "⚔️ Tu veux que je t'explique les armes de Friction Ultimate ?",
            "💪 Allez, on va faire chauffer la friction !",
            "🎯 Prêt pour l'action ? Je suis ton homme !",
            "🛠️ Les mécaniques du jeu te posent problème ?",
            "🔥 Fire Force style ! Qu'est-ce qui te préoccupe ?",
            "⚡ L'énergie c'est la vie ! Comment je peux t'aider ?",
            "🏰 Tu veux explorer les royaumes ? Je connais bien !",
            "⚔️ Combat, exploration, magie... je gère tout !",
            "🎮 Friction Ultimate n'aura plus de secrets pour toi !"
        ];
    }

    async getGuideResponse(question, sessionId = "guide") {
        try {
            // Sélectionner un sticker aléatoire
            const randomSticker = this.stickers[Math.floor(Math.random() * this.stickers.length)];
            const randomResponse = this.responses[Math.floor(Math.random() * this.responses.length)];

            // Détecter si c'est juste une mention du nom d'Ogun
            const normalizedQuestion = question.toLowerCase().trim();
            const isJustMention = normalizedQuestion === 'ogun' || 
                                normalizedQuestion === 'montgomery' ||
                                normalizedQuestion === '@ogun' ||
                                normalizedQuestion.includes('salut ogun') ||
                                normalizedQuestion.includes('hey ogun');

            let response = randomResponse;
            
            if (isJustMention) {
                // Réponses spéciales quand on l'appelle juste par son nom
                const greetingResponses = [
                    "🔥 Yo ! Tu m'as appelé ? Je suis là pour t'aider !",
                    "💪 Salut ! Ogun Montgomery à ton service !",
                    "⚔️ Fire Force style ! Qu'est-ce que tu veux savoir ?",
                    "🎯 Tu as besoin de conseils ? Je suis ton homme !",
                    "🔥 Présent ! Prêt à faire chauffer la friction !",
                    "💥 Ogun Montgomery ici ! Comment je peux t'aider ?",
                    "🛠️ Hey ! Besoin d'aide avec ton équipement ?",
                    "⚡ Yo ! L'expert en armes est là !"
                ];
                response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
            } else if (this.groqClient && this.groqClient.hasValidClient()) {
                try {
                    const groqPrompt = `Tu es Ogun Montgomery de Fire Force, maintenant guide dans Friction Ultimate. 
                    Réponds à cette question de manière énergique et utile en 1-2 phrases maximum:
                    
                    Question: "${question}"
                    
                    Règles:
                    - Reste dans le personnage d'Ogun (énergique, loyal, expert en armes)
                    - Donne des conseils pratiques sur le jeu
                    - Utilise des emojis 🔥⚔️💪🎯
                    - Sois bref et direct`;

                    response = await this.groqClient.generateNarration(groqPrompt, 100);
                } catch (groqError) {
                    console.log('⚠️ Groq indisponible, utilisation réponse prédéfinie');
                }
            }

            return {
                text: `🔥 **OGUN MONTGOMERY** 🔥\n\n${response}`,
                sticker: randomSticker,
                isGuide: true
            };

        } catch (error) {
            console.error('❌ Erreur guide Ogun:', error);
            return {
                text: "🔥 Yo ! Je suis Ogun, ton guide ! Pose-moi tes questions sur Friction Ultimate !",
                sticker: this.stickers[0],
                isGuide: true
            };
        }
    }

    async getHelpMenu() {
        return {
            text: `🔥 **OGUN MONTGOMERY - MENU D'AIDE** 🔥

⚔️ **COMMANDES PRINCIPALES:**
• /créer - Créer un personnage
• /profil - Voir ton profil
• /royaumes - Liste des 12 royaumes
• /ordres - Les 7 ordres mystérieux
• /combat - Système de combat
• /map - Carte du monde

🎯 **QUESTIONS FRÉQUENTES:**
• "Comment commencer ?" - Guide débutant
• "Comment me battre ?" - Mécaniques de combat
• "Où aller ?" - Exploration et lieux
• "Comment progresser ?" - Système de niveaux

💪 **CONSEILS D'OGUN:**
• Sois précis dans tes actions !
• Gère bien ton énergie ⚡
• Choisis ton équipement avec soin 🛠️
• L'union fait la force ! 🤝

🔥 **Pose-moi n'importe quelle question, je suis là pour t'aider !**`,
            sticker: this.stickers[2],
            isGuide: true
        };
    }

    getRandomSticker() {
        return this.stickers[Math.floor(Math.random() * this.stickers.length)];
    }
}

module.exports = OgunGuide;
