const Groq = require('groq-sdk');

class GroqClient {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        this.client = null;
        this.isAvailable = false;
        this.model = 'llama-3.3-70b-versatile'; // Modèle Groq récent pour la narration
        this.initializeClient();
    }

    async initializeClient() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ GROQ_API_KEY non définie - Groq indisponible');
                this.isAvailable = false;
                return;
            }

            this.client = new Groq({
                apiKey: this.apiKey,
                timeout: 15000 // Timeout de 15 secondes pour des réponses rapides
            });

            // Test de connexion
            await this.client.chat.completions.create({
                messages: [{ role: 'user', content: 'Test' }],
                model: this.model,
                max_tokens: 10
            });

            this.isAvailable = true;
            console.log('✅ GroqClient initialisé avec succès - Ultra-rapide pour narration');
        } catch (error) {
            console.log('⚠️ Erreur d\'initialisation Groq:', error.message);
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isAvailable && this.client;
    }

    async generateNarration(prompt, maxTokens = 300) {
        if (!this.hasValidClient()) {
            throw new Error('Client Groq non disponible');
        }

        try {
            const response = await this.client.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Tu es un narrateur expert de jeux RPG médiéval-steampunk. 
                        Génère des descriptions immersives et captivantes en français.
                        Style: Épique, détaillé, avec des éléments technologiques steampunk.
                        Ton: Dramatique mais accessible, comme un conteur professionnel.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                model: this.model,
                max_tokens: maxTokens,
                temperature: 0.8, // Créativité élevée pour narration
                top_p: 0.9,
                frequency_penalty: 0.3, // Éviter les répétitions
                presence_penalty: 0.2
            });

            const narration = response.choices[0]?.message?.content?.trim();
            if (!narration) {
                throw new Error('Réponse vide de Groq');
            }

            console.log('✅ Narration générée avec Groq (ultra-rapide)');
            return narration;
        } catch (error) {
            console.error('❌ Erreur génération narration Groq:', error.message);
            throw error;
        }
    }

    async generateCombatNarration(combatData, maxTokens = 250) {
        const prompt = `Décris cette action de combat RPG:
        Attaquant: ${combatData.attacker} (Niveau ${combatData.attackerLevel})
        Défenseur: ${combatData.defender} (Niveau ${combatData.defenderLevel})
        Action: ${combatData.action}
        Dégâts: ${combatData.damage}
        Résultat: ${combatData.result}
        
        Contexte: Combat épique dans un monde médiéval-steampunk avec magie et technologie.`;

        return await this.generateNarration(prompt, maxTokens);
    }

    async generateExplorationNarration(location, action, maxTokens = 300) {
        const prompt = `Décris cette exploration dans un monde RPG:
        Lieu: ${location}
        Action du joueur: ${action}
        
        Contexte: Monde médiéval-steampunk avec 12 royaumes, magie, technologie à vapeur, 
        créatures fantastiques et aventures épiques.`;

        return await this.generateNarration(prompt, maxTokens);
    }

    async generateCharacterCreationNarration(characterData, maxTokens = 200) {
        const prompt = `Décris la création de ce nouveau héros:
        Nom: ${characterData.name}
        Classe: ${characterData.class}
        Royaume d'origine: ${characterData.kingdom}
        
        Contexte: Nouvelle aventure dans un monde RPG médiéval-steampunk épique.`;

        return await this.generateNarration(prompt, maxTokens);
    }
}

module.exports = GroqClient;