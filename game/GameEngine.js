const GeminiClient = require('../gemini/GeminiClient');
const OpenAIClient = require('../ai/OpenAIClient');
const OllamaClient = require('../ai/OllamaClient');
const GroqClient = require('../groq/GroqClient');
const CharacterCustomizationManager = require('../utils/CharacterCustomizationManager');
const ImmersiveNarrationManager = require('../utils/ImmersiveNarrationManager');
const AdvancedGameMechanics = require('./AdvancedMechanics');
const path = require('path');
const NarrationFormatter = require('../utils/NarrationFormatter');

class GameEngine {
    constructor({ dbManager, imageGenerator, playhtClient, cambAIClient, puterClient, asset3DManager, blenderClient, runwayClient }) {
        this.dbManager = dbManager;
        this.imageGenerator = imageGenerator;
        this.playhtClient = playhtClient;
        this.cambAIClient = cambAIClient;
        this.puterClient = puterClient;
        this.asset3DManager = asset3DManager;
        this.blenderClient = blenderClient;
        this.runwayClient = runwayClient;

        this.openAIClient = new OpenAIClient(this.dbManager);
        this.ollamaClient = new OllamaClient();
        this.groqClient = new GroqClient();
        this.geminiClient = new GeminiClient();

        this.narrationManager = new ImmersiveNarrationManager(this.dbManager);
        this.narrationFormatter = new NarrationFormatter();
        this.advancedMechanics = new AdvancedGameMechanics(this.dbManager, this);

        this.characterCustomization = null;

        this.commandHandlers = {
            '/menu': this.handleMenuCommand.bind(this),
            '/créer': this.handleCreateCharacterCommand.bind(this),
            '/créer_personnage': this.handleCreateCharacterCommand.bind(this),
            '/modifier': this.handleModifyCharacterCommand.bind(this),
            '/fiche': this.handleCharacterSheetCommand.bind(this),
            '/aide': this.handleHelpCommand.bind(this),
            '/help': this.handleHelpCommand.bind(this),
            '/guide': this.handleHelpCommand.bind(this),
            '/jouer': this.handlePlayCommand.bind(this),
            '/royaumes': this.handleKingdomsCommand.bind(this),
            '/ordres': this.handleOrdersCommand.bind(this),
            '/combat': this.handleCombatCommand.bind(this),
            '/inventaire': this.handleInventoryCommand.bind(this),
            '/carte': this.handleMapCommand.bind(this),
            '/boutons': this.handleButtonsTestCommand.bind(this),
            '/buttons': this.handleButtonsTestCommand.bind(this),
            '/autorise': this.handleAuthorizeCommand.bind(this),
            '/config_royaume': this.handleConfigKingdomCommand.bind(this),
            '/reputation': this.handleReputationCommand.bind(this),
            '/evenements': this.handleEventsCommand.bind(this),
            '/meteo': this.handleWeatherCommand.bind(this),
            '/marché': this.handleMarketCommand.bind(this),
            '/factions': this.handleFactionsCommand.bind(this),
            '/defis': this.handleChallengesCommand.bind(this)
        };
    }

    async processPlayerMessage({ playerNumber, chatId, message, imageMessage, originalMessage, sock, dbManager, imageGenerator }) {
        try {
            if (!this.characterCustomization && sock) {
                this.characterCustomization = new CharacterCustomizationManager(dbManager, imageGenerator, sock);
            }

            let player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                const username = `Joueur_${playerNumber.slice(-4)}`;
                player = await dbManager.createPlayer(playerNumber, username);

                return {
                    text: `🎮 **Bienvenue dans FRICTION ULTIMATE !**\n\n` +
                          `Tu es maintenant enregistré en tant que : **${username}**\n\n` +
                          `🏰 Dans ce monde médiéval-technologique, chaque action compte et la moindre erreur peut être fatale.\n\n` +
                          `📱 **Commandes principales :**\n` +
                          `• /menu - Afficher le menu principal\n` +
                          `• /créer - Créer ton personnage\n` +
                          `• /aide - Voir toutes les commandes\n\n` +
                          `💀 **Attention :** Ce monde est impitoyable. Prépare-toi à l'aventure la plus dangereuse de ta vie !`,
                    image: await imageGenerator.generateMenuImage()
                };
            }

            await dbManager.updatePlayerActivity(player.id);

            if (!message && imageMessage) {
                const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
                const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');
                const photoReceived = await dbManager.getTemporaryData(player.id, 'photo_received');

                if (creationMode === 'description' && creationStarted && !photoReceived) {
                    console.log(`📸 Photo reçue pour création personnage de ${player.whatsappNumber}`);
                    return await this.handlePhotoReceived({ player, imageMessage, originalMessage: arguments[0].originalMessage, sock, dbManager, imageGenerator });
                } else {
                    return {
                        text: "🖼️ J'ai reçu votre image ! Cependant, je ne peux traiter que les commandes textuelles.\n\n" +
                              "💬 Utilisez `/menu` pour voir les commandes disponibles."
                    };
                }
            }

            if (!message) {
                return {
                    text: "💬 Utilisez `/menu` pour voir les commandes disponibles."
                };
            }

            const command = message.toLowerCase().trim();
            let response = null;

            if (this.characterCustomization && this.characterCustomization.activeCustomizations.has(playerNumber)) {
                const handled = await this.characterCustomization.handleCustomizationResponse(playerNumber, chatId, message);
                if (handled) {
                    return { text: '' };
                }
            }

            if (imageMessage) {
                const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
                const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');

                if (creationMode === 'description' && creationStarted) {
                    return await this.handlePhotoReceived({ player, imageMessage, originalMessage, sock, dbManager, imageGenerator });
                }
            }

            const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');
            const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
            const photoReceived = await dbManager.getTemporaryData(player.id, 'photo_received');

            if (creationMode === 'description' && creationStarted && photoReceived && message && !this.commandHandlers[command]) {
                return await this.handleDescriptionCreation({ player, description: message, dbManager, imageGenerator });
            }

            if (message && message.toUpperCase().trim() === 'SUPPRIMER_PERSONNAGE') {
                return await this.handleDeleteCharacter({ player, dbManager, imageGenerator });
            }

            if (this.commandHandlers[command]) {
                response = await this.commandHandlers[command]({ player, chatId, message, dbManager, imageGenerator, sock });
            }

            const playerId = player.id;
            const normalizedMessage = message.toLowerCase().trim();


            if (!response) {
                const character = await dbManager.getCharacterByPlayer(player.id);

                if (!character) {
                    return {
                        text: `❌ Tu n'as pas encore de personnage !\n\n` +
                              `Utilise /créer pour créer ton personnage, puis /jouer pour entrer en mode jeu.`
                    };
                }

                const dialogueKeywords = ['parle', 'dis', 'demande', 'salue', 'bonjour', 'bonsoir', 'hey', '"'];
                const isDialogue = dialogueKeywords.some(keyword =>
                    message.toLowerCase().includes(keyword)
                ) || message.includes('"') || message.toLowerCase().startsWith('je dis');

                if (isDialogue) {
                    return await this.processDialogueAction({ player, character, message, dbManager, imageGenerator });
                }

                return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
            }

            return response;

        } catch (error) {
            console.error('❌ Erreur dans le moteur de jeu:', error);
            return {
                text: "❌ Une erreur s'est produite dans le moteur de jeu. Veuillez réessayer."
            };
        }
    }

    async handleMenuCommand({ player, dbManager, imageGenerator }) {
        await dbManager.clearTemporaryData(player.id, 'game_mode');

        const character = await dbManager.getCharacterByPlayer(player.id);

        let menuText = `🎮 **FRICTION ULTIMATE - Menu Principal**\n\n`;

        if (character) {
            menuText += `👤 **Personnage :** ${character.name}\n` +
                       `🏰 **Royaume :** ${character.kingdom}\n` +
                       `⚔️ **Ordre :** ${character.order || 'Aucun'}\n` +
                       `📊 **Niveau :** ${character.level} (${character.powerLevel})\n\n`;
        }

        menuText += `📱 **Commandes disponibles :**\n` +
                   `• /jouer - 🎮 ENTRER DANS LE JEU\n` +
                   `• /créer - Créer ton personnage\n` +
                   `• /modifier - Modifier ton personnage\n` +
                   `• /fiche - Voir ta fiche de personnage\n` +
                   `• /royaumes - Explorer les 12 royaumes\n` +
                   `• /ordres - Découvrir les 7 ordres\n` +
                   `• /combat - Système de combat\n` +
                   `• /inventaire - Gérer ton équipement\n` +
                   `• /carte - Carte du monde\n` +
                   `• /aide - Aide complète\n\n` +
                   `💀 **Le monde bouge en permanence. Chaque seconde compte !**`;

        try {
            const menuImage = await imageGenerator.generateMenuImage();
            return {
                text: menuText,
                image: menuImage
            };
        } catch (error) {
            console.error('⚠️ Erreur génération image menu, affichage sans image:', error);
            return {
                text: menuText + '\n\n⚠️ Image temporairement indisponible'
            };
        }
    }

    async handleCreateCharacterCommand({ player, dbManager, imageGenerator, sock, chatId }) {
        const existingCharacter = await dbManager.getCharacterByPlayer(player.id);

        if (existingCharacter) {
            return {
                text: `👤 Tu as déjà un personnage : **${existingCharacter.name}**\n\n` +
                      `🏰 Royaume : ${existingCharacter.kingdom}\n` +
                      `⚔️ Ordre : ${existingCharacter.order || 'Aucun'}\n\n` +
                      `🎨 Pour créer un nouveau personnage,\n` +
                      `tu dois d'abord supprimer l'actuel.\n\n` +
                      `Écris "SUPPRIMER_PERSONNAGE" pour confirmer la suppression.`,
                image: await imageGenerator.generateCharacterImage(existingCharacter)
            };
        }

        await dbManager.setTemporaryData(player.id, 'creation_started', true);
        await dbManager.setTemporaryData(player.id, 'creation_mode', 'description');

        return {
            text: `🎭 **CRÉATION DE PERSONNAGE IA** 🎭\n\n` +
                  `✨ Pour créer ton personnage idéal, l'IA a besoin de ton aide !\n\n` +
                  `📸 **ÉTAPE 1 - ENVOIE TA PHOTO**\n` +
                  `Envoie une photo de ton visage pour que l'IA Pollination puisse créer un personnage qui te ressemble !\n\n` +
                  `📝 **ÉTAPE 2 - DÉCRIS TON PERSONNAGE**\n` +
                  `Après ta photo, décris ton personnage idéal :\n` +
                  `• Classe/profession (guerrier, mage, assassin...)\n` +
                  `• Style vestimentaire et armure\n` +
                  `• Origine/royaume préféré\n` +
                  `• Personnalité et histoire\n\n` +
                  `💡 **Exemple de description :**\n` +
                  `"Un guerrier noble avec une armure dorée, venant des plaines d'honneur d'AEGYRIA. Il est courageux et loyal."\n\n` +
                  `📸 **Commence par envoyer ta photo maintenant !**`,
            image: await imageGenerator.generateMenuImage()
        };
    }

    async startCharacterCreation({ player, dbManager, imageGenerator }) {
        await dbManager.setTemporaryData(player.id, 'creation_started', true);

        let creationText = `⚔️ **CRÉATION DE PERSONNAGE**\n\n` +
                          `🎯 **Étape 1/3 - Choix du sexe**\n\n` +
                          `👤 Choisis le sexe de ton personnage :\n\n` +
                          `• Tape **HOMME** ou **H** pour masculin\n` +
                          `• Tape **FEMME** ou **F** pour féminin\n\n` +
                          `💀 **Attention :** Dans ce monde impitoyable, chaque choix compte !\n\n` +
                          `⚡ **Processus rapide en 3 étapes :**\n` +
                          `1. 👤 Sexe (maintenant)\n` +
                          `2. 🏰 Royaume (prochaine étape)\n` +
                          `3. 📝 Nom de personnage\n\n` +
                          `🚀 **Tape HOMME, H, FEMME ou F pour continuer !**`;

        return {
            text: creationText,
            image: await imageGenerator.generateMenuImage()
        };
    }

    async handlePhotoReceived({ player, imageMessage, originalMessage, sock, dbManager, imageGenerator }) {
        try {
            console.log(`📸 Photo reçue pour création personnage de ${player.whatsappNumber}`);

            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const imageBuffer = await downloadMediaMessage(originalMessage, 'buffer', {}, {
                logger: require('pino')({ level: 'silent' })
            });

            if (imageBuffer && imageBuffer.length > 0) {
                await imageGenerator.saveCustomCharacterImage(player.id, imageBuffer);

                await dbManager.setTemporaryData(player.id, 'photo_received', true);

                console.log(`✅ Photo sauvegardée pour ${player.whatsappNumber}`);

                return {
                    text: `📸 **PHOTO REÇUE AVEC SUCCÈS !** 📸\n\n` +
                          `✅ Ton visage a été enregistré pour la création du personnage.\n\n` +
                          `📝 **MAINTENANT, DÉCRIS TON PERSONNAGE :**\n\n` +
                          `Décris le personnage que tu veux incarner :\n\n` +
                          `💡 **Exemple :**\n` +
                          `"Un guerrier noble d'AEGYRIA avec une armure dorée et une épée lumineuse. Il est courageux, loyal et protège les innocents. Il vient des plaines d'honneur et rêve de devenir un paladin légendaire."\n\n` +
                          `🎭 **Inclus :**\n` +
                          `• Classe/profession\n` +
                          `• Style d'armure/vêtements\n` +
                          `• Royaume d'origine\n` +
                          `• Personnalité\n` +
                          `• Histoire/objectifs\n\n` +
                          `🚀 **Écris ta description maintenant !**`
                };
            } else {
                return {
                    text: `❌ **Erreur de téléchargement de photo**\n\n` +
                          `La photo n'a pas pu être traitée.\n` +
                          `📸 Réessaie d'envoyer une photo claire de ton visage.`
                };
            }
        } catch (error) {
            console.error('❌ Erreur traitement photo:', error);
            return {
                text: `❌ **Erreur lors du traitement de la photo**\n\n` +
                      `Une erreur s'est produite. Réessaie d'envoyer ta photo.\n` +
                      `💡 Assure-toi que l'image est claire et bien éclairée.`
            };
        }
    }

    async handleDescriptionCreation({ player, description, dbManager, imageGenerator }) {
        try {
            console.log(`🎭 Création par IA pour ${player.whatsappNumber}: ${description}`);

            const characterDataFromAI = await this.generateCharacterFromDescription(description, player);

            const newCharacter = await dbManager.createCharacter({
                ...characterDataFromAI,
                appearance: description
            });

            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            let characterImage = null;
            try {
                characterImage = await imageGenerator.generateCharacterImage(newCharacter, {
                    style: '3d',
                    perspective: 'first_person',
                    nudity: false
                });
            } catch (imageError) {
                console.error('⚠️ Erreur génération image personnage:', imageError);
            }

            return {
                text: `🎉 **PERSONNAGE CRÉÉ AVEC SUCCÈS !** 🎉\n\n` +
                      `👤 **Nom :** ${newCharacter.name}\n` +
                      `⚧️ **Sexe :** ${newCharacter.gender === 'male' ? 'Homme' : 'Femme'}\n` +
                      `🏰 **Royaume :** ${newCharacter.kingdom}\n` +
                      `📊 **Niveau :** ${newCharacter.level} (${newCharacter.powerLevel})\n` +
                      `📍 **Localisation :** ${newCharacter.currentLocation}\n` +
                      `💰 **Pièces :** ${newCharacter.coins}\n\n` +
                      `✨ **Description générée par l'IA :**\n` +
                      `"${description}"\n\n` +
                      `🎮 **Tapez /jouer pour commencer l'aventure !**\n` +
                      `📋 **Tapez /fiche pour voir tous les détails**`,
                image: characterImage
            };

        } catch (error) {
            console.error('❌ Erreur création personnage par IA:', error);

            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            return {
                text: `❌ **Erreur lors de la création**\n\n` +
                      `Une erreur s'est produite lors de l'analyse de votre description.\n` +
                      `Veuillez réessayer avec /créer.\n\n` +
                      `💡 **Conseil :** Soyez plus précis dans votre description.`
            };
        }
    }

    async generateCharacterFromDescription(description, player) {
        try {
            if (this.groqClient && this.groqClient.hasValidClient()) {
                const analysisPrompt = `Analyse cette description de personnage RPG et extrait les informations suivantes au format JSON strict:

DESCRIPTION: "${description}"

Tu dois retourner UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "name": "nom du personnage (si pas mentionné, crée un nom approprié)",
  "gender": "male ou female (déduis du contexte)",
  "kingdom": "l'un de ces royaumes selon la description: AEGYRIA, SOMBRENUIT, KHELOS, ABRANTIS, VARHA, SYLVARIA, ECLYPSIA, TERRE_DESOLE, DRAK_TARR, URVALA, OMBREFIEL, KHALDAR",
  "level": 1,
  "powerLevel": "G",
  "frictionLevel": "G",
  "coins": 100
}

Règles importantes:
- Si le royaume n'est pas clair, choisis AEGYRIA par défaut
- Le nom doit être unique et approprié au style medieval-fantasy
- Réponds UNIQUEMENT avec le JSON, rien d'autre`;

                const aiResponse = await this.groqClient.generateNarration(analysisPrompt, 200);

                console.log('🤖 Réponse IA brute:', aiResponse);

                let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('Pas de JSON trouvé dans la réponse IA');
                }

                const characterInfo = JSON.parse(jsonMatch[0]);
                console.log('📊 Données personnage extraites:', characterInfo);

                return {
                    playerId: player.id,
                    name: characterInfo.name || `Héros_${player.whatsappNumber.slice(-4)}`,
                    gender: characterInfo.gender === 'female' ? 'female' : 'male',
                    kingdom: this.validateKingdom(characterInfo.kingdom),
                    order: null,
                    level: 1,
                    experience: 0,
                    powerLevel: 'G',
                    frictionLevel: 'G',
                    currentLife: 100,
                    maxLife: 100,
                    currentEnergy: 100,
                    maxEnergy: 100,
                    currentLocation: this.getStartingLocation(characterInfo.kingdom),
                    position: { x: 0, y: 0, z: 0 },
                    equipment: {},
                    learnedTechniques: [],
                    coins: 100,
                    inventory: []
                };

            } else {
                throw new Error('IA Groq non disponible');
            }

        } catch (error) {
            console.error('❌ Erreur analyse IA:', error);

            return {
                playerId: player.id,
                name: `Héros_${player.whatsappNumber.slice(-4)}`,
                gender: 'male',
                kingdom: 'AEGYRIA',
                order: null,
                level: 1,
                experience: 0,
                powerLevel: 'G',
                frictionLevel: 'G',
                currentLife: 100,
                maxLife: 100,
                currentEnergy: 100,
                maxEnergy: 100,
                currentLocation: 'Grande Plaine d\'Honneur - Village de Valorhall',
                position: { x: 0, y: 0, z: 0 },
                equipment: {},
                learnedTechniques: [],
                coins: 100,
                inventory: []
            };
        }
    }

    validateKingdom(kingdom) {
        const validKingdoms = ['AEGYRIA', 'SOMBRENUIT', 'KHELOS', 'ABRANTIS', 'VARHA', 'SYLVARIA', 'ECLYPSIA', 'TERRE_DESOLE', 'DRAK_TARR', 'URVALA', 'OMBREFIEL', 'KHALDAR'];
        return validKingdoms.includes(kingdom) ? kingdom : 'AEGYRIA';
    }

    getStartingLocation(kingdom) {
        const locations = {
            'AEGYRIA': 'Grande Plaine d\'Honneur - Village de Valorhall',
            'SOMBRENUIT': 'Forêt des Murmures - Clairière de Lunelame',
            'KHELOS': 'Oasis du Mirage - Campement de Sablesang',
            'ABRANTIS': 'Port de Marée-Haute - Taverne du Kraken',
            'VARHA': 'Pic des Loups - Village de Glacierre',
            'SYLVARIA': 'Bosquet Éternel - Cercle des Anciens',
            'ECLYPSIA': 'Terre d\'Ombre - Temple de l\'Éclipse',
            'TERRE_DESOLE': 'Wasteland Central - Campement des Survivants',
            'DRAK_TARR': 'Cratère de Feu - Forge Volcanique',
            'URVALA': 'Marais Maudit - Laboratoire des Morts',
            'OMBREFIEL': 'Plaine Grise - Citadelle des Exilés',
            'KHALDAR': 'Jungle Tropicale - Village sur Pilotis'
        };
        return locations[kingdom] || locations['AEGYRIA'];
    }

    async handleCharacterSheetCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !\n\n` +
                      `Utilise la commande /créer pour en créer un.`
            };
        }

        const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
        const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

        const sheetText = `👤 **FICHE DE PERSONNAGE**\n\n` +
                         `**Nom :** ${character.name}\n` +
                         `**Sexe :** ${character.gender === 'male' ? 'Homme' : 'Femme'}\n` +
                         `**Royaume :** ${character.kingdom}\n` +
                         `**Ordre :** ${character.order || 'Aucun'}\n\n` +
                         `📊 **Statistiques :**\n` +
                         `• Niveau : ${character.level}\n` +
                         `• Expérience : ${character.experience}\n` +
                         `• Niveau de puissance : ${character.powerLevel}\n` +
                         `• Niveau de friction : ${character.frictionLevel}\n\n` +
                         `❤️ **Barres de vie :** ${lifeBar}\n` +
                         `⚡ **Énergie :** ${energyBar}\n\n` +
                         `📍 **Position :** ${character.currentLocation}\n` +
                         `💰 **Pièces :** ${character.coins}\n\n` +
                         `⚔️ **Équipement actuel :**\n` +
                         `${this.formatEquipment(character.equipment)}\n\n` +
                         `🎯 **Techniques apprises :**\n` +
                         `${this.formatTechniques(character.learnedTechniques)}`;

        let characterImage = null;
        try {
            characterImage = await imageGenerator.generateCharacterImage(character, {
                style: '3d',
                perspective: 'first_person',
                nudity: false
            });
        } catch (imageError) {
            console.log('⚠️ Impossible de générer l\'image pour la fiche, continuons sans image:', imageError.message);
        }

        return {
            text: sheetText,
            image: characterImage
        };
    }

    async handleGameAction({ player, chatId, message, imageMessage, sock, dbManager, imageGenerator }) {
        const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
        const savedCharacterName = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (imageMessage && creationStarted && savedCharacterName) {
            try {
                console.log('📸 Réception d\'une image pour la création de personnage...');
                console.log('🔄 Tentative de téléchargement de l\'image...');

                const { downloadMediaMessage } = require('@whiskeysockets/baileys');
                const imageBuffer = await downloadMediaMessage(imageMessage, 'buffer', {}, {
                    logger: require('pino')({ level: 'silent' })
                });

                if (imageBuffer && imageBuffer.length > 0) {
                    console.log(`✅ Image téléchargée avec succès: ${imageBuffer.length} bytes`);
                    return await this.finalizeCharacterCreation({
                        player,
                        dbManager,
                        imageGenerator,
                        hasCustomImage: true,
                        imageBuffer
                    });
                } else {
                    console.log('❌ Échec du téléchargement - buffer vide ou null');
                    return {
                        text: `❌ Erreur lors du téléchargement de l'image. Réessaie ou écris "SANS_PHOTO".`
                    };
                }
            } catch (error) {
                console.error('❌ Erreur traitement image:', error.message, error.stack);
                return {
                    text: `❌ Erreur lors du traitement de l'image (${error.message}). Réessaie ou écris "SANS_PHOTO".`
                };
            }
        } else if (imageMessage && !creationStarted) {
            return {
                text: '⚠️ Aucune création de personnage en cours. Tapez "/créer" d\'abord.'
            };
        }

        if (imageMessage && !message) {
            return {
                text: `📸 Image reçue, mais aucune action prévue pour les images pour le moment.`
            };
        }

        const input = message.toUpperCase().trim();
        if (creationStarted && (input === 'HOMME' || input === 'H' || input === 'FEMME' || input === 'F' || input === '1' || input === '2')) {
            return await this.handleGenderSelection({ player, message, dbManager, imageGenerator });
        }

        const tempGender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomNumber = parseInt(message);
        if (creationStarted && tempGender && kingdomNumber >= 1 && kingdomNumber <= 12) {
            return await this.handleKingdomSelection({ player, kingdomNumber, dbManager, imageGenerator });
        }

        const tempKingdom = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        const existingName = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (creationStarted && tempGender && tempKingdom && !existingName) {
            return await this.handleCharacterNameInput({ player, name: message, dbManager, imageGenerator });
        }

        if (creationStarted && tempGender && tempKingdom && existingName) {
            if (message.toUpperCase() === 'SANS_PHOTO') {
                return await this.finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage: false });
            }
            return {
                text: `📸 **En attente de ta photo de visage...**\n\n` +
                      `🖼️ Envoie une photo de ton visage ou écris "SANS_PHOTO" pour continuer sans photo personnalisée.`
            };
        }

        const modificationStarted = await dbManager.getTemporaryData(player.id, 'modification_started');
        if (modificationStarted) {
            return await this.handleModificationDescription({ player, description: message, dbManager, imageGenerator });
        }

        const isInGameMode = await dbManager.getTemporaryData(player.id, 'game_mode');

        if (!isInGameMode) {
            return {
                text: `💬 **Message libre détecté**\n\n` +
                      `Salut ! Pour jouer à Friction Ultimate, utilise :\n` +
                      `🎮 **/jouer** - Entrer en mode jeu\n` +
                      `📋 **/menu** - Voir toutes les options\n\n` +
                      `En mode libre, je ne traite pas les actions de jeu.`
            };
        }

        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !\n\n` +
                      `Utilise /menu pour sortir du mode jeu.`
            };
        }

        const hasQuotes = message.includes('"') || message.includes('«') || message.includes('»');
        const isDialogue = hasQuotes ||
                          message.toLowerCase().includes('parler') ||
                          message.toLowerCase().includes('dire') ||
                          message.toLowerCase().includes('demander');

        if (isDialogue) {
            return await this.processDialogueAction({ player, character, message, dbManager, imageGenerator });
        }

        return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
    }

    async processGameActionWithAI({ player, character, message, dbManager, imageGenerator }) {
        try {
            const sessionId = `player_${player.id}`;

            const actionAnalysis = await this.openAIClient.analyzePlayerAction(message, {
                character: character,
                location: character.currentLocation,
                kingdom: character.kingdom
            }, sessionId);

            let narration;
            try {
                if (this.groqClient && this.groqClient.hasValidClient()) {
                    console.log('🚀 Génération narration avec Groq (ultra-rapide)...');
                    narration = await this.groqClient.generateExplorationNarration(character.currentLocation, message, sessionId, character);

                    console.log('✅ Narration générée avec Groq');
                } else {
                    throw new Error('Groq non disponible, essai Ollama');
                }
            } catch (groqError) {
                try {
                    if (this.ollamaClient.hasValidClient()) {
                        narration = await this.ollamaClient.generateNarration({}, message, character);
                        console.log('✅ Narration générée avec Ollama');
                    } else {
                        throw new Error('Ollama non disponible, essai Gemini');
                    }
                } catch (ollamaError) {
                    try {
                        console.log('🎭 Génération narration avec Gemini...');
                        const context = {
                            character: character,
                            location: character.currentLocation,
                            action: message,
                            gameState: {
                                life: character.currentLife,
                                energy: character.currentEnergy,
                                powerLevel: character.powerLevel,
                                kingdom: character.kingdom
                            }
                        };
                        narration = await this.geminiClient.generateNarration(context, sessionId);
                        console.log('✅ Narration générée avec Gemini');
                    } catch (geminiError) {
                        console.log('⚠️ Fallback OpenAI pour narration:', geminiError.message);
                        narration = await this.openAIClient.generateNarration({
                            character: character,
                            location: character.currentLocation,
                            action: message,
                            gameState: {
                                life: character.currentLife,
                                energy: character.currentEnergy,
                                powerLevel: character.powerLevel
                            }
                        }, sessionId);
                    }
                }
            }

            const energyCost = Math.max(0, Math.min(character.currentEnergy, actionAnalysis.energyCost || 10));
            const staminaRecovery = Math.max(-15, Math.min(3, actionAnalysis.staminaRecovery || 0));
            const equipmentStress = Math.max(-3, Math.min(0, actionAnalysis.equipmentStress || 0));

            const validCombatAdvantages = ['critical_hit', 'normal_hit', 'glancing_blow', 'miss', 'counter_attacked'];
            actionAnalysis.combatAdvantage = validCombatAdvantages.includes(actionAnalysis.combatAdvantage)
                ? actionAnalysis.combatAdvantage
                : 'miss';

            character.currentEnergy = Math.max(0, character.currentEnergy - energyCost);

            let damageText = '';
            let shouldTakeDamage = false;

            const realCombatKeywords = ['attaque', 'combat', 'frappe', 'tue', 'massacre', 'poignarde', 'tranche', 'décapite'];
            const isRealCombat = realCombatKeywords.some(keyword =>
                message.toLowerCase().includes(keyword)
            );

            if (isRealCombat && actionAnalysis.combatAdvantage === 'counter_attacked') {
                shouldTakeDamage = true;
            } else if (isRealCombat && actionAnalysis.riskLevel === 'extreme' && Math.random() < 0.3) {
                shouldTakeDamage = true;
            }

            if (character.currentEnergy <= 0) {
                damageText = `\n⚡ **ÉPUISEMENT** - Vous êtes trop fatigué pour être efficace`;
            }

            if (shouldTakeDamage && actionAnalysis.potentialDamage > 0) {
                const baseDamage = Math.max(1, Math.min(8, actionAnalysis.potentialDamage || 3));
                const damage = Math.min(baseDamage, character.currentLife);
                character.currentLife = Math.max(0, character.currentLife - damage);
                damageText = `\n💀 **DÉGÂTS SUBIS :** -${damage} PV (combat risqué)`;

                console.log(`⚔️ Dégâts appliqués: ${damage} PV (action: ${message}, situation: ${actionAnalysis.combatAdvantage})`);
            }

            if (staminaRecovery !== 0) {
                if (staminaRecovery > 0) {
                    character.currentEnergy = Math.min(character.maxEnergy, character.currentEnergy + staminaRecovery);
                } else {
                    character.currentEnergy = Math.max(0, character.currentEnergy + staminaRecovery);
                }
            }

            let equipmentWarning = '';
            if (equipmentStress < 0) {
                equipmentWarning = `\n⚔️ **USURE ÉQUIPEMENT :** Votre équipement s'abîme (${Math.abs(equipmentStress)})`;
            }

            let deathText = '';
            let isAlive = true;
            if (character.currentLife <= 0) {
                isAlive = false;

                const coinsBefore = character.coins;
                const coinsLost = Math.floor(coinsBefore * 0.1);

                character.currentLife = Math.ceil(character.maxLife * 0.3);
                character.currentEnergy = Math.floor(character.maxEnergy * 0.5);
                character.coins = Math.max(0, coinsBefore - coinsLost);
                character.currentLocation = 'Lieu de Respawn - Sanctuaire des Âmes Perdues';

                deathText = `\n💀 **MORT** - Vous avez succombé à vos blessures...\n` +
                           `🕊️ **RESPAWN** - Votre âme trouve refuge au Sanctuaire\n` +
                           `💰 **PERTE** - ${coinsLost} pièces perdues dans la mort\n` +
                           `❤️ **RÉSURRECTION** - Vous renaissez avec ${character.currentLife} PV`;
            }

            await dbManager.updateCharacter(character.id, {
                currentEnergy: character.currentEnergy,
                currentLife: character.currentLife,
                coins: character.coins,
                currentLocation: character.currentLocation
            });

            const riskEmoji = {
                'low': '🟢',
                'medium': '🟡',
                'high': '🟠',
                'extreme': '🔴'
            }[actionAnalysis.riskLevel] || '⚪';

            const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
            const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

            const combatEmoji = {
                'critical_hit': '🎯',
                'normal_hit': '⚔️',
                'glancing_blow': '🛡️',
                'miss': '❌',
                'counter_attacked': '💀'
            }[actionAnalysis.combatAdvantage] || '⚪';

            let detectionWarning = '';
            if (actionAnalysis.detectionRisk) {
                detectionWarning = `\n👁️ **DÉTECTION** - Vos mouvements ont pu être repérés !`;
            }

            let consequencesText = '';
            if (actionAnalysis.consequences && actionAnalysis.consequences.length > 0) {
                const mainConsequence = actionAnalysis.consequences[0];
                if (mainConsequence && !mainConsequence.includes('Erreur')) {
                    consequencesText = `\n⚠️ **CONSÉQUENCES :** ${mainConsequence}`;
                }
            }

            const precisionEmoji = {
                'high': '🎯',
                'medium': '⚪',
                'low': '❌'
            }[actionAnalysis.precision] || '❓';

            const staminaText = staminaRecovery !== 0
                ? `\n⚡ **RÉCUP. ENDURANCE :** ${staminaRecovery > 0 ? '+' : ''}${staminaRecovery}`
                : '';

            const responseText = `╔══════════════════════════════════╗
║ 🏰 **${character.kingdom}** | 🎯 **${character.name}**
║ ⚡ Niveau ${character.level} • Grade ${character.powerLevel} • Friction ${character.frictionLevel}
╠══════════════════════════════════╣
║ ❤️ Vie: ${character.currentLife}/${character.maxLife} (-${energyCost})${staminaText}
║ 💰 Or: ${character.coins} pièces
╠══════════════════════════════════╣
║ ${precisionEmoji} Précision: ${actionAnalysis.precision.toUpperCase()}
║ ${riskEmoji} Risque: ${actionAnalysis.riskLevel.toUpperCase()}
║ 🎯 Action: ${actionAnalysis.actionType}
║ ${combatEmoji} Combat: ${actionAnalysis.combatAdvantage?.replace('_', ' ') || 'N/A'}
╚══════════════════════════════════╝

📜 **NARRATION:**
${narration}

${equipmentWarning}${detectionWarning}${consequencesText}

${isAlive ? '🤔 *Que fais-tu ensuite ?*' : '💀 *Vous renaissez au Sanctuaire... Que faites-vous ?*'}`;

            let actionImage = null;
            let actionAudio = null;
            let actionVideo = null;
            try {
                const mediaResult = await imageGenerator.generateCharacterActionImageWithVoice(character, message, narration);
                actionImage = mediaResult.image;
                actionAudio = mediaResult.audio;

                // Générer la vidéo d'action avec HuggingFace en priorité
                actionVideo = await imageGenerator.generateActionVideo(character, message, narration);
                if (actionVideo) {
                    console.log('✅ Vidéo d\'action prête pour envoi:', actionVideo);
                }

            } catch (mediaError) {
                console.error('❌ Erreur génération média:', mediaError.message);
            }

            return {
                text: responseText,
                image: actionImage,
                audio: actionAudio,
                video: actionVideo
            };

        } catch (error) {
            console.error('❌ Erreur lors du traitement IA:', error);

            const energyCost = 10;
            character.currentEnergy = Math.max(0, character.currentEnergy - energyCost);

            await dbManager.updateCharacter(character.id, {
                currentEnergy: character.currentEnergy
            });

            const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
            const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

            return {
                text: `🎮 **${character.name}** - *${character.currentLocation}*\n\n` +
                      `📖 **Action :** "${message}"\n\n` +
                      `❤️ **Vie :** ${lifeBar}\n` +
                      `⚡ **Énergie :** ${energyBar} (-${energyCost})\n` +
                      `💰 **Argent :** ${character.coins} pièces d'or\n\n` +
                      `⚠️ Le narrateur analyse ton action... Les systèmes IA sont temporairement instables.\n\n` +
                      `💭 *Continue ton aventure...*`
            };
        }
    }

    generateBar(current, max, icon) {
        const percentage = Math.round((current / max) * 100);
        const filledBars = Math.round(percentage / 20);
        const emptyBars = 5 - filledBars;

        return icon.repeat(filledBars) + '⬜'.repeat(emptyBars) + ` (${percentage}%)`;
    }

    formatEquipment(equipment) {
        if (!equipment || Object.keys(equipment).length === 0) {
            return '• Aucun équipement';
        }

        let formatted = '';
        if (equipment.weapon) formatted += `• Arme : ${equipment.weapon}\n`;
        if (equipment.armor) formatted += `• Armure : ${equipment.armor}\n`;
        if (equipment.accessories && equipment.accessories.length > 0) {
            formatted += `• Accessoires : ${equipment.accessories.join(', ')}\n`;
        }

        return formatted || '• Aucun équipement';
    }

    async handleHelpCommand({ imageGenerator }) {
        return {
            text: `📱 **AIDE - FRICTION ULTIMATE**\n\n` +
                  `🎮 **Commandes de base :**\n` +
                  `• /menu - Menu principal\n` +
                  `• /créer - Créer un personnage\n` +
                  `• /modifier - Modifier l'apparence de ton personnage\n` +
                  `• /fiche - Fiche de personnage\n\n` +
                  `🌍 **Exploration :**\n` +
                  `• /royaumes - Les 12 royaumes\n` +
                  `• /ordres - Les 7 ordres\n` +
                  `• /carte - Carte du monde\n\n` +
                  `⚔️ **Combat :**\n` +
                  `• /combat - Système de combat\n` +
                  `• /inventaire - Gestion équipement\n\n` +
                  `💀 **Le monde de Friction est impitoyable !**\n` +
                  `Chaque action doit être précise et réfléchie.`,
            image: await imageGenerator.generateHelpImage()
        };
    }

    async handleKingdomsCommand({ dbManager, imageGenerator }) {
        const kingdoms = await dbManager.getAllKingdoms();

        let kingdomsText = `🏰 **LES 12 ROYAUMES DE FRICTION ULTIMATE**\n\n`;

        kingdoms.forEach((kingdom, index) => {
            kingdomsText += `**${index + 1}. ${kingdom.name} (${kingdom.id})**\n` +
                           `${kingdom.description}\n` +
                           `🌍 **Géographie :** ${kingdom.geography}\n` +
                           `🎭 **Culture :** ${kingdom.culture}\n` +
                           `⚔️ **Spécialités :** ${kingdom.specialties.join(', ')}\n` +
                           `✨ **Particularités :** ${kingdom.particularities}\n\n`;
        });

        let kingdomImage = null;
        try {
            kingdomImage = await imageGenerator.generateWorldMap({
                style: '3d',
                description: 'Fantasy kingdoms overview with multiple magical realms and territories'
            });
        } catch (error) {
            console.log('⚠️ Impossible de générer l\'image des royaumes, continuons sans image');
        }

        return {
            text: kingdomsText,
            image: kingdomImage
        };
    }

    async handleOrdersCommand({ dbManager, imageGenerator }) {
        const orders = await dbManager.getAllOrders();

        let ordersText = `⚔️ **LES 7 ORDRES DE FRICTION ULTIMATE**\n\n`;

        orders.forEach((order, index) => {
            ordersText += `**${index + 1}. ${order.name}**\n` +
                         `${order.description}\n` +
                         `🏰 **Localisation :** ${order.location}\n` +
                         `⚔️ **Spécialités :** ${order.specialties.join(', ')}\n\n`;
        });

        return {
            text: ordersText,
            image: await imageGenerator.generateOrdersOverview()
        };
    }

    async handleButtonsTestCommand({ player, chatId, dbManager, sock }) {
        try {
            if (!sock || !sock.buttonManager) {
                return {
                    text: `🔘 **DÉMONSTRATION BOUTONS INTERACTIFS**\n\n` +


    async handleReputationCommand({ player, dbManager }) {
        const reputation = await dbManager.getTemporaryData(player.id, 'reputation') || {
            honor: 50, fear: 0, respect: 50, notoriety: 0
        };

        const reputationText = `🏆 **RÉPUTATION DE ${player.username.toUpperCase()}**\n\n` +
                              `⚔️ **Honneur :** ${reputation.honor}/100 ${this.getReputationBar(reputation.honor)}\n` +
                              `😨 **Peur :** ${reputation.fear}/100 ${this.getReputationBar(reputation.fear)}\n` +
                              `🤝 **Respect :** ${reputation.respect}/100 ${this.getReputationBar(reputation.respect)}\n` +
                              `🔥 **Notoriété :** ${reputation.notoriety}/100 ${this.getReputationBar(reputation.notoriety)}\n\n` +
                              `📊 **Effets actifs :**\n` +
                              `${this.advancedMechanics.getReputationEffects(reputation).join('\n')}`;

        return { text: reputationText };
    }

    async handleEventsCommand({ player, dbManager }) {
        const character = await dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return { text: "❌ Aucun personnage trouvé !" };
        }

        const randomEvent = await this.advancedMechanics.triggerRandomEvent(character, character.currentLocation);
        const socialEvent = this.advancedMechanics.generateSocialEvent(character, character.currentLocation);

        const eventsText = `🎲 **ÉVÉNEMENTS EN COURS**\n\n` +
                          `🌟 **Événement aléatoire :**\n${randomEvent.description}\n` +
                          `Choix : ${randomEvent.choices.join(' | ')}\n\n` +
                          `🏛️ **Événement social :**\n${socialEvent.description}\n` +
                          `Effets : ${socialEvent.effects.join(', ')}\n` +
                          `Durée : ${socialEvent.duration}\n\n` +
                          `💡 **Tapez votre choix pour participer !**`;

        return { text: eventsText };
    }

    async handleWeatherCommand({ player, dbManager }) {
        const character = await dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return { text: "❌ Aucun personnage trouvé !" };
        }

        const weather = this.advancedMechanics.weatherSystem.updateWeather(character.currentLocation);
        
        const weatherText = `🌤️ **MÉTÉO À ${character.currentLocation.toUpperCase()}**\n\n` +
                           `☁️ **Conditions :** ${this.advancedMechanics.weatherSystem.currentWeather}\n` +
                           `👁️ **Visibilité :** ${weather.visibility}%\n` +
                           `🏃 **Mobilité :** ${weather.movement}%\n` +
                           `😊 **Ambiance :** ${weather.mood}\n\n` +
                           `⚠️ **Impact sur le gameplay en cours...**`;

        return { text: weatherText };
    }

    async handleMarketCommand({ player, dbManager }) {
        const marketEvents = this.advancedMechanics.economyEngine.marketEvents;
        
        const marketText = `💰 **MARCHÉ DYNAMIQUE**\n\n` +
                          `📈 **Événements économiques actifs :**\n` +
                          `${marketEvents.map(e => `• ${e.event}`).join('\n')}\n\n` +
                          `💡 **Les prix s'adaptent à vos actions et aux événements mondiaux !**\n` +
                          `🔄 **Système économique en temps réel actif**`;

        return { text: marketText };
    }

    async handleFactionsCommand({ player, dbManager }) {
        const factionStandings = await dbManager.getTemporaryData(player.id, 'faction_standings') || {};
        
        const factionsText = `⚔️ **RELATIONS AVEC LES FACTIONS**\n\n` +
                            `${Object.entries(factionStandings).map(([faction, standing]) => 
                                `🏛️ **${faction}:** ${standing}/100 ${this.getReputationBar(standing)}`
                            ).join('\n')}\n\n` +
                            `💡 **Vos actions affectent vos relations !**\n` +
                            `🤝 **Formez des alliances ou créez des ennemis**`;

        return { text: factionsText };
    }

    getReputationBar(value) {
        const filled = Math.floor(value / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

                          `⚠️ Système de boutons non initialisé.\n\n` +
                          `Les boutons simulés avec des sondages WhatsApp permettent de créer des interfaces interactives sans API officielle !\n\n` +
                          `🎮 Chaque sondage = un bouton\n` +
                          `📊 Cliquer sur le sondage = activer l'action\n\n` +
                          `Cette fonctionnalité sera bientôt disponible !`
                };
            }

            const character = await dbManager.getCharacterByPlayer(player.id);

            const buttonManager = sock.buttonManager;

            await sock.sendMessage(chatId, {
                text: `🔘 **DÉMONSTRATION BOUTONS INTERACTIFS**\n\n` +
                      `🎮 Voici comment fonctionne le système de boutons simulés avec des sondages WhatsApp !\n\n` +
                      `✨ Chaque "bouton" est en fait un sondage avec une seule option\n` +
                      `📊 Cliquer dessus équivaut à appuyer sur un bouton\n\n` +
                      `**Menu de test :**`
            });

            setTimeout(async () => {
                await buttonManager.sendMainGameMenu(chatId, character);

                setTimeout(async () => {
                    await buttonManager.sendActionMenu(chatId);

                    setTimeout(async () => {
                        await buttonManager.sendConfirmationMenu(chatId, "Voulez-vous continuer le test ?");
                    }, 2000);
                }, 2000);
            }, 1000);

            return {
                text: '',
                skipResponse: true
            };

        } catch (error) {
            console.error('❌ Erreur démonstration boutons:', error);
            return {
                text: `❌ **Erreur lors de la démonstration des boutons**\n\n` +
                      `Le système rencontre un problème technique.\n\n` +
                      `Veuillez réessayer plus tard ou contactez l'administrateur.`
            };
        }
    }

    async handleCombatCommand({ imageGenerator }) {
        return {
            text: `⚔️ **SYSTÈME DE COMBAT - FRICTION ULTIMATE**\n\n` +
                  `🌟 **Niveaux de puissance (G à A) :**\n` +
                  `• G - Très faible (débutants)\n` +
                  `• F - Faible (apprentis)\n` +
                  `• E - Moyen-faible (soldats basiques)\n` +
                  `• D - Moyen (combattants aguerris)\n` +
                  `• C - Moyen-fort (guerriers expérimentés)\n` +
                  `• B - Fort (spécialistes du combat)\n` +
                  `• A - Très fort (maîtres du combat)\n\n` +
                  `⚡ **Barres de combat :**\n` +
                  `• ❤️ Vie : Détermine ta survie\n` +
                  `• ⚡ Énergie : Consommée par les actions\n\n` +
                  `💀 **ATTENTION :** Chaque attaque doit être précise :\n` +
                  `• Mouvement exact (distance en mètres)\n` +
                  `• Arme utilisée et angle d\'attaque\n` +
                  `• Partie du corps visée\n\n` +
                  `🎯 **Sans précision = vulnérabilité !**`,
            image: await imageGenerator.generateCombatGuideImage()
        };
    }

    async handleInventoryCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !`
            };
        }

        return {
            text: `🎒 **INVENTAIRE DE ${character.name.toUpperCase()}**\n\n` +
                  `💰 **Pièces :** ${character.coins}\n\n` +
                  `⚔️ **Équipement porté :**\n` +
                  `${this.formatEquipment(character.equipment)}\n\n` +
                  `📦 **Objets dans l'inventaire :**\n` +
                  `${this.formatInventory(character.inventory)}\n\n` +
                  `🔧 **Commandes d'équipement :**\n` +
                  `• Pour équiper : "équiper [objet]"\n` +
                  `• Pour déséquiper : "retirer [objet]"\n` +
                  `• Pour utiliser : "utiliser [objet]"`,
            image: await imageGenerator.generateInventoryImage(character)
        };
    }

    formatInventory(inventory) {
        if (!inventory || inventory.length === 0) {
            return '• Inventaire vide';
        }

        return inventory.map(item => `• ${item.itemId} (x${item.quantity})`).join('\n');
    }

    formatTechniques(techniques) {
        if (!techniques || techniques.length === 0) {
            return '• Aucune technique apprise';
        }

        return techniques.map(technique => `• ${technique}`).join('\n');
    }

    async handleMapCommand({ imageGenerator }) {
        return {
            text: `🗺️ **CARTE DU MONDE - FRICTION ULTIMATE**\n\n` +
                  `🏰 **Les 12 Royaumes sont dispersés à travers :**\n` +
                  `• Plaines fertiles d\'Aegyria\n` +
                  `• Forêts sombres de Sombrenuit\n` +
                  `• Déserts brûlants de Khelos\n` +
                  `• Ports fortifiés d\'Abrantis\n` +
                  `• Montagnes enneigées de Varha\n` +
                  `• Et bien d\'autres contrées dangereuses...\n\n` +
                  `⚔️ **Les 7 Ordres ont établi leurs quartiers :**\n` +
                  `• Dans les sanctuaires profanés\n` +
                  `• Les citadelles fumantes\n` +
                  `• Les forteresses des ombres\n` +
                  `• Et d\'autres lieux mystérieux...\n\n` +
                  `💀 **Chaque région est dangereuse !**`,
            image: await imageGenerator.generateWorldMap()
        };
    }

    async handlePlayCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `🎮 **MODE JEU ACTIVÉ**\n\n` +
                      `❌ Tu n\'as pas encore de personnage !\n\n` +
                      `✨ **Pour commencer à jouer :**\n` +
                      `1️⃣ Utilise /créer pour créer ton personnage\n` +
                      `2️⃣ Puis utilise /jouer pour entrer dans le monde\n\n` +
                      `💬 **Note :** En mode jeu, tes messages seront interprétés comme des actions de jeu.\n` +
                      `Utilise /aide pour voir toutes les commandes disponibles.`,
                image: await imageGenerator.generateMenuImage()
            };
        }

        await dbManager.setTemporaryData(player.id, 'game_mode', true);

        return {
            text: `🎮 **MODE JEU ACTIVÉ** 🎮\n\n` +
                  `👤 **${character.name}** est maintenant en jeu !\n` +
                  `📍 **Position :** ${character.currentLocation}\n` +
                  `❤️ **Vie :** ${character.currentLife}/${character.maxLife}\n` +
                  `⚡ **Énergie :** ${character.currentEnergy}/${character.maxEnergy}\n\n` +
                  `🎯 **Tes prochains messages seront interprétés comme des actions de jeu.**\n\n` +
                  `📝 **Exemples d\'actions :**\n` +
                  `• "Je regarde autour de moi"\n` +
                  `• "J\'avance vers le nord"\n` +
                  `• "Je cherche des ennemis"\n` +
                  `• "J\'attaque avec mon épée"\n\n` +
                  `💬 **Besoin d\'aide :** utilise /aide pour voir toutes les commandes\n` +
                  `⚙️ **Pour sortir du mode jeu :** utilise /menu\n\n` +
                  `🔥 **L\'aventure commence maintenant !**`,
            image: await imageGenerator.generateCharacterImage(character)
        };
    }
    async handleGenderSelection({ player, message, dbManager, imageGenerator }) {
        await dbManager.setTemporaryData(player.id, 'creation_started', true);

        let gender;
        const input = message.toUpperCase().trim();
        if (input === 'HOMME' || input === 'H' || input === '1') {
            gender = 'male';
        } else if (input === 'FEMME' || input === 'F' || input === '2') {
            gender = 'female';
        } else {
            return {
                text: `❌ Choix invalide ! \n\n` +
                      `Tape **HOMME**, **H**, **FEMME** ou **F**`
            };
        }

        await dbManager.setTemporaryData(player.id, 'creation_gender', gender);

        const kingdoms = await dbManager.getAllKingdoms();
        let kingdomText = `👤 **Sexe sélectionné :** ${gender === 'male' ? 'HOMME' : 'FEMME'}\n\n` +
                         `🏰 **Étape 2/3 - Choisis ton royaume :**\n\n`;

        kingdoms.forEach((kingdom, index) => {
            kingdomText += `**${index + 1}.** ${kingdom.name} - ${kingdom.description}\n`;
        });

        kingdomText += `\n⚡ **Tape le numéro du royaume (1 à 12)**`;

        let kingdomImage = null;
        try {
            kingdomImage = await imageGenerator.generateWorldMap({
                style: '3d',
                description: 'Fantasy kingdoms overview with multiple realms, castles, and magical lands'
            });
        } catch (error) {
            console.log('⚠️ Impossible de générer l\'image des royaumes, continuons sans image');
        }

        return {
            text: kingdomText,
            image: kingdomImage
        };
    }

    async handleKingdomSelection({ player, kingdomNumber, dbManager, imageGenerator }) {
        const kingdoms = await dbManager.getAllKingdoms();

        if (kingdomNumber < 1 || kingdomNumber > kingdoms.length) {
            return {
                text: `❌ Royaume invalide ! \n\n` +
                      `Choisis un numéro entre 1 et ${kingdoms.length}`
            };
        }

        const selectedKingdom = kingdoms[kingdomNumber - 1];

        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');

        if (!gender) {
            return {
                text: `❌ Erreur : genre non trouvé. Recommence la création avec /créer`
            };
        }

        await dbManager.setTemporaryData(player.id, 'creation_kingdom', selectedKingdom.id);

        console.log(`✅ Royaume sélectionné: ${selectedKingdom.name} (ID: ${selectedKingdom.id}) pour le joueur ${player.id}`);

        return {
            text: `🏰 **Royaume sélectionné :** ${selectedKingdom.name}\n\n` +
                  `👤 **Sexe :** ${gender === 'male' ? 'Homme' : 'Femme'}\n` +
                  `🏰 **Royaume :** ${selectedKingdom.name}\n\n` +
                  `📝 **Étape 3/4 - Donne un nom à ton personnage :**\n\n` +
                  `✍️ Écris simplement le nom que tu veux pour ton personnage.\n` +
                  `⚠️ **Attention :** Le nom ne peut pas être modifié après !`,
            image: await imageGenerator.generateKingdomImage(selectedKingdom.id)
        };
    }

    async handleCharacterNameInput({ player, name, dbManager, imageGenerator }) {
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomId = await dbManager.getTemporaryData(player.id, 'creation_kingdom');

        if (!gender || !kingdomId) {
            return {
                text: `❌ Erreur : données de création manquantes. Recommence avec /créer`
            };
        }

        const nameRegex = /^[a-zA-Z0-9àâäéèêëïîôöùûüÿç\s-]{2,20}$/;
        if (!nameRegex.test(name)) {
            return {
                text: `❌ Le nom doit contenir entre 2 et 20 caractères (lettres, chiffres, espaces, tirets uniquement) !`
            };
        }

        const existingCharacter = await dbManager.getCharacterByName(name.trim());
        if (existingCharacter) {
            return {
                text: `❌ Ce nom est déjà pris ! Choisis un autre nom.`
            };
        }

        await dbManager.setTemporaryData(player.id, 'creation_name', name.trim());

        return {
            text: `✅ **Nom accepté :** ${name}\n\n` +
                  `📸 **Étape 4/4 - Photo de ton visage :**\n\n` +
                  `🖼️ Envoie maintenant une photo de ton visage pour ton personnage.\n` +
                  `⚠️ **Important :**\n` +
                  `• Seule la zone du visage sera utilisée\n` +
                  `• Photo claire et bien éclairée recommandée\n` +
                  `• Si tu n\'as pas de photo, écris "SANS_PHOTO"\n\n` +
                  `📷 **Envoie ta photo maintenant...**`
        };
    }

    async finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage = false, imageBuffer = null }) {
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomId = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        const name = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (!gender || !kingdomId || !name) {
            return {
                text: `❌ Erreur : données de création manquantes. Recommence avec /créer`
            };
        }

        const kingdom = await dbManager.getKingdomById(kingdomId);
        const kingdomName = kingdom ? kingdom.name : kingdomId;

        const characterData = {
            playerId: player.id,
            name: name,
            gender: gender,
            kingdom: kingdomId,
            level: 1,
            experience: 0,
            powerLevel: 'G',
            frictionLevel: 'G',
            currentLife: 100,
            maxLife: 100,
            currentEnergy: 100,
            maxEnergy: 100,
            currentLocation: `Capitale de ${kingdomName}`,
            position: { x: 0, y: 0, z: 0 },
            coins: 100,
            equipment: {},
            inventory: [],
            learnedTechniques: [],
            customImage: hasCustomImage
        };

        console.log(`✅ Création personnage: ${name}, Royaume: ${kingdomName} (${kingdomId}), Genre: ${gender}, Image: ${hasCustomImage}`);

        try {
            const newCharacter = await dbManager.createCharacter(characterData);

            if (hasCustomImage && imageBuffer) {
                await imageGenerator.saveCustomCharacterImage(newCharacter.id, imageBuffer);
            }

            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_gender');
            await dbManager.clearTemporaryData(player.id, 'creation_kingdom');
            await dbManager.clearTemporaryData(player.id, 'creation_name');

            const imageType = hasCustomImage ? "avec ta photo personnalisée" : "avec une image générée";

            let characterImage = null;
            try {
                characterImage = await imageGenerator.generateCharacterImage(newCharacter);
            } catch (imageError) {
                console.log('⚠️ Impossible de générer l\'image du personnage, continuons sans image:', imageError.message);
            }

            return {
                text: `🎉 **PERSONNAGE CRÉÉ AVEC SUCCÈS !**\n\n` +
                      `👤 **Nom :** ${newCharacter.name}\n` +
                      `👤 **Sexe :** ${gender === 'male' ? 'Homme' : 'Femme'}\n` +
                      `🏰 **Royaume :** ${kingdomName}\n` +
                      `📸 **Image :** ${imageType}\n` +
                      `⚔️ **Niveau :** ${newCharacter.level}\n` +
                      `🌟 **Niveau de puissance :** ${newCharacter.powerLevel}\n\n` +
                      `🎮 Utilise **/menu** pour découvrir tes options !`,
                image: characterImage
            };

        } catch (error) {
            console.error('❌ Erreur lors de la création du personnage:', error);
            return {
                text: `❌ Erreur lors de la création du personnage. Réessaie plus tard.`
            };
        }
    }

    async handleModifyCharacterCommand({ player, dbManager, imageGenerator, sock, chatId }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !\n\n` +
                      `Utilise la commande /créer pour en créer un.`
            };
        }

        if (this.characterCustomization) {
            const success = await this.characterCustomization.startCharacterCustomization(
                player.whatsappNumber,
                chatId,
                true
            );

            if (success) {
                return { text: '' };
            } else {
                return {
                    text: '❌ Impossible de démarrer le système de modification. Une personnalisation est peut-être déjà en cours.\n\n' +
                          'Tapez "annuler" si vous avez un processus en cours, puis réessayez /modifier.'
                };
            }
        } else {
            return await this.handleOldModifyCharacterCommand({ player, dbManager, imageGenerator });
        }
    }

    async handleOldModifyCharacterCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        await dbManager.setTemporaryData(player.id, 'modification_started', true);

        let characterImage = null;
        try {
            characterImage = await imageGenerator.generateCharacterImage(character);
        } catch (imageError) {
            console.log('⚠️ Impossible de générer l\'image du personnage pour modification, continuons sans image:', imageError.message);
        }

        return {
            text: `✨ **MODIFICATION DE PERSONNAGE (Mode Simple)**\n\n` +
                  `👤 **Personnage actuel :** ${character.name}\n` +
                  `🏰 **Royaume :** ${character.kingdom}\n` +
                  `👤 **Sexe :** ${character.gender === 'male' ? 'Homme' : 'Femme'}\n\n` +
                  `⚠️ Le système 3D avancé n'est pas disponible.\n\n` +
                  `🎨 **Nouvelle apparence personnalisée :**\n\n` +
                  `📝 Décris en détail l'apparence que tu veux pour ton personnage :\n` +
                  `• Couleur des cheveux, des yeux\n` +
                  `• Taille, corpulence\n` +
                  `• Style vestimentaire\n` +
                  `• Armes et accessoires\n` +
                  `• Cicatrices, tatouages, etc.\n\n` +
                  `✍️ **Écris ta description complète en un seul message :**`,
            image: characterImage
        };
    }

    async handleModificationDescription({ player, description, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            await dbManager.clearTemporaryData(player.id, 'modification_started');
            return {
                text: `❌ Personnage non trouvé. Utilise /créer pour créer un personnage.`
            };
        }

        try {
            console.log(`🎨 Génération nouvelle image pour ${character.name} avec description personnalisée...`);

            const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
            const kingdomDesc = this.getKingdomDescription(character.kingdom);

            const cleanDescription = description.trim();

            const basePrompt = `fantasy ${genderDesc} warrior`;
            const kingdomContext = `from ${character.kingdom} kingdom (${kingdomDesc})`;
            const userCustomization = cleanDescription;
            const artStyle = 'detailed fantasy RPG character art, first person POV perspective, epic fantasy style';

            let fullPrompt = `${basePrompt} ${kingdomContext}, appearance: ${userCustomization}, ${artStyle}`;

            console.log(`🎨 Prompt de modification généré: "${fullPrompt}"`);

            if (!fullPrompt.toLowerCase().includes(cleanDescription.toLowerCase().substring(0, 20))) {
                console.log('⚠️ Description utilisateur mal intégrée, correction...');
                const correctedPrompt = `${userCustomization}, ${basePrompt} ${kingdomContext}, ${artStyle}`;
                console.log(`🔧 Prompt corrigé: "${correctedPrompt}"`);
                fullPrompt = correctedPrompt;
            }

            const imagePath = `temp/character_modified_${character.id}_${Date.now()}.png`;

            console.log(`📝 Description originale: "${cleanDescription}"`);
            console.log(`🎯 Prompt final envoyé: "${fullPrompt}"`);

            await imageGenerator.freepikClient.generateImage(fullPrompt, imagePath, {
                style: '3d',
                perspective: 'first_person',
                nudity: false
            });

            const fs = require('fs').promises;
            const imageBuffer = await fs.readFile(imagePath).catch(() => null);

            await dbManager.clearTemporaryData(player.id, 'modification_started');

            if (imageBuffer) {
                await imageGenerator.saveCustomCharacterImage(character.id, imageBuffer);

                return {
                    text: `✨ **PERSONNAGE MODIFIÉ AVEC SUCCÈS !**\n\n` +
                          `👤 **${character.name}** - Nouvelle apparence générée\n\n` +
                          `📝 **Description appliquée :**\n"${cleanDescription}"\n\n` +
                          `🎨 **Image générée par Freepik avec IA (vue première personne)**\n\n` +
                          `✅ Ton personnage a maintenant une apparence unique basée sur ta description !`,
                    image: imageBuffer
                };
            } else {
                return {
                    text: `❌ Erreur lors de la génération de l'image. Réessaie avec /modifier`
                };
            }

        } catch (error) {
            console.error('❌ Erreur lors de la modification:', error);
            await dbManager.clearTemporaryData(player.id, 'modification_started');

            return {
                text: `❌ Erreur lors de la génération de l'image personnalisée.\n\n` +
                      `Réessaie avec une description plus simple ou utilise /modifier à nouveau.`
            };
        }
    }

    getKingdomDescription(kingdom) {
        const descriptions = {
            'AEGYRIA': 'golden plains kingdom with honor and chivalry, blessed armor and noble weapons',
            'SOMBRENUIT': 'dark mysterious forests with moon magic and shadow spirits, dark robes',
            'KHELOS': 'burning desert kingdom with ancient ruins and nomadic culture, desert garb',
            'ABRANTIS': 'coastal kingdom with naval tradition, sea-themed armor and weapons',
            'VARHA': 'snowy mountain kingdom with beast hunters, fur armor and winter gear',
            'SYLVARIA': 'magical forest kingdom with nature magic, elven-style clothing and equipment',
            'ECLYPSIA': 'dark eclipse lands with shadow magic, dark mystical robes and artifacts',
            'TERRE_DESOLE': 'post-apocalyptic wasteland, scavenged armor and improvised weapons',
            'DRAK_TARR': 'volcanic kingdom with dragon themes, dragon-scale armor and fire weapons',
            'URVALA': 'misty swamp kingdom with alchemy, alchemical gear and mystical accessories',
            'OMBREFIEL': 'gray plains with mercenaries, practical armor and versatile weapons',
            'KHALDAR': 'tropical jungle kingdom, light armor and nature-based weapons'
        };

        return descriptions[kingdom] || 'fantasy kingdom with unique customs and equipment';
    }

    async processDialogueAction({ player, character, message, dbManager, imageGenerator }) {
        try {
            console.log(`💬 Dialogue PNJ détecté pour ${character.name}: ${message}`);

            let playerSpeech = message;
            if (message.includes('"')) {
                const matches = message.match(/"([^"]+)"/);
                if (matches && matches[1]) {
                    playerSpeech = matches[1];
                }
            }

            let npcResponse;
            const sessionId = `player_${player.id}`;

            try {
                console.log('🎭 Génération réponse PNJ avec Groq...');

                if (this.groqClient && this.groqClient.hasValidClient()) {
                    npcResponse = await this.groqClient.generateNPCResponse(
                        'Habitant du village',
                        `un habitant du royaume ${character.kingdom}, personnage amical et curieux`,
                        playerSpeech,
                        {
                            location: character.currentLocation,
                            kingdom: character.kingdom,
                            playerName: character.name
                        }
                    );
                } else {
                    npcResponse = `"Salut ${character.name} ! Que fais-tu par ici ?"`;
                }
            } catch (error) {
                console.error('❌ Erreur génération dialogue PNJ:', error.message);
                npcResponse = `"Bonjour, voyageur. Belle journée, n'est-ce pas ?"`;
            }

            let dialogueImage = null;
            let dialogueAudio = null;

            try {
                const mediaResult = await imageGenerator.generateDialogueImage(
                    character,
                    'Habitant du village',
                    npcResponse,
                    { style: '3d', perspective: 'second_person' }
                );
                dialogueImage = mediaResult.image;
                dialogueAudio = mediaResult.audio;
            } catch (mediaError) {
                console.error('❌ Erreur génération média dialogue:', mediaError.message);
            }

            return {
                text: `💬 ${playerSpeech}\n\n${npcResponse}\n\n📍 *${character.currentLocation}*`,
                image: dialogueImage,
                audio: dialogueAudio
            };

        } catch (error) {
            console.error('❌ Erreur processDialogueAction:', error);
            return {
                text: `❌ Erreur lors du dialogue. Les habitants semblent occupés en ce moment.`
            };
        }
    }

    async handleDeleteCharacter({ player, dbManager, imageGenerator }) {
        try {
            const character = await dbManager.getCharacterByPlayer(player.id);

            if (!character) {
                return {
                    text: `❌ Tu n'as pas de personnage à supprimer.\n\n` +
                          `Utilise /créer pour créer un nouveau personnage.`
                };
            }

            await dbManager.deleteCharacter(character.id);

            await dbManager.clearTemporaryData(player.id, 'game_mode');
            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            console.log(`🗑️ Personnage supprimé: ${character.name} (ID: ${character.id})`);

            return {
                text: `🗑️ **PERSONNAGE SUPPRIMÉ** 🗑️\n\n` +
                      `👤 **${character.name}** a été définitivement supprimé de ${character.kingdom}.\n\n` +
                      `✨ Tu peux maintenant créer un nouveau personnage avec /créer\n\n` +
                      `💀 **Attention :** Cette action est irréversible !`,
                image: await imageGenerator.generateMenuImage()
            };

        } catch (error) {
            console.error('❌ Erreur lors de la suppression du personnage:', error);
            return {
                text: `❌ **Erreur lors de la suppression**\n\n` +
                      `Une erreur s'est produite. Veuillez réessayer plus tard.`
            };
        }
    }

    async generateNPCResponse(character, playerDialogue, sessionId) {
        try {
            if (this.groqClient && this.groqClient.hasValidClient()) {
                return await this.groqClient.generateDialogueResponse(character, playerDialogue, sessionId);
            }

            if (this.openAIClient && this.openAIClient.isAvailable) {
                const context = {
                    character: character,
                    playerMessage: playerDialogue,
                    location: character.currentLocation
                };
                return await this.openAIClient.generateCharacterResponse(character, context, playerDialogue, sessionId);
            }

            return "Le PNJ vous regarde attentivement et hoche la tête.";

        } catch (error) {
            console.error('❌ Erreur génération réponse PNJ:', error);
            return "Le PNJ semble perplexe et ne sait pas quoi répondre.";
        }
    }

    async handleAuthorizeCommand({ player, chatId, message, dbManager, imageGenerator }) {
        try {
            // Extraire le nom du joueur et optionnellement le royaume de la commande
            const parts = message.split(' ');
            if (parts.length < 2) {
                return {
                    text: `📋 **COMMANDE AUTORISE**\n\n` +
                          `Usage: /autorise [nom_du_joueur] [ROYAUME_OPTIONNEL]\n\n` +
                          `**Exemples:**\n` +
                          `• /autorise Jean\n` +
                          `• /autorise Jean AEGYRIA\n\n` +
                          `Si aucun royaume n'est spécifié, le système détectera automatiquement le royaume pour ce groupe.`
                };
            }

            const playerName = parts[1].trim();
            const specifiedKingdom = parts[2] ? parts[2].toUpperCase().trim() : null;

            let kingdom = null;

            // Si un royaume est spécifié dans la commande, l'utiliser et enregistrer l'association
            if (specifiedKingdom) {
                kingdom = await dbManager.getKingdomById(specifiedKingdom);
                
                if (!kingdom) {
                    const kingdoms = await dbManager.getAllKingdoms();
                    let kingdomsList = kingdoms.map((k, i) => `${i + 1}. ${k.name} (${k.id})`).join('\n');
                    
                    return {
                        text: `❌ **ROYAUME INVALIDE**\n\n` +
                              `Le royaume "${specifiedKingdom}" n'existe pas.\n\n` +
                              `**Royaumes disponibles:**\n${kingdomsList}`
                    };
                }

                // Enregistrer automatiquement l'association groupe-royaume
                try {
                    await dbManager.saveChatKingdomAssociation(chatId, kingdom.id);
                    console.log(`✅ Association automatique sauvegardée: ${chatId} -> ${kingdom.id}`);
                } catch (saveError) {
                    console.error('⚠️ Erreur sauvegarde association:', saveError);
                    // Continue malgré l'erreur d'association
                }
            } else {
                // Essayer de récupérer le royaume depuis l'association existante
                kingdom = await this.getKingdomFromChatId(chatId, dbManager);

                if (!kingdom) {
                    return {
                        text: `❌ **GROUPE NON CONFIGURÉ**\n\n` +
                              `Ce groupe WhatsApp n'est pas encore associé à un royaume.\n\n` +
                              `**Solutions:**\n` +
                              `• Utilisez: /autorise ${playerName} ROYAUME_ID\n` +
                              `• Ou configurez d'abord avec: /config_royaume ROYAUME_ID\n\n` +
                              `**Exemples:**\n` +
                              `• /autorise ${playerName} AEGYRIA\n` +
                              `• /config_royaume AEGYRIA`
                    };
                }
            }

            // Rechercher le personnage par nom
            const character = await dbManager.getCharacterByName(playerName);

            if (!character) {
                return {
                    text: `❌ **JOUEUR NON TROUVÉ**\n\n` +
                          `Aucun personnage trouvé avec le nom "${playerName}".\n\n` +
                          `Vérifiez l'orthographe ou demandez au joueur de créer son personnage avec /créer.`
                };
            }

            // Vérifier si le joueur est déjà dans le bon royaume
            if (character.kingdom === kingdom.id) {
                return {
                    text: `✅ **DÉJÀ AUTORISÉ**\n\n` +
                          `Le joueur **${character.name}** est déjà membre du royaume **${kingdom.name}**.\n\n` +
                          `🏰 Royaume actuel: ${kingdom.name}\n` +
                          `📍 Localisation: ${character.currentLocation}`
                };
            }

            // Sauvegarder l'ancien royaume pour l'affichage
            const oldKingdom = character.kingdom;

            // Mettre à jour le royaume du personnage
            await dbManager.updateCharacter(character.id, {
                kingdom: kingdom.id,
                currentLocation: this.getStartingLocation(kingdom.id)
            });

            console.log(`👑 Autorisation: ${character.name} transféré vers ${kingdom.name} via groupe ${chatId}`);

            return {
                text: `👑 **AUTORISATION ACCORDÉE** 👑\n\n` +
                      `✅ Le joueur **${character.name}** a été autorisé dans le royaume **${kingdom.name}**!\n\n` +
                      `🏰 **Ancien royaume:** ${oldKingdom}\n` +
                      `🏰 **Nouveau royaume:** ${kingdom.name}\n` +
                      `📍 **Nouvelle localisation:** ${this.getStartingLocation(kingdom.id)}\n\n` +
                      `${specifiedKingdom ? '✨ **Association groupe-royaume automatiquement enregistrée!**\n\n' : ''}` +
                      `Le joueur peut maintenant participer aux activités de ce royaume.`,
                image: await imageGenerator.generateKingdomImage(kingdom.id)
            };

        } catch (error) {
            console.error('❌ Erreur commande autorise:', error);
            return {
                text: `❌ **ERREUR D'AUTORISATION**\n\n` +
                      `Une erreur s'est produite lors de l'autorisation.\n\n` +
                      `Veuillez réessayer ou contactez un administrateur.`
            };
        }
    }

    async getKingdomFromChatId(chatId, dbManager) {
        try {
            // Récupérer l'association depuis la base de données
            const association = await dbManager.getChatKingdomAssociation(chatId);
            
            if (!association) {
                console.log(`⚠️ Groupe non configuré: ${chatId}`);
                return null;
            }

            console.log(`✅ Groupe ${chatId} mappé vers le royaume ${association.kingdomId}`);

            // Récupérer les informations complètes du royaume
            return await dbManager.getKingdomById(association.kingdomId);
        } catch (error) {
            console.error('❌ Erreur récupération association groupe-royaume:', error);
            return null;
        }
    }

    async handleConfigKingdomCommand({ player, chatId, message, dbManager, imageGenerator }) {
        try {
            const parts = message.split(' ');
            
            if (parts.length < 2) {
                const kingdoms = await dbManager.getAllKingdoms();
                let kingdomsList = kingdoms.map((k, i) => `${i + 1}. ${k.name} (${k.id})`).join('\n');
                
                return {
                    text: `⚙️ **CONFIGURATION ROYAUME**\n\n` +
                          `Usage: /config_royaume [ROYAUME_ID]\n\n` +
                          `**Royaumes disponibles:**\n${kingdomsList}\n\n` +
                          `**Exemple:** /config_royaume AEGYRIA\n\n` +
                          `Cette commande vous aide à configurer ce groupe WhatsApp.\n\n` +
                          `📍 **ID du groupe actuel:** \`${chatId}\`\n\n` +
                          `💡 **Pour les développeurs:** Copiez cet ID pour l'ajouter dans le mapping des groupes.`
                };
            }

            const kingdomId = parts[1].toUpperCase();
            const kingdom = await dbManager.getKingdomById(kingdomId);

            if (!kingdom) {
                return {
                    text: `❌ **ROYAUME INVALIDE**\n\n` +
                          `Le royaume "${kingdomId}" n'existe pas.\n\n` +
                          `Utilisez /config_royaume pour voir la liste des royaumes disponibles.`
                };
            }

            // Vérifier si le groupe est déjà configuré
            const currentKingdom = await this.getKingdomFromChatId(chatId, dbManager);
            
            if (currentKingdom && currentKingdom.id === kingdomId) {
                return {
                    text: `✅ **DÉJÀ CONFIGURÉ**\n\n` +
                          `Ce groupe est déjà associé au royaume **${kingdom.name}**!\n\n` +
                          `🏰 **Royaume:** ${kingdom.name}\n` +
                          `📍 **ID Groupe:** \`${chatId}\`\n\n` +
                          `Les commandes /autorise fonctionnent déjà pour ce royaume.`
                };
            }
            
            // Sauvegarder automatiquement l'association
            try {
                await dbManager.saveChatKingdomAssociation(chatId, kingdomId);
                
                console.log(`✅ Association sauvegardée: ${chatId} -> ${kingdomId}`);
                
                return {
                    text: `✅ **CONFIGURATION RÉUSSIE !**\n\n` +
                          `Le groupe WhatsApp a été automatiquement associé au royaume **${kingdom.name}**!\n\n` +
                          `🏰 **Royaume:** ${kingdom.name}\n` +
                          `🎯 **ID Royaume:** ${kingdom.id}\n` +
                          `📱 **ID Groupe:** \`${chatId}\`\n\n` +
                          `✨ **L'association a été sauvegardée dans la base de données.**\n\n` +
                          `Les commandes /autorise fonctionnent maintenant pour ce royaume !`,
                    image: await imageGenerator.generateKingdomImage(kingdom.id)
                };
            } catch (saveError) {
                console.error('❌ Erreur sauvegarde association:', saveError);
                
                return {
                    text: `❌ **ERREUR DE SAUVEGARDE**\n\n` +
                          `Impossible de sauvegarder l'association du groupe au royaume **${kingdom.name}**.\n\n` +
                          `Erreur: ${saveError.message}\n\n` +
                          `Veuillez réessayer ou contactez un administrateur.`
                };
            }

        } catch (error) {
            console.error('❌ Erreur config royaume:', error);
            return {
                text: `❌ **ERREUR DE CONFIGURATION**\n\n` +
                      `Une erreur s'est produite lors de la configuration.\n\n` +
                      `Veuillez réessayer ou contactez un administrateur.`
            };
        }
    }
}

module.exports = GameEngine;