const Groq = require('groq-sdk');

class GroqClient {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        this.client = null;
        this.isAvailable = false;
        this.model = 'llama-3.3-70b-versatile'; // Modèle Groq récent pour la narration
        this.sessionMemory = new Map(); // sessionId => [{role, content, timestamp, location}]
        this.maxMemoryPerSession = 12; // Mémoire plus longue pour Groq
        this.initializeClient();
    }

    addToMemory(sessionId, role, content, location = null) {
        if (!this.sessionMemory.has(sessionId)) {
            this.sessionMemory.set(sessionId, []);
        }
        const memories = this.sessionMemory.get(sessionId);
        memories.push({ 
            role, 
            content, 
            location, 
            timestamp: Date.now() 
        });
        
        // Limiter la taille mémoire
        if (memories.length > this.maxMemoryPerSession) {
            memories.splice(0, memories.length - this.maxMemoryPerSession);
        }
        this.sessionMemory.set(sessionId, memories);
    }

    getLocationContinuity(sessionId, currentLocation) {
        const memories = this.sessionMemory.get(sessionId) || [];
        const locationMemories = memories.filter(m => m.location === currentLocation);
        
        if (locationMemories.length > 0) {
            return `Le personnage est dans ${currentLocation} depuis plusieurs actions. Contexte précédent dans ce lieu: ${locationMemories.slice(-3).map(m => m.content).join('; ')}`;
        }
        return `Première fois dans ${currentLocation} selon la mémoire.`;
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

    async generateNarration(prompt, maxTokens = 800) {
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

    async generateCombatNarration(combatData, maxTokens = 600) {
        const prompt = `Décris cette action de combat RPG:
        Attaquant: ${combatData.attacker} (Niveau ${combatData.attackerLevel})
        Défenseur: ${combatData.defender} (Niveau ${combatData.defenderLevel})
        Action: ${combatData.action}
        Dégâts: ${combatData.damage}
        Résultat: ${combatData.result}
        
        Contexte: Combat épique dans un monde médiéval-steampunk avec magie et technologie.`;

        return await this.generateNarration(prompt, maxTokens);
    }

    async generateExplorationNarration(location, action, sessionId = "default", character = null, maxTokens = 1000) {
        const locationContinuity = this.getLocationContinuity(sessionId, location);
        
        // Construire des informations détaillées sur le personnage
        let characterContext = '';
        if (character) {
            const equipmentList = character.equipment && Object.keys(character.equipment).length > 0 ? 
                Object.entries(character.equipment).map(([slot, item]) => `${slot}: ${item}`).join(', ') : 
                'aucun équipement';
            
            const inventoryList = character.inventory && character.inventory.length > 0 ? 
                character.inventory.slice(0, 5).join(', ') + (character.inventory.length > 5 ? '...' : '') : 
                'inventaire vide';

            characterContext = `
État du personnage ${character.name}:
- Niveau: ${character.level} | Puissance: ${character.powerLevel} | Friction: ${character.frictionLevel}
- Vie: ${character.currentLife}/${character.maxLife} | Énergie: ${character.currentEnergy}/${character.maxEnergy}
- Argent: ${character.coins} pièces d'or
- Équipement: ${equipmentList}
- Inventaire: ${inventoryList}
- Royaume: ${character.kingdom} | Ordre: ${character.order || 'Aucun'}`;
        }
        
        const prompt = `Décris cette exploration dans un monde RPG Dark Souls médiéval-steampunk:
        Lieu: ${location}
        Action du joueur: ${action}
        
        ${locationContinuity}${characterContext}
        
        RÈGLES DE NARRATION:
        1. Le personnage est DÉJÀ dans ce lieu. Ne dis pas qu'il "arrive" sauf si l'action le précise
        2. Décris 4-6 phrases immersives et détaillées
        3. Référence l'équipement et l'inventaire quand pertinent à l'action
        4. Mentionne des conséquences sur l'inventaire/équipement si applicable  
        5. Style sombre et dangereux comme Dark Souls
        6. Intègre technologie steampunk (engrenages, vapeur, mécanismes)
        7. Le monde réagit de manière hostile et impitoyable
        8. IMPORTANT: Fais interagir les objets portés avec l'environnement
        
        Contexte: Friction Ultimate - Monde où chaque action peut être fatale, fusion magie/technologie, 
        12 royaumes hostiles, survie difficile, système de friction implacable.`;

        try {
            const narration = await this.generateNarration(prompt, maxTokens);
            
            // Ajouter à la mémoire
            this.addToMemory(sessionId, "user", `Action: ${action}`, location);
            this.addToMemory(sessionId, "assistant", narration, location);
            
            return narration;
        } catch (error) {
            console.error('❌ Erreur génération exploration Groq:', error.message);
            throw error;
        }
    }

    async generateCharacterCreationNarration(characterData, maxTokens = 200) {
        const prompt = `Décris la création de ce nouveau héros:
        Nom: ${characterData.name}
        Classe: ${characterData.class}
        Royaume d'origine: ${characterData.kingdom}
        
        Contexte: Nouvelle aventure dans un monde RPG médiéval-steampunk épique.`;

        return await this.generateNarration(prompt, maxTokens);
    }

    async generateOptimizedImagePrompt(context, maxTokens = 150) {
        if (!this.hasValidClient()) {
            throw new Error('Client Groq non disponible');
        }

        try {
            const response = await this.client.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Tu es un expert en prompts d'images IA pour Stable Diffusion/anime style.
                        Génère des prompts détaillés en anglais pour créer des images épiques.
                        Style: anime, fantasy RPG, steampunk, high quality, detailed.
                        Format: Descriptif précis avec tags artistiques.`
                    },
                    {
                        role: 'user',
                        content: `Crée un prompt d'image optimal pour cette scène RPG:
                        ${context}
                        
                        Inclus: style anime, fantasy, détails steampunk, qualité 8K, composition épique.`
                    }
                ],
                model: this.model,
                max_tokens: maxTokens,
                temperature: 0.7,
                top_p: 0.9
            });

            const prompt = response.choices[0]?.message?.content?.trim();
            if (!prompt) {
                throw new Error('Prompt vide de Groq');
            }

            console.log('✅ Prompt d\'image optimisé par Groq');
            return prompt;
        } catch (error) {
            console.error('❌ Erreur génération prompt image Groq:', error.message);
            throw error;
        }
    }
}

module.exports = GroqClient;