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

    getRecentMemory(sessionId) {
        return this.sessionMemory.get(sessionId) || [];
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

    async generateNarration(prompt, maxTokens = 80) {
        if (!this.hasValidClient()) {
            throw new Error('Client Groq non disponible');
        }

        try {
            const response = await this.client.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Tu es un narrateur RPG ULTRA-CONCIS. 
                        Génère EXACTEMENT 1-2 phrases COURTES en français.
                        INTERDICTION de décrire les détails d'équipement, inventaire, vapeur, engrenages.
                        Style: Action directe → conséquence immédiate. Point final.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                model: this.model,
                max_tokens: maxTokens,
                temperature: 0.6,
                top_p: 0.8,
                frequency_penalty: 0.5,
                presence_penalty: 0.3
            });

            const narration = response.choices[0]?.message?.content?.trim();
            if (!narration) {
                throw new Error('Réponse vide de Groq');
            }

            console.log('✅ Narration courte générée avec Groq');
            return narration;
        } catch (error) {
            console.error('❌ Erreur génération narration Groq:', error.message);
            throw error;
        }
    }

    async generateCombatNarration(combatData, maxTokens = 100) {
        // Logique pour la continuité des actions et la gestion des PV en combat
        let actionDescription = `Le combat entre ${combatData.attacker} et ${combatData.defender} continue.`;
        if (combatData.action) {
            actionDescription = `Action de ${combatData.attacker} : ${combatData.action}.`;
        }

        let damageInfo = '';
        if (combatData.damage !== undefined && combatData.damage !== null) {
            damageInfo = `Dégâts infligés : ${combatData.damage}.`;
            // Vérifier si la mort survient sans combat explicite
            if (combatData.attacker === combatData.defender && combatData.damage > 0 && combatData.result === 'mort' && !combatData.action) {
                 actionDescription += " La mort semble survenir de manière inexpliquée sans action directe.";
            } else if (combatData.result === 'mort') {
                actionDescription += ` ${combatData.defender} est vaincu.`;
            }
        }
        
        const prompt = `Décris cette action de combat RPG dans un monde médiéval-steampunk :
        Attaquant: ${combatData.attacker} (Niveau ${combatData.attackerLevel})
        Défenseur: ${combatData.defender} (Niveau ${combatData.defenderLevel})
        ${actionDescription}
        ${damageInfo}
        Résultat général: ${combatData.result || 'Aucun résultat spécifié'}

        Contexte: Combat rapide dans un monde médiéval-steampunk.
        Style: Court et direct, 2 phrases maximum.`;

        try {
            const narration = await this.generateNarration(prompt, maxTokens);
            this.addToMemory(combatData.sessionId || "default", "combat_action", `${combatData.attacker} vs ${combatData.defender}: ${combatData.action} (${combatData.damage} dmg, ${combatData.result})`);
            return narration;
        } catch (error) {
            console.error('❌ Erreur génération narration combat Groq:', error.message);
            throw error;
        }
    }

    async generateExplorationNarration(location, action, sessionId = "default", character = null, maxTokens = 200) {
        const locationContinuity = this.getLocationContinuity(sessionId, location);

        const prompt = `Décris cette action RPG en 2 phrases courtes et directes:
        Lieu: ${location}
        Action: ${action}

        ${locationContinuity}

        RÈGLES STRICTES:
        1. MAXIMUM 2 phrases courtes
        2. Pas de descriptions d'équipement/inventaire
        3. Action directe et conséquences immédiates
        4. Style Dark Souls - dangereux mais concis
        5. Évite les détails inutiles sur la vapeur, engrenages, etc.

        Réponds de façon TRÈS concise:`;

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

    async generateDialogueResponse(character, playerMessage, sessionId = "default") {
        if (!this.hasValidClient()) {
            // Si le client Groq n'est pas disponible, retournez une réponse par défaut.
            return "Le PNJ vous regarde en silence.";
        }

        try {
            const prompt = this.buildDialoguePrompt(character, playerMessage);

            const messages = this.getRecentMemory(sessionId);
            messages.push({
                role: "user",
                content: prompt
            });

            // Utiliser le client Groq pour générer la réponse
            const completion = await this.client.chat.completions.create({
                messages,
                model: "llama-3.1-70b-versatile", // Ou un autre modèle approprié pour les dialogues
                max_tokens: 300,
                temperature: 0.8
            });

            const dialogueResponse = completion.choices[0].message.content;

            // Sauvegarder la conversation dans la mémoire
            this.addToMemory(sessionId, "user", prompt); // Sauvegarde le prompt complet pour le contexte
            this.addToMemory(sessionId, "assistant", dialogueResponse);

            return dialogueResponse;
        } catch (error) {
            console.error('❌ Erreur génération dialogue Groq:', error);
            // Fournir une réponse de repli en cas d'erreur
            return "Le PNJ semble distrait et ne répond pas clairement.";
        }
    }

    buildDialoguePrompt(character, playerMessage) {
        // Construction du prompt pour les dialogues avec les PNJ
        return `Tu es un PNJ du royaume ${character.kingdom} dans le monde de Friction Ultimate.

CONTEXTE:
- Tu interagis avec ${character.name}, ${character.gender === 'male' ? 'un homme' : 'une femme'} du royaume ${character.kingdom}
- Niveau de puissance: ${character.powerLevel}
- Lieu actuel du PNJ: ${character.currentLocation}
- Message du joueur: "${playerMessage}"

INSTRUCTIONS:
- Réponds comme un habitant du royaume ${character.kingdom}
- Reste dans l'ambiance médiévale-technologique
- Sois naturel et authentique (2-3 phrases max)
- Intègre des éléments du lieu et du royaume
- Français fluide et immersif

Génère UNIQUEMENT la réponse du PNJ, rien d'autre:`;
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