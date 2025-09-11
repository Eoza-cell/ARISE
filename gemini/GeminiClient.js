
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiClient {
    constructor() {
        this.isAvailable = false;
        
        try {
            if (!process.env.GEMINI_API_KEY) {
                console.log('⚠️ GEMINI_API_KEY non configurée - IA désactivée');
                return;
            }
            
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            this.imageModel = this.genAI.getGenerativeModel({ 
                model: "gemini-2.0-flash-experimental",
                generationConfig: {
                    responseMimeType: "image/png"
                }
            });
            this.isAvailable = true;
            console.log('✅ GeminiClient initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de GeminiClient:', error.message);
            console.log('⚠️ Le bot fonctionnera en mode fallback sans IA');
        }
    }

    async generateNarration(context) {
        if (!this.isAvailable) {
            return "Le narrateur semble momentanément absent. L'action continue sans description détaillée.";
        }
        
        try {
            const prompt = this.buildNarrationPrompt(context);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            return response.text();
        } catch (error) {
            console.error('❌ Erreur lors de la génération de narration:', error);
            return "Le narrateur semble momentanément absent. L'action continue sans description détaillée.";
        }
    }

    async generateCombatNarration(combatContext) {
        if (!this.isAvailable) {
            return "Le combat se déroule dans un tourbillon d'acier et de magie.";
        }
        
        try {
            const prompt = this.buildCombatPrompt(combatContext);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            return response.text();
        } catch (error) {
            console.error('❌ Erreur lors de la génération de narration de combat:', error);
            return "Le combat se déroule dans un tourbillon d'acier et de magie.";
        }
    }

    async generateCharacterResponse(character, situation, playerAction) {
        if (!this.isAvailable) {
            return "Les PNJ semblent figés dans le temps...";
        }
        
        try {
            const prompt = this.buildCharacterResponsePrompt(character, situation, playerAction);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            return response.text();
        } catch (error) {
            console.error('❌ Erreur lors de la génération de réponse de personnage:', error);
            return "Les PNJ semblent figés dans le temps...";
        }
    }

    async generateImage(prompt, outputPath) {
        if (!this.isAvailable) {
            console.log('⚠️ Gemini AI non disponible pour la génération d\'images');
            return null;
        }
        
        try {
            console.log('🎨 Génération d\'image avec Gemini AI:', prompt.substring(0, 50) + '...');
            
            // Pour l'instant, Gemini 2.0 image generation API est instable
            // Retourner null pour utiliser le fallback Canvas
            console.log('⚠️ Gemini image generation désactivé temporairement (API instable)');
            return null;
            
        } catch (error) {
            console.error('❌ Erreur lors de la génération d\'image:', error.message);
            return null;
        }
    }

    async generateText(prompt, context = {}) {
        if (!this.isAvailable) {
            return {
                text: `🤖 Réponse automatique : "${prompt}"\n\nLe système d'IA Gemini sera intégré prochainement.`
            };
        }
        
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            return {
                text: response.text()
            };
        } catch (error) {
            console.error('❌ Erreur Gemini:', error);
            return {
                text: '❌ Erreur lors de la génération de réponse IA.'
            };
        }
    }

    buildNarrationPrompt(context) {
        const { character, location, action, gameState } = context;
        
        return `Tu es le narrateur omniscient du monde de FRICTION ULTIMATE, un univers médiéval-technologique impitoyable.

CONTEXTE:
- Personnage: ${character.name} (${character.gender === 'male' ? 'Homme' : 'Femme'})
- Royaume: ${character.kingdom}
- Ordre: ${character.order || 'Aucun'}
- Niveau: ${character.level} (Puissance ${character.powerLevel})
- Localisation: ${character.currentLocation}
- Vie: ${character.currentLife}/${character.maxLife}
- Énergie: ${character.currentEnergy}/${character.maxEnergy}

ACTION DU JOUEUR: "${action}"

RÈGLES DE NARRATION:
1. Tu décris SEULEMENT les conséquences de l'action, pas l'action elle-même
2. Le monde réagit de manière réaliste et souvent hostile
3. Chaque action a des conséquences précises (dégâts, fatigue, etc.)
4. Les PNJ agissent indépendamment et intelligemment
5. L'environnement est dangereux et en mouvement constant
6. Utilise un style narratif immersif à la deuxième personne ("Tu...")
7. Reste fidèle au lore des royaumes et ordres
8. Applique strictement le système de friction (${character.frictionLevel})

Décris les conséquences de cette action en 2-3 phrases maximum, avec précision et réalisme.`;
    }

    buildCombatPrompt(combatContext) {
        const { attacker, target, attack, environment } = combatContext;
        
        return `Tu es le narrateur de combat de FRICTION ULTIMATE. Décris le résultat de cette attaque:

ATTAQUANT: ${attacker.name} (${attacker.powerLevel})
- Vie: ${attacker.currentLife}/${attacker.maxLife}
- Énergie: ${attacker.currentEnergy}/${attacker.maxEnergy}

CIBLE: ${target.name} (${target.powerLevel})
- Vie: ${target.currentLife}/${target.maxLife}

ATTAQUE: "${attack.description}"
- Type: ${attack.type}
- Précision: ${attack.precision}
- Puissance: ${attack.power}

ENVIRONNEMENT: ${environment}

RÈGLES DE COMBAT:
1. Applique les dégâts selon la précision de l'attaque
2. La cible riposte automatiquement si elle survit
3. Décris les blessures spécifiques (membre touché, gravité)
4. Calcule la perte d'énergie pour l'attaquant
5. Aucune attaque n'est parfaite - il y a toujours un coût

Décris le résultat en 2-3 phrases, puis indique les nouvelles barres de vie/énergie.`;
    }

    buildCharacterResponsePrompt(character, situation, playerAction) {
        return `Tu incarnes un PNJ dans FRICTION ULTIMATE réagissant à l'action d'un joueur.

PNJ: ${character.name}
Type: ${character.type} (${character.powerLevel})
Personnalité: ${character.personality}
Situation: ${situation}

ACTION DU JOUEUR: "${playerAction}"

RÈGLES:
1. Réagis selon ta personnalité et ton niveau de puissance
2. Les PNJ de niveau A sont très dangereux et stratégiques
3. Riposte immédiatement si attaqué
4. Utilise le pronom "tu" pour t'adresser au joueur
5. Sois cohérent avec le lore de ton ordre/royaume

Réponds en 1-2 phrases courtes, en tant que ce PNJ.`;
    }

    async analyzePlayerAction(action, gameContext) {
        if (!this.isAvailable) {
            return {
                actionType: "unknown",
                precision: "medium",
                consequences: ["Action analysée de manière basique"],
                affectedEntities: [],
                energyCost: 10,
                riskLevel: "medium"
            };
        }
        
        try {
            const prompt = `Analyse cette action de joueur dans FRICTION ULTIMATE:

Action: "${action}"
Contexte: ${JSON.stringify(gameContext, null, 2)}

Détermine:
1. Type d'action (combat, exploration, social, etc.)
2. Niveau de précision (manque de détails = vulnérabilité)
3. Conséquences probables
4. NPCs/environnement affectés

Réponds en JSON:
{
  "actionType": "string",
  "precision": "high|medium|low",
  "consequences": ["string"],
  "affectedEntities": ["string"],
  "energyCost": number,
  "riskLevel": "low|medium|high|extreme"
}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            try {
                return JSON.parse(response.text());
            } catch (parseError) {
                console.error('❌ Erreur de parsing JSON:', parseError);
                return {
                    actionType: "unknown",
                    precision: "low",
                    consequences: ["Action imprécise"],
                    affectedEntities: [],
                    energyCost: 10,
                    riskLevel: "medium"
                };
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse d\'action:', error);
            return {
                actionType: "unknown",
                precision: "low",
                consequences: ["Erreur d'analyse"],
                affectedEntities: [],
                energyCost: 10,
                riskLevel: "medium"
            };
        }
    }
}

module.exports = GeminiClient;
