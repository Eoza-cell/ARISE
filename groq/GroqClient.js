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

    async generateNarration(prompt, maxTokens = 120) {
        if (!this.hasValidClient()) {
            throw new Error('Client Groq non disponible');
        }

        try {
            const response = await this.client.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Tu es un narrateur RPG HARDCORE et impitoyable comme Dark Souls.
                        
                        RÈGLES DE DIFFICULTÉ ABSOLUES:
                        - Chaque action a des CONSÉQUENCES RÉELLES et dangereuses
                        - Les ennemis sont INTELLIGENTS et adaptent leurs stratégies
                        - L'environnement est HOSTILE : pièges, embuscades, dangers naturels
                        - Les ressources sont RARES : nourriture, eau, équipement se dégradent
                        - Les erreurs sont PUNIES : mauvaises décisions = blessures/mort
                        - Pas de "chance du débutant" : le monde ne fait pas de cadeaux
                        
                        STYLE NARRATIF IMMERSIF:
                        1. Action du joueur → Réaction HOSTILE du monde
                        2. Dangers immédiats et conséquences graves
                        3. Ambiance oppressante et menaçante
                        4. PNJ méfiants, animaux agressifs, nature impitoyable
                        5. Chaque pas peut être le dernier
                        
                        Génère 3-4 phrases INTENSES en français.
                        Le monde de Friction Ultimate ne pardonne JAMAIS.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                model: this.model,
                max_tokens: maxTokens,
                temperature: 0.8,
                top_p: 0.9,
                frequency_penalty: 0.3,
                presence_penalty: 0.4
            });

            let narration = response.choices[0]?.message?.content?.trim();
            if (!narration) {
                throw new Error('Réponse vide de Groq');
            }

            // Limiter à 500 caractères sans couper les phrases
            if (narration.length > 500) {
                // Trouver la dernière phrase complète avant 500 caractères
                const lastSentenceEnd = narration.substring(0, 500).lastIndexOf('.');
                if (lastSentenceEnd > 300) { // Au moins 300 caractères pour avoir du contenu
                    narration = narration.substring(0, lastSentenceEnd + 1);
                } else {
                    // Si pas de point, couper à 497 et ajouter des points
                    narration = narration.substring(0, 497) + '...';
                }
            }

            console.log(`✅ Narration générée (${narration.length}/500 caractères)`);
            return narration;
        } catch (error) {
            console.error('❌ Erreur génération narration Groq:', error.message);
            throw error;
        }
    }

    async generateCombatNarration(combatData, maxTokens = 200) {
        // Logique pour la continuité des actions et la gestion des PV en combat
        let actionDescription = `Le combat intense entre ${combatData.attacker} et ${combatData.defender} se poursuit.`;
        if (combatData.action) {
            actionDescription = `Action de combat de ${combatData.attacker} : ${combatData.action}.`;
        }

        let damageInfo = '';
        if (combatData.damage !== undefined && combatData.damage !== null) {
            damageInfo = `Dégâts infligés : ${combatData.damage} points.`;
            // Vérifier si la mort survient sans combat explicite
            if (combatData.attacker === combatData.defender && combatData.damage > 0 && combatData.result === 'mort' && !combatData.action) {
                 actionDescription += " Une force inexpliquée semble drainer la vie du combattant.";
            } else if (combatData.result === 'mort') {
                actionDescription += ` ${combatData.defender} succombe à ses blessures.`;
            }
        }

        // Inclure l'apparence du personnage si disponible
        let characterDescription = '';
        if (combatData.characterImage) {
            characterDescription = `Apparence du combattant: ${combatData.characterImage}`;
        }

        const prompt = `Décris cette séquence de combat RPG HARDCORE dans un monde médiéval-steampunk impitoyable :
        
        ${characterDescription}
        Attaquant: ${combatData.attacker} (Niveau ${combatData.attackerLevel})
        Défenseur: ${combatData.defender} (Niveau ${combatData.defenderLevel})
        ${actionDescription}
        ${damageInfo}
        Résultat: ${combatData.result || 'Combat en cours'}

        EXIGENCES NARRATIVES:
        - Combat FLUIDE et RÉALISTE comme Dark Souls
        - Décris les mouvements, feintes, parades en détail
        - Utilise l'apparence physique du combattant
        - Ambiance steampunk avec engrenages, vapeur, métal
        - Conséquences physiques précises (sang, fatigue, douleur)
        - 4-6 phrases pour une narration immersive
        - Style cinématographique et brutal

        Génère la narration de combat détaillée:`;

        try {
            const narration = await this.generateNarration(prompt, maxTokens);
            this.addToMemory(combatData.sessionId || "default", "combat_action", `${combatData.attacker} vs ${combatData.defender}: ${combatData.action} (${combatData.damage} dmg, ${combatData.result})`);
            return narration;
        } catch (error) {
            console.error('❌ Erreur génération narration combat Groq:', error.message);
            throw error;
        }
    }

    async generateExplorationNarration(location, action, sessionId = "default", character = null, maxTokens = 250) {
        const locationContinuity = this.getLocationContinuity(sessionId, location);

        const prompt = `NARRATION HARDCORE - Mode Survie Extrême:
        Personnage: ${character ? character.name : 'Le héros'} (Niveau ${character ? character.powerLevel : 'G'})
        Lieu DANGEREUX: ${location}
        Action risquée: ${action}

        ${locationContinuity}

        SYSTÈME DE SURVIE IMPITOYABLE:
        🎯 DANGERS IMMÉDIATS à intégrer:
        - Prédateurs/Ennemis cachés qui observent
        - Pièges naturels/artificiels dans l'environnement
        - Conditions météo hostiles (froid/chaleur/tempête)
        - Équipement qui se dégrade/casse
        - Fatigue/faim/soif qui s'accumulent
        - Terrain instable/effondrement/glissade
        
        🔥 CONSÉQUENCES RÉELLES:
        - Chaque mouvement révèle la position aux ennemis
        - Les bruits attirent des créatures dangereuses
        - L'environnement réagit agressivement
        - Les PNJ sont méfiants/hostiles par défaut
        - Ressources limitées s'épuisent rapidement
        
        NARRATION INTENSE (3-4 phrases):
        1. Action + Danger immédiat révélé
        2. Réaction hostile de l'environnement/créatures
        3. Menace grandissante + conséquences visibles
        4. Nouvelle complication/choix difficile imposé
        
        Le monde de Friction Ultimate veut la MORT du héros !`;

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

    async generateDialogueResponse(character, playerDialogue, sessionId) {
        try {
            if (!this.isAvailable) {
                throw new Error('Groq non disponible');
            }

            const prompt = `Tu es un PNJ dans un jeu de rôle médiéval-fantasy. Le joueur ${character.name} te dit: "${playerDialogue}". Réponds de manière immersive et cohérente avec l'univers. Garde ta réponse courte (1-2 phrases max).`;

            const completion = await this.client.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: this.model,
                temperature: 0.8,
                max_tokens: 100
            });

            return completion.choices[0]?.message?.content || "Le PNJ vous regarde silencieusement.";

        } catch (error) {
            console.error('❌ Erreur génération dialogue Groq:', error.message);
            throw error;
        }
    }

    async generateNPCResponse(npcName, npcDescription, playerSpeech, context) {
        try {
            if (!this.isAvailable) {
                throw new Error('Groq non disponible');
            }

            const prompt = `Tu es ${npcName}, ${npcDescription}.
            Localisation: ${context.location}
            Royaume: ${context.kingdom}

            Le joueur ${context.playerName} te dit: "${playerSpeech}"

            Réponds de manière immersive et cohérente avec ton rôle. Garde ta réponse entre guillemets et courte (1-2 phrases max).`;

            const completion = await this.client.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: this.model,
                temperature: 0.8,
                max_tokens: 150
            });

            const response = completion.choices[0]?.message?.content || `"Bonjour ${context.playerName}."`;

            // S'assurer que la réponse est entre guillemets
            if (!response.startsWith('"')) {
                return `"${response.replace(/"/g, '')}"`;
            }

            return response;

        } catch (error) {
            console.error('❌ Erreur génération réponse PNJ Groq:', error.message);
            return `"Je vous écoute, ${context.playerName}."`;
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