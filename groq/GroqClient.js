const Groq = require('groq-sdk');

class GroqClient {
    constructor() {
        try {
            const apiKey = process.env.GROQ_API_KEY;

            if (!apiKey) {
                console.log('⚠️ GROQ_API_KEY non configurée - Client Groq désactivé');
                this.client = null;
                this.isAvailable = false;
                return;
            }

            this.client = new Groq({
                apiKey: apiKey,
                timeout: 15000
            });

            this.model = 'llama-3.3-70b-versatile';
            this.sessionMemory = new Map();
            this.maxMemoryPerSession = 100; // Mémoire équilibrée: contexte suffisant sans crash

            // Initialiser directement à true car le client est créé avec succès
            this.isAvailable = true;

            // Tester la connexion de manière asynchrone (non bloquant)
            this.initializeClient().catch(err => {
                console.log('⚠️ Test initial Groq échoué (normal au démarrage):', err.message);
            });

            console.log('✅ Client Groq initialisé avec succès - Narration IA activée');
        } catch (error) {
            console.error('❌ Erreur initialisation Groq:', error.message);
            this.client = null;
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isAvailable && this.client !== null && this.client !== undefined;
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
            if (!this.client) {
                console.log('⚠️ Client Groq non initialisé');
                this.isAvailable = false;
                return;
            }

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

    async generateNarration(prompt, maxTokens = 150) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Groq non disponible');
            }

            const enhancedPrompt = `Tu es un NARRATEUR CINÉMATOGRAPHIQUE ULTRA-DÉTAILLÉ qui décrit chaque action avec une PRÉCISION VISUELLE MAXIMALE.

RÈGLES DE NARRATION DÉTAILLÉE :
📏 LONGUEUR : Entre 800-1200 caractères pour narration complète
🎬 STYLE : Cinématographique, descriptif, immersif comme un roman épique
🔍 DÉTAILS VISUELS : Décrire textures, couleurs, lumières, ombres, mouvements
📐 MESURES PRÉCISES : 
   • Distances exactes (ex: "exactement 4,5 mètres devant lui")
   • Angles précis (ex: "rotation de 45° vers la droite")
   • Vitesses (ex: "accélère de 0 à 15 km/h en 1,2 secondes")
⏱️ CHRONOMÉTRAGE DÉTAILLÉ :
   • Durées précises pour chaque micro-action
   • Séquence temporelle claire (ex: "0,3s - lève le bras | 0,8s - frappe | 1,2s - impact")
🌍 ENVIRONNEMENT COMPLET :
   • État du sol (texture, inclinaison, friction)
   • Conditions atmosphériques (vent, température, humidité)
   • Éclairage et ombres projetées
   • Sons ambiants et échos
👁️ PERCEPTION SENSORIELLE :
   • Ce qui est vu (détails visuels précis)
   • Ce qui est entendu (sons, tonalités, volumes)
   • Ce qui est ressenti physiquement (vibrations, chaleur, pression)
⚙️ BIOMÉCANIQUE :
   • Position exacte du corps (posture, équilibre, centre de gravité)
   • Transfert de poids (ex: "65% du poids sur jambe gauche")
   • Tension musculaire et efforts mesurables
   • Trajectoires de mouvement détaillées
🎯 DÉTAILS TECHNIQUES :
   • Matériaux impliqués et leurs propriétés
   • Physique réaliste (gravité, inertie, friction)
   • Conséquences immédiates et différées
   • Micro-événements séquentiels

CONTEXTE DE L'ACTION :
${prompt}

Narre cette scène comme un réalisateur de film d'action professionnel qui décrit CHAQUE DÉTAIL VISIBLE avec précision technique. Sois TRÈS descriptif et immersif. 800-1200 caractères.`;

            const response = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: enhancedPrompt }],
                model: this.model,
                max_tokens: maxTokens,
                temperature: 1.9
            });

            let narration = response.choices[0]?.message?.content?.trim() || '';

            if (narration.length > 1200) {
                narration = narration.substring(0, 1197) + '...';
            }

            return narration;

        } catch (error) {
            console.error('❌ Erreur Groq narration:', error.message);
            throw error;
        }
    }

    async generateCombatNarration(combatData, maxTokens = 150) {
        let actionDescription = `Le combat entre ${combatData.attacker} et ${combatData.defender} continue.`;
        if (combatData.action) {
            actionDescription = `Action de ${combatData.attacker} : ${combatData.action}.`;
        }

        let damageInfo = '';
        if (combatData.damage !== undefined && combatData.damage !== null) {
            damageInfo = `Dégâts infligés : ${combatData.damage}.`;
            if (combatData.attacker === combatData.defender && combatData.damage > 0 && combatData.result === 'mort' && !combatData.action) {
                 actionDescription += " La mort semble survenir de manière inexpliquée sans action directe.";
            } else if (combatData.result === 'mort') {
                actionDescription += ` ${combatData.defender} est vaincu.`;
            }
        }

        const prompt = `Arbitre de combat RPG - Rapport factuel DÉTAILLÉ :
        Combattants: ${combatData.attacker} (${combatData.attackerLevel}) vs ${combatData.defender} (${combatData.defenderLevel})
        ${actionDescription}
        ${damageInfo}
        Résultat: ${combatData.result || 'Action observée'}

        DÉTAILS OBLIGATOIRES :
        - Distance initiale entre combattants (en mètres)
        - Trajectoire de l'attaque (angle, direction)
        - Temps d'exécution de la technique
        - Possibilité de riposte ou parade pour le défenseur
        - Position finale des combattants après l'action

        Rapport objectif et factuel avec MÉTRIQUES PRÉCISES. Max 700 caractères.`;

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

            const locationContinuity = this.getLocationContinuity(sessionId, location);
            const dynamicEvents = this.generateDynamicEvents(location, character);
            const npcReactions = this.generateSmartNPCReactions(character, action);

            const recentContext = this.getRecentMemory(sessionId).slice(-3).map(m => m.content).join('; ');

            const prompt = `Narrateur RPG style GTA médiéval. Narration FLUIDE et DIRECTE.

CONTEXTE: ${character.name} (${character.powerLevel}) à ${location}
ACTION: "${action}"
${recentContext ? `PRÉCÉDEMMENT: ${recentContext}` : ''}
${dynamicEvents ? `ÉVÉNEMENTS: ${dynamicEvents}` : ''}
${npcReactions ? `PNJ: ${npcReactions}` : ''}

STYLE: Action immédiate, continuité fluide, pas de répétitions. Utilise le contexte précédent pour cohérence.
Si dialogue: inclure réponse PNJ. Si combat: décrire technique précise.
Max 700 caractères.`;

            const response = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                max_tokens: 400,
                temperature: 0.7
            });

            let narration = response.choices[0]?.message?.content?.trim();

            if (!narration) {
                throw new Error('Réponse Groq vide');
            }

            this.addToMemory(sessionId, "system", `Événements: ${dynamicEvents}`, location);
            this.addToMemory(sessionId, "exploration", narration, location);

            console.log(`✅ Narration IA avancée générée (${narration.length} caractères)`);
            return narration;

        } catch (error) {
            console.error('❌ Erreur Groq narration exploration:', error.message);
            throw error;
        }
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

    createFallbackNarration(action) {
        console.log(`Fallback narration for action: ${action}`);
        return `A mysterious event occurred: ${action}. The adventure continues...`;
    }

    createNarrationPrompt(context, action, result) {
        const characterName = context?.character?.name || 'Aventurier';
        const actionText = typeof action === 'string' ? action : String(action || 'action inconnue');
        const kingdom = context?.character?.kingdom || 'Royaume mystérieux';
        const contextText = result?.context || 'L\'aventure continue';

        return `Narre cette action de jeu RPG fantasy de façon immersive et épique en 2-3 phrases courtes et dynamiques:

Personnage: ${characterName}
Action: ${actionText}
Royaume: ${kingdom}
Contexte: ${contextText}

Utilise un style narratif captivant à la deuxième personne, comme un maître de jeu expérimenté.`;
    }

    async generateNarrationWithFormatCheck(context, action, result) {
        try {
            if (!this.hasValidClient()) {
                return this.createFallbackNarration(action);
            }

            const prompt = this.createNarrationPrompt(context, action, result);
            const validPrompt = typeof prompt === 'string' ? prompt : String(prompt || 'Action effectuée');

            const response = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: validPrompt }],
                model: this.model,
                max_tokens: 600,
                temperature: 0.8
            });

            return response.choices[0]?.message?.content?.trim() || '';

        } catch (error) {
            console.error('❌ Erreur Groq narration (avec vérification de format):', error.message);
            throw error;
        }
    }
}

module.exports = GroqClient;