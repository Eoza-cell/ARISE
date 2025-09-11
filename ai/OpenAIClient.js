
const OpenAI = require('openai');

class OpenAIClient {
    constructor() {
        this.isAvailable = false;
        
        try {
            // Utiliser directement la clé API fournie
            this.openai = new OpenAI({
                apiKey: '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'
            });
            
            this.isAvailable = true;
            console.log('✅ OpenAI Client initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation d\'OpenAI:', error.message);
            console.log('⚠️ Le bot fonctionnera en mode fallback sans IA OpenAI');
        }
    }

    async generateNarration(context) {
        if (!this.isAvailable) {
            return "Le narrateur semble momentanément absent. L'action continue sans description détaillée.";
        }
        
        try {
            const prompt = this.buildNarrationPrompt(context);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Tu es le narrateur omniscient de FRICTION ULTIMATE, un monde médiéval-technologique impitoyable. Réponds toujours en français avec un style immersif et dramatique."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.8
            });
            
            return completion.choices[0].message.content;
        } catch (error) {
            console.error('❌ Erreur lors de la génération de narration OpenAI:', error);
            return "Le narrateur semble momentanément absent. L'action continue sans description détaillée.";
        }
    }

    async generateCombatNarration(combatContext) {
        if (!this.isAvailable) {
            return "Le combat se déroule dans un tourbillon d'acier et de magie.";
        }
        
        try {
            const prompt = this.buildCombatPrompt(combatContext);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Tu es le narrateur de combat de FRICTION ULTIMATE. Décris les combats de manière épique et dramatique en français."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.9
            });
            
            return completion.choices[0].message.content;
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
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Tu incarnes un PNJ du monde de FRICTION ULTIMATE. Réponds de manière cohérente avec le lore du personnage en français."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 150,
                temperature: 0.7
            });
            
            return completion.choices[0].message.content;
        } catch (error) {
            console.error('❌ Erreur lors de la génération de réponse de personnage:', error);
            return "Les PNJ semblent figés dans le temps...";
        }
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

Réponds en JSON strict:
{
  "actionType": "string",
  "precision": "high|medium|low",
  "consequences": ["string"],
  "affectedEntities": ["string"],
  "energyCost": number,
  "riskLevel": "low|medium|high|extreme"
}`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Tu es un analyseur d'actions pour FRICTION ULTIMATE. Réponds uniquement en JSON valide."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.3
            });
            
            try {
                return JSON.parse(completion.choices[0].message.content);
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

ACTION DU JOUEUR: ${action}

CONSIGNES:
1. Décris la scène de manière immersive et dramatique
2. Intègre les éléments du royaume et de l'ordre du personnage
3. Mentionne les conséquences potentielles de l'action
4. Garde un ton sombre et mystérieux typique de Friction Ultimate
5. 2-3 phrases maximum, style narratif épique

Raconte ce qui se passe:`;
    }

    buildCombatPrompt(combatContext) {
        const { attacker, defender, action, weapon, result } = combatContext;
        
        return `Décris ce combat dans FRICTION ULTIMATE:

ATTAQUANT: ${attacker.name} (${attacker.powerLevel})
DÉFENSEUR: ${defender.name} (${defender.powerLevel})
ACTION: ${action}
ARME: ${weapon || 'Mains nues'}
RÉSULTAT: ${result}

Crée une description épique de 2-3 phrases de cette action de combat.`;
    }

    buildCharacterResponsePrompt(character, situation, playerAction) {
        return `Tu incarnes un PNJ dans FRICTION ULTIMATE.

PERSONNAGE PNJ:
- Nom: ${character.name}
- Royaume/Ordre: ${character.faction}
- Personnalité: ${character.personality}
- Statut: ${character.status}

SITUATION: ${situation}
ACTION DU JOUEUR: ${playerAction}

CONSIGNES:
1. Reste fidèle à la personnalité du PNJ
2. Intègre le lore de ton royaume/ordre
3. Réagis de manière cohérente à l'action du joueur
4. Garde le ton mystérieux et dramatique du monde
5. Sois concis (1-2 phrases)

Réponds en tant que ce PNJ:`;
    }
}

module.exports = OpenAIClient;
