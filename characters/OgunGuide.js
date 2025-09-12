
const path = require('path');
const fs = require('fs').promises;

class OgunGuide {
    constructor(groqClient) {
        this.groqClient = groqClient;
        this.name = "Ogun Montgomery";
        this.personality = "Énergique, loyal, passionné par les armes à feu et la technologie. Toujours prêt à aider ses amis.";
        this.stickers = [
            'https://i.pinimg.com/564x/8c/3d/2f/8c3d2f5e4a6b8c9d0e1f2a3b4c5d6e7f.jpg',
            'https://i.pinimg.com/736x/1a/2b/3c/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.jpg',
            'https://i.pinimg.com/564x/5f/8e/9d/5f8e9d7c6b5a4f3e2d1c0b9a8f7e6d5c.jpg',
            'https://i.pinimg.com/736x/9e/8d/7c/9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4f.jpg',
            'https://i.pinimg.com/564x/3b/4c/5d/3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e.jpg'
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

            // Générer une réponse personnalisée avec Groq si disponible
            let response = randomResponse;
            
            if (this.groqClient && this.groqClient.hasValidClient()) {
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
                text: `🔥 **OGUN MONTGOMERY - GUIDE FRICTION ULTIMATE** 🔥\n\n${response}`,
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
