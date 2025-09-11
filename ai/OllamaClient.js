const ollama = require('ollama');

class OllamaClient {
    constructor() {
        this.isAvailable = false;
        this.model = 'llama3.2-vision';
        this.initializeClient();
    }

    async initializeClient() {
        try {
            // Ollama n'est pas compatible avec l'environnement Replit
            // Utilisation d'une API externe compatible ou fallback
            console.log('⚠️ Ollama non compatible avec Replit - utilisation alternative en développement');
            this.isAvailable = false;
        } catch (error) {
            console.log('⚠️ Ollama non disponible - environnement non compatible');
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isAvailable;
    }

    async generateNarration(context, action, character) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Ollama non disponible');
            }

            const prompt = this.buildNarrationPrompt(context, action, character);
            console.log('🎭 Génération de narration avec Ollama...');

            const response = await ollama.chat({
                model: this.model,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                options: {
                    temperature: 0.8,
                    max_tokens: 200
                }
            });

            const narration = response.message.content.trim();
            console.log('✅ Narration générée avec Ollama');
            return narration;

        } catch (error) {
            console.error('❌ Erreur Ollama narration:', error.message);
            throw error;
        }
    }

    async analyzeImage(imagePath, prompt = "Describe what you see in this image") {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Ollama non disponible');
            }

            console.log('👁️ Analyse d\'image avec Ollama Vision...');

            const response = await ollama.chat({
                model: this.model,
                messages: [{
                    role: 'user',
                    content: prompt,
                    images: [imagePath]
                }]
            });

            const analysis = response.message.content.trim();
            console.log('✅ Image analysée avec Ollama Vision');
            return analysis;

        } catch (error) {
            console.error('❌ Erreur Ollama vision:', error.message);
            throw error;
        }
    }

    buildNarrationPrompt(context, action, character) {
        return `Tu es un narrateur immersif pour un RPG médiéval-technologique steampunk appelé "Friction Ultimate".

CONTEXTE:
- Personnage: ${character.name}, ${character.gender === 'male' ? 'homme' : 'femme'} du royaume ${character.kingdom}
- Niveau de puissance: ${character.powerLevel}
- Localisation: ${character.currentLocation}
- Action du joueur: "${action}"

INSTRUCTIONS:
- Créer une narration courte (2-3 phrases max) 
- Style immersif et cinématographique
- Ambiance steampunk médiévale
- Descriptions vivantes et engageantes
- Français fluide et naturel
- PAS de dialogue, juste de la narration

Exemple de style souhaité: "Les engrenages de cuivre résonnent sous tes pas tandis que tu traverses la place centrale. Les vapeurs s'échappent des conduites au-dessus de ta tête, créant une brume mystérieuse autour des tours de pierre."

Génère UNIQUEMENT la narration, rien d'autre:`;
    }

    async generateActionAnalysis(action, character) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Ollama non disponible');
            }

            const prompt = `Analyse cette action de RPG et détermine:
1. Le type d'action (exploration, combat, interaction, repos, etc.)
2. Le niveau de risque (low, medium, high, extreme)
3. Le coût en énergie (1-20)

Personnage: ${character.name} (niveau ${character.powerLevel})
Action: "${action}"

Réponds UNIQUEMENT au format JSON:
{
  "actionType": "type",
  "riskLevel": "niveau",
  "energyCost": nombre
}`;

            const response = await ollama.chat({
                model: this.model,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                options: {
                    temperature: 0.3
                }
            });

            const analysis = JSON.parse(response.message.content.trim());
            return analysis;

        } catch (error) {
            console.error('❌ Erreur analyse action Ollama:', error.message);
            // Fallback basique
            return {
                actionType: "exploration",
                riskLevel: "low", 
                energyCost: 5
            };
        }
    }
}

module.exports = OllamaClient;