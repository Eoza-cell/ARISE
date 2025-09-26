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

    async generateNarration(prompt, maxTokens = 600) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Groq non disponible');
            }

            const response = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                max_tokens: maxTokens,
                temperature: 0.8
            });

            return response.choices[0]?.message?.content?.trim() || '';

        } catch (error) {
            console.error('❌ Erreur Groq narration:', error.message);
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

    async generateExplorationNarration(location, action, sessionId, character) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Groq non disponible');
            }

            console.log(`🗺️ Génération narration exploration avec Groq pour: ${action}`);

            // Récupérer la continuité et les événements dynamiques
            const locationContinuity = this.getLocationContinuity(sessionId, location);
            const dynamicEvents = this.generateDynamicEvents(location, character);
            const npcReactions = this.generateSmartNPCReactions(character, action);

            const prompt = `Tu es un narrateur IA ULTRA-PERFORMANT pour un RPG comme GTA mais médiéval-technologique. 

CONTEXTE AVANCÉ:
- Personnage: ${character.name} (Niveau ${character.powerLevel})
- Lieu: ${location}
- Action: "${action}"
- Royaume: ${character.kingdom}
- Continuité: ${locationContinuity}

ÉVÉNEMENTS DYNAMIQUES EN COURS:
${dynamicEvents}

RÉACTIONS PNJ INTELLIGENTES:
${npcReactions}

ANALYSE SPÉCIALE DE L'ACTION:
${this.analyzeActionType(action)}

RÈGLES DE NARRATION COMBAT:
🥊 Si l'action contient "coup de poing", "uppercut", "crochet" = DÉCRIRE la technique martial précise
🎯 Si c'est une technique de combat nommée = RESPECTER le nom et décrire l'exécution
⚔️ Éviter d'inventer des détails non mentionnés par le joueur
🔥 Se concentrer sur l'ACTION EXACTE demandée par le joueur

SYSTÈME IA RÉACTIVE GTA-STYLE:
1. 🌍 MONDE VIVANT - Les PNJ continuent leur vie même sans le joueur
2. 🎯 CONSÉQUENCES RÉALISTES - Chaque action a des répercussions à long terme
3. 🧠 MÉMOIRE PERSISTANTE - Le monde se souvient des actions passées
4. 📈 RÉPUTATION DYNAMIQUE - Les factions réagissent selon l'historique
5. 🎲 ÉVÉNEMENTS ALÉATOIRES - Surprises constantes et opportunités
6. 👥 IA SOCIALE - Relations complexes entre personnages
7. 🔄 ADAPTATION - L'environnement s'adapte au style de jeu

Génère une narration ÉPIQUE et PRÉCISE qui:
- RESPECTE exactement l'action demandée (si "coup de poing droit" = décrire un coup de poing droit)
- Intègre les événements dynamiques en cours
- Montre les réactions intelligentes des PNJ
- Crée des opportunités et des défis inattendus
- Utilise la mémoire du monde pour la cohérence
- Maintient le suspense et l'engagement

Style: Immersif, cinématographique, FIDÈLE à l'action demandée.`;

            // Ajouter une méthode d'analyse d'action
        }

        analyzeActionType(action) {
            const lowerAction = action.toLowerCase();
            
            if (lowerAction.includes('coup de poing droit')) {
                return "🥊 TECHNIQUE MARTIALE: Coup de poing droit - Technique de boxe précise avec rotation du corps et extension du bras dominant.";
            }
            if (lowerAction.includes('coup de poing gauche')) {
                return "🥊 TECHNIQUE MARTIALE: Coup de poing gauche - Jab rapide avec le bras non-dominant.";
            }
            if (lowerAction.includes('uppercut')) {
                return "🥊 TECHNIQUE MARTIALE: Uppercut - Coup ascendant puissant visant le menton ou le plexus.";
            }
            if (lowerAction.includes('crochet')) {
                return "🥊 TECHNIQUE MARTIALE: Crochet - Coup circulaire horizontal avec rotation du buste.";
            }
            if (lowerAction.includes('coup de pied')) {
                return "🦵 TECHNIQUE MARTIALE: Coup de pied - Attaque utilisant la force des jambes.";
            }
            if (lowerAction.includes('coup de poing')) {
                return "🥊 TECHNIQUE MARTIALE: Coup de poing basique - Frappe directe avec le poing.";
            }
            
            return "⚡ ACTION GÉNÉRALE: Analyser selon le contexte et les détails fournis.";
        }

            const response = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                max_tokens: 1200, // Augmenté pour plus de détails
                temperature: 0.85 // Légèrement plus créatif
            });

            let narration = response.choices[0]?.message?.content?.trim();

            if (!narration) {
                throw new Error('Réponse Groq vide');
            }

            // Ajouter les événements dynamiques à la mémoire
            this.addToMemory(sessionId, "system", `Événements: ${dynamicEvents}`, location);
            this.addToMemory(sessionId, "exploration", narration, location);

            console.log(`✅ Narration IA avancée générée (${narration.length} caractères)`);
            return narration;

        } catch (error) {
            console.error('❌ Erreur Groq narration exploration:', error.message);
            throw error;
        }
    }

    // Générer des événements dynamiques comme dans GTA
    generateDynamicEvents(location, character) {
        const events = [
            "🚨 Une patrouille de gardes passe dans la rue principale",
            "💰 Un marchand ambulant crie ses offres spéciales",
            "⚔️ Deux guerriers s'entraînent dans la cour, attirant les regards",
            "🌧️ Une pluie fine commence à tomber, changeant l'atmosphère",
            "📜 Un crieur public annonce des nouvelles du royaume",
            "🐎 Un cavalier arrive au galop avec des messages urgents",
            "🎭 Des troubadours installent leur spectacle sur la place",
            "🔥 De la fumée s'élève d'une forge en activité",
            "👥 Un groupe de voyageurs discute de terres lointaines",
            "🕊️ Un faucon messager traverse le ciel"
        ];

        const randomEvents = [];
        const eventCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < eventCount; i++) {
            randomEvents.push(events[Math.floor(Math.random() * events.length)]);
        }

        return randomEvents.join('\n');
    }

    // Générer des réactions PNJ intelligentes
    generateSmartNPCReactions(character, action) {
        const reactions = [];

        if (action.includes('attaque') || action.includes('combat')) {
            reactions.push("🛡️ Les gardes se mettent en alerte");
            reactions.push("😨 Les civils fuient la zone de combat");
            reactions.push("👮 Des renforts sont appelés discrètement");
        }

        if (action.includes('parle') || action.includes('social')) {
            reactions.push("👂 Certains PNJ tendent l'oreille avec curiosité");
            reactions.push("🤝 Des alliés potentiels s'approchent");
            reactions.push("📰 L'information se répand rapidement");
        }

        if (action.includes('explore') || action.includes('cherche')) {
            reactions.push("👁️ Des yeux curieux vous observent");
            reactions.push("🗺️ Un local vous propose ses services de guide");
            reactions.push("⚠️ Quelqu'un vous met en garde contre les dangers");
        }

        return reactions.slice(0, 2).join('\n');
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