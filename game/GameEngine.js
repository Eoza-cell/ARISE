const GeminiClient = require('../gemini/GeminiClient');
const OpenAIClient = require('../ai/OpenAIClient');
const OllamaClient = require('../ai/OllamaClient');
const GroqClient = require('../groq/GroqClient');

class GameEngine {
    constructor(dbManager = null) {
        this.dbManager = dbManager;
        this.openAIClient = new OpenAIClient(dbManager);
        this.ollamaClient = new OllamaClient();
        this.geminiClient = new GeminiClient();
        this.groqClient = new GroqClient();
        this.commandHandlers = {
            '/menu': this.handleMenuCommand.bind(this),
            '/créer': this.handleCreateCharacterCommand.bind(this),
            '/créer_personnage': this.handleCreateCharacterCommand.bind(this),
            '/modifier': this.handleModifyCharacterCommand.bind(this),
            '/fiche': this.handleCharacterSheetCommand.bind(this),
            '/aide': this.handleHelpCommand.bind(this),
            '/royaumes': this.handleKingdomsCommand.bind(this),
            '/ordres': this.handleOrdersCommand.bind(this),
            '/combat': this.handleCombatCommand.bind(this),
            '/inventaire': this.handleInventoryCommand.bind(this),
            '/carte': this.handleMapCommand.bind(this),
            '/auberge': this.handleInnCommand.bind(this)
        };
    }

    async processPlayerMessage({ playerNumber, chatId, message, imageMessage, sock, dbManager, imageGenerator }) {
        try {
            // Récupération ou création du joueur
            let player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                // Nouveau joueur - créer avec nom temporaire
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

            // Mise à jour de l'activité du joueur
            await dbManager.updatePlayerActivity(player.id);

            // Traitement des commandes
            const command = message.toLowerCase().trim();

            if (this.commandHandlers[command]) {
                return await this.commandHandlers[command]({ player, chatId, message, dbManager, imageGenerator });
            }

            // Si ce n'est pas une commande, traiter comme action de jeu
            return await this.handleGameAction({ player, chatId, message, imageMessage, sock, dbManager, imageGenerator });

        } catch (error) {
            console.error('❌ Erreur dans le moteur de jeu:', error);
            return {
                text: "❌ Une erreur s'est produite dans le moteur de jeu. Veuillez réessayer."
            };
        }
    }

    async handleMenuCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        let menuText = `🎮 **FRICTION ULTIMATE - Menu Principal**\n\n`;

        if (character) {
            menuText += `👤 **Personnage :** ${character.name}\n` +
                       `🏰 **Royaume :** ${character.kingdom}\n` +
                       `⚔️ **Ordre :** ${character.order || 'Aucun'}\n` +
                       `📊 **Niveau :** ${character.level} (${character.powerLevel})\n\n`;
        }

        menuText += `📱 **Commandes disponibles :**\n` +
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

        return {
            text: menuText,
            image: await imageGenerator.generateMenuImage()
        };
    }

    async handleCreateCharacterCommand({ player, dbManager, imageGenerator }) {
        const existingCharacter = await dbManager.getCharacterByPlayer(player.id);

        if (existingCharacter) {
            return {
                text: `👤 Tu as déjà un personnage : **${existingCharacter.name}**\n\n` +
                      `🏰 Royaume : ${existingCharacter.kingdom}\n` +
                      `⚔️ Ordre : ${existingCharacter.order || 'Aucun'}\n\n` +
                      `Pour créer un nouveau personnage, tu dois d'abord supprimer l'actuel.\n` +
                      `Écris "SUPPRIMER_PERSONNAGE" pour confirmer.`,
                image: await imageGenerator.generateCharacterImage(existingCharacter)
            };
        }

        // Processus de création de personnage
        return await this.startCharacterCreation({ player, dbManager, imageGenerator });
    }

    async startCharacterCreation({ player, dbManager, imageGenerator }) {
        // Marquer le début de la création pour sécuriser le processus
        await dbManager.setTemporaryData(player.id, 'creation_started', true);

        // Processus simplifié en 3 étapes courtes
        let creationText = `⚔️ **CRÉATION RAPIDE DE PERSONNAGE**\n\n` +
                          `🎯 **Étape 1/3 - Sexe**\n` +
                          `👤 Choisis ton sexe :\n` +
                          `• Tape **1** pour HOMME\n` +
                          `• Tape **2** pour FEMME\n\n` +
                          `🏰 **Aperçu des royaumes (étape 2) :**\n` +
                          `1️⃣ AEGYRIA - Chevaliers honorables\n` +
                          `2️⃣ SOMBRENUIT - Maîtres des ombres\n` +
                          `3️⃣ KHELOS - Nomades du désert\n` +
                          `4️⃣ ABRANTIS - Marins intrépides\n` +
                          `5️⃣ VARHA - Chasseurs montagnards\n` +
                          `6️⃣ SYLVARIA - Gardiens de la forêt\n` +
                          `7️⃣ ECLYPSIA - Seigneurs des éclipses\n` +
                          `8️⃣ TERRE_DESOLE - Survivants post-apocalyptiques\n` +
                          `9️⃣ DRAK_TARR - Forgeurs draconiques\n` +
                          `🔟 URVALA - Alchimistes nécromants\n` +
                          `1️⃣1️⃣ OMBREFIEL - Mercenaires exilés\n` +
                          `1️⃣2️⃣ KHALDAR - Pirates des jungles\n\n` +
                          `⚡ **Processus ultra-rapide :**\n` +
                          `1. Sexe → tape 1 ou 2\n` +
                          `2. Royaume → tape 1 à 12\n` +
                          `3. Nom → écris ton nom\n\n` +
                          `🚀 Création terminée en 3 messages !`;

        return {
            text: creationText,
            image: await imageGenerator.generateMenuImage() // Menu plus simple et rapide
        };
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

        return {
            text: sheetText,
            image: await imageGenerator.generateCharacterSheet(character)
        };
    }

    async handleGameAction({ player, chatId, message, imageMessage, sock, dbManager, imageGenerator }) {
        // Gestion des images pour la création de personnage
        if (imageMessage) {
            console.log('📸 Image reçue - vérification du contexte de création...');
            const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
            const tempName = await dbManager.getTemporaryData(player.id, 'creation_name');

            console.log(`🔍 Contexte création: started=${!!creationStarted}, name=${!!tempName}`);

            if (creationStarted && tempName) {
                try {
                    console.log('📸 Réception d\'une image pour la création de personnage...');
                    console.log('🔄 Tentative de téléchargement de l\'image...');

                    // Télécharger l'image
                    const imageBuffer = await sock.downloadMediaMessage(imageMessage);

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
            } else {
                console.log('📸 Image reçue mais pas en cours de création de personnage');
            }
        }

        // Si on a une image mais qu'on n'est pas en création, ignorer
        if (imageMessage && !message) {
            return {
                text: `📸 Image reçue, mais aucune action prévue pour les images pour le moment.`
            };
        }
        // D'abord traiter les actions de création de personnage (avant de vérifier si personnage existe)

        // Vérifier si une création est en cours
        const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');

        // Traitement des actions de création de personnage en cours (seulement si création initiée)
        const tempGender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const tempKingdom = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        
        // Étape 1: Sélection du genre (seulement si aucun genre n'est déjà sélectionné)
        if (creationStarted && !tempGender && (message.toUpperCase() === 'HOMME' || message.toUpperCase() === 'FEMME' || message === '1' || message === '2')) {
            return await this.handleGenderSelection({ player, message, dbManager, imageGenerator });
        }

        // Étape 2: Gestion des numéros de royaumes (1-12) - seulement si le genre est sélectionné mais pas le royaume
        const kingdomNumber = parseInt(message);
        if (creationStarted && tempGender && !tempKingdom && kingdomNumber >= 1 && kingdomNumber <= 12) {
            return await this.handleKingdomSelection({ player, kingdomNumber, dbManager, imageGenerator });
        }

        // Gestion du nom de personnage (si en cours de création)  
        const tempKingdom = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        const tempName = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (creationStarted && tempGender && tempKingdom && !tempName) {
            // Le joueur est en train de donner le nom de son personnage
            return await this.handleCharacterNameInput({ player, name: message, dbManager, imageGenerator });
        }

        // Gestion de la finalisation de création (après nom, en attente d'image ou "SANS_PHOTO")
        if (creationStarted && tempGender && tempKingdom && tempName) {
            if (message.toUpperCase() === 'SANS_PHOTO') {
                return await this.finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage: false });
            }
            // Si c'est un autre message texte, redemander l'image
            return {
                text: `📸 **En attente de ta photo de visage...**\n\n` +
                      `🖼️ Envoie une image de ton visage ou écris "SANS_PHOTO" pour continuer sans photo personnalisée.`
            };
        }

        // Gestion de la modification de personnage
        const modificationStarted = await dbManager.getTemporaryData(player.id, 'modification_started');
        if (modificationStarted) {
            return await this.handleModificationDescription({ player, description: message, dbManager, imageGenerator });
        }

        // Maintenant vérifier si le personnage existe pour les actions de jeu normales
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !`
            };
        }

        // Gestion des actions d'auberge (équiper, repos, acheter, vendre)
        if (message.toLowerCase().startsWith('équiper ') || 
            message.toLowerCase().startsWith('repos') ||
            message.toLowerCase().startsWith('acheter ') ||
            message.toLowerCase().startsWith('vendre ')) {
            return await this.handleInnAction({ player, character, message, dbManager, imageGenerator });
        }

        // Traitement des actions de jeu normales avec IA Gemini
        return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
    }

    async processGameActionWithAI({ player, character, message, dbManager, imageGenerator }) {
        try {
            const sessionId = `player_${player.id}`; // Session unique par joueur
            
            // Analyser l'action du joueur avec OpenAI
            const actionAnalysis = await this.openAIClient.analyzePlayerAction(message, {
                character: character,
                location: character.currentLocation,
                kingdom: character.kingdom
            }, sessionId);

            // Générer la narration avec état du jeu intégré
            let narration;
            const gameState = {
                life: character.currentLife,
                maxLife: character.maxLife,
                energy: character.currentEnergy,
                maxEnergy: character.maxEnergy,
                equipment: character.equipment,
                coins: character.coins,
                powerLevel: character.powerLevel,
                kingdom: character.kingdom
            };

            try {
                // Priorité absolue à Groq pour la vitesse et qualité
                if (this.groqClient && this.groqClient.hasValidClient()) {
                    console.log('🚀 Génération narration avec Groq (ultra-rapide)...');
                    narration = await this.groqClient.generateExplorationNarration(character.currentLocation, message, sessionId, gameState);
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

            // Appliquer les coûts énergétiques
            const energyCost = Math.min(actionAnalysis.energyCost, character.currentEnergy);
            character.currentEnergy = Math.max(0, character.currentEnergy - energyCost);

            // Sauvegarder les changements
            await dbManager.updateCharacter(character.id, {
                currentEnergy: character.currentEnergy
            });

            const riskEmoji = {
                'low': '🟢',
                'medium': '🟡', 
                'high': '🟠',
                'extreme': '🔴'
            }[actionAnalysis.riskLevel] || '⚪';

            // Préparer la réponse avec narration Groq prioritaire
            const responseText = `🎮 **${character.name}** - *${character.currentLocation}*\n\n` +
                               `📖 **Narration :** ${narration}\n\n` +
                               `⚡ **Énergie :** ${character.currentEnergy}/${character.maxEnergy} (-${energyCost})\n` +
                               `${riskEmoji} **Niveau de risque :** ${actionAnalysis.riskLevel.toUpperCase()}\n` +
                               `🎯 **Type d'action :** ${actionAnalysis.actionType}\n\n` +
                               `💭 *Que fais-tu ensuite ?*`;

            // Essayer de générer l'image, mais ne pas bloquer l'envoi si ça échoue
            try {
                const image = await imageGenerator.generateCharacterActionImage(character, message, narration);
                return {
                    text: responseText,
                    image: image
                };
            } catch (imageError) {
                console.log('⚠️ Image échouée, envoi narration seule:', imageError.message);
                return {
                    text: responseText
                };
            }

        } catch (error) {
            console.error('❌ Erreur lors du traitement IA:', error);
            return {
                text: `🎮 **${character.name}** - *${character.currentLocation}*\n\n` +
                      `📖 **Action :** "${message}"\n\n` +
                      `⚠️ Le narrateur analyse ton action...\n\n` +
                      `💭 *Continue ton aventure...*`
            };
        }
    }

    // Méthodes utilitaires
    generateBar(current, max, icon) {
        const percentage = Math.round((current / max) * 100);
        const filledBars = Math.round(percentage / 10); // Barre sur 10 segments pour plus de précision
        const emptyBars = 10 - filledBars;

        let barColor = '';
        if (percentage > 70) barColor = '🟩'; // Vert
        else if (percentage > 40) barColor = '🟨'; // Jaune  
        else if (percentage > 20) barColor = '🟧'; // Orange
        else barColor = '🟥'; // Rouge

        const bar = barColor.repeat(filledBars) + '⬛'.repeat(emptyBars);
        
        return `${icon} ${bar} ${current}/${max} (${percentage}%)`;
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

    formatTechniques(techniques) {
        if (!techniques || techniques.length === 0) {
            return '• Aucune technique apprise';
        }

        return techniques.map(tech => `• ${tech}`).join('\n');
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

        return { 
            text: kingdomsText,
            image: await imageGenerator.generateKingdomsOverview()
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
                  `• Arme utilisée et angle d'attaque\n` +
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

    async handleMapCommand({ imageGenerator }) {
        return {
            text: `🗺️ **CARTE DU MONDE - FRICTION ULTIMATE**\n\n` +
                  `🏰 **Les 12 Royaumes sont dispersés à travers :**\n` +
                  `• Plaines fertiles d'Aegyria\n` +
                  `• Forêts sombres de Sombrenuit\n` +
                  `• Déserts brûlants de Khelos\n` +
                  `• Ports fortifiés d'Abrantis\n` +
                  `• Montagnes enneigées de Varha\n` +
                  `• Et bien d'autres contrées dangereuses...\n\n` +
                  `⚔️ **Les 7 Ordres ont établi leurs quartiers :**\n` +
                  `• Dans les sanctuaires profanés\n` +
                  `• Les citadelles fumantes\n` +
                  `• Les forteresses des ombres\n` +
                  `• Et d'autres lieux mystérieux...\n\n` +
                  `💀 **Chaque région est dangereuse !**`,
            image: await imageGenerator.generateWorldMap()
        };
    }

    async handleInnCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !`
            };
        }

        // Vérifier si le personnage est dans une auberge
        const isInInn = character.currentLocation.toLowerCase().includes('auberge') || 
                       character.currentLocation.toLowerCase().includes('taverne') ||
                       character.currentLocation.toLowerCase().includes('capitale');

        if (!isInInn) {
            return {
                text: `🏠 **AUBERGE NON ACCESSIBLE**\n\n` +
                      `❌ Tu n'es pas dans une auberge ou une capitale !\n\n` +
                      `📍 **Position actuelle :** ${character.currentLocation}\n\n` +
                      `🚶‍♂️ Déplace-toi vers "l'auberge de la capitale" ou "taverne du village" pour accéder aux services.`
            };
        }

        const lifeBar = this.generateBar(character.currentLife, character.maxLife, '❤️');
        const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '⚡');

        return {
            text: `🏠 **AUBERGE DE ${character.currentLocation.toUpperCase()}**\n\n` +
                  `👤 **${character.name}** - Bienvenue !\n\n` +
                  `${lifeBar}\n` +
                  `${energyBar}\n\n` +
                  `🏪 **Services disponibles :**\n` +
                  `• **équiper [arme/armure]** - Changer d'équipement (50 pièces)\n` +
                  `• **repos** - Restaurer vie et énergie (100 pièces)\n` +
                  `• **acheter [objet]** - Acheter équipement\n` +
                  `• **vendre [objet]** - Vendre équipement\n\n` +
                  `💰 **Tes pièces :** ${character.coins}\n\n` +
                  `⚔️ **Équipement actuel :**\n` +
                  `${this.formatEquipment(character.equipment)}\n\n` +
                  `📦 **Inventaire :**\n` +
                  `${this.formatInventory(character.inventory)}`,
            image: await imageGenerator.generateInventoryImage(character)
        };
    }
    async handleGenderSelection({ player, message, dbManager, imageGenerator }) {
        // Marquer le début de la création si pas déjà fait
        await dbManager.setTemporaryData(player.id, 'creation_started', true);

        // Convertir l'entrée du joueur en genre
        let gender;
        if (message === '1' || message.toUpperCase() === 'HOMME') {
            gender = 'male';
        } else if (message === '2' || message.toUpperCase() === 'FEMME') {
            gender = 'female';
        } else {
            return {
                text: `❌ Choix invalide ! \n\n` +
                      `Tape **1** pour HOMME ou **2** pour FEMME`
            };
        }

        // Stocker temporairement le genre (en attendant le royaume)
        await dbManager.setTemporaryData(player.id, 'creation_gender', gender);

        const kingdoms = await dbManager.getAllKingdoms();
        let kingdomText = `👤 **Sexe sélectionné :** ${gender === 'male' ? 'HOMME' : 'FEMME'}\n\n` +
                         `🏰 **Étape 2/3 - Choisis ton royaume :**\n\n`;

        kingdoms.forEach((kingdom, index) => {
            kingdomText += `**${index + 1}.** ${kingdom.name} - ${kingdom.description}\n`;
        });

        kingdomText += `\n⚡ **Tape le numéro du royaume (1 à 12)**`;

        return {
            text: kingdomText,
            image: await imageGenerator.generateKingdomsOverview()
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

        // Récupérer le genre stocké temporairement
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');

        if (!gender) {
            return {
                text: `❌ Erreur : genre non trouvé. Recommence la création avec /créer`
            };
        }

        // Stocker le royaume temporairement avec son ID
        await dbManager.setTemporaryData(player.id, 'creation_kingdom', selectedKingdom.id);

        console.log(`✅ Royaume sélectionné: ${selectedKingdom.name} (ID: ${selectedKingdom.id}) pour le joueur ${player.id}`);

        return {
            text: `🏰 **Royaume sélectionné :** ${selectedKingdom.name}\n\n` +
                  `👤 **Sexe :** ${gender === 'male' ? 'HOMME' : 'FEMME'}\n` +
                  `🏰 **Royaume :** ${selectedKingdom.name}\n\n` +
                  `📝 **Étape 3/4 - Donne un nom à ton personnage :**\n\n` +
                  `✍️ Écris simplement le nom que tu veux pour ton personnage.\n` +
                  `⚠️ **Attention :** Le nom ne peut pas être modifié après !`,
            image: await imageGenerator.generateKingdomImage(selectedKingdom.id)
        };
    }

    async handleCharacterNameInput({ player, name, dbManager, imageGenerator }) {
        // Récupérer les données temporaires
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomId = await dbManager.getTemporaryData(player.id, 'creation_kingdom');

        if (!gender || !kingdomId) {
            return {
                text: `❌ Erreur : données de création manquantes. Recommence avec /créer`
            };
        }

        // Valider le nom (lettres, chiffres, espaces, accents)
        const nameRegex = /^[a-zA-Z0-9àâäéèêëïîôöùûüÿç\s]{2,20}$/;
        if (!nameRegex.test(name)) {
            return {
                text: `❌ Le nom doit contenir entre 2 et 20 caractères (lettres, chiffres, espaces uniquement) !`
            };
        }

        // Vérifier si le nom existe déjà
        const existingCharacter = await dbManager.getCharacterByName(name.trim());
        if (existingCharacter) {
            return {
                text: `❌ Ce nom est déjà pris ! Choisis un autre nom.`
            };
        }

        // Stocker le nom temporairement et demander l'image
        await dbManager.setTemporaryData(player.id, 'creation_name', name.trim());

        return {
            text: `✅ **Nom accepté :** ${name}\n\n` +
                  `📸 **Étape 4/4 - Photo de ton visage :**\n\n` +
                  `🖼️ Envoie maintenant une photo de ton visage pour ton personnage.\n` +
                  `⚠️ **Important :**\n` +
                  `• Seule la zone du visage sera utilisée\n` +
                  `• Photo claire et bien éclairée recommandée\n` +
                  `• Si tu n'as pas de photo, écris "SANS_PHOTO"\n\n` +
                  `📷 **Envoie ta photo maintenant...**`
        };

        // Récupérer les détails du royaume
        const kingdom = await dbManager.getKingdomById(kingdomId);
        const kingdomName = kingdom ? kingdom.name : kingdomId;

        // Créer le personnage
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
            learnedTechniques: []
        };

        console.log(`✅ Création personnage: ${name}, Royaume: ${kingdomName} (${kingdomId}), Genre: ${gender}`);

        try {
            const newCharacter = await dbManager.createCharacter(characterData);

            // Nettoyer TOUTES les données temporaires de création
            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_gender');
            await dbManager.clearTemporaryData(player.id, 'creation_kingdom');

            return {
                text: `🎉 **PERSONNAGE CRÉÉ AVEC SUCCÈS !**\n\n` +
                      `👤 **Nom :** ${newCharacter.name}\n` +
                      `👤 **Sexe :** ${gender === 'male' ? 'Homme' : 'Femme'}\n` +
                      `🏰 **Royaume :** ${kingdomName}\n` +
                      `⚔️ **Niveau :** ${newCharacter.level}\n` +
                      `🌟 **Niveau de puissance :** ${newCharacter.powerLevel}\n\n` +
                      `🎮 Utilise **/menu** pour découvrir tes options !`,
                image: await imageGenerator.generateCharacterImage(newCharacter)
            };

        } catch (error) {
            console.error('❌ Erreur lors de la création du personnage:', error);
            return {
                text: `❌ Erreur lors de la création du personnage. Réessaie plus tard.`
            };
        }
    }

    async finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage = false, imageBuffer = null }) {
        // Récupérer toutes les données temporaires
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomId = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        const name = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (!gender || !kingdomId || !name) {
            return {
                text: `❌ Erreur : données de création manquantes. Recommence avec /créer`
            };
        }

        // Récupérer les détails du royaume
        const kingdom = await dbManager.getKingdomById(kingdomId);
        const kingdomName = kingdom ? kingdom.name : kingdomId;

        // Créer le personnage
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
            customImage: hasCustomImage // Marquer si le personnage a une image personnalisée
        };

        console.log(`✅ Création personnage: ${name}, Royaume: ${kingdomName} (${kingdomId}), Genre: ${gender}, Image: ${hasCustomImage}`);

        try {
            const newCharacter = await dbManager.createCharacter(characterData);

            // Si image personnalisée, la stocker
            if (hasCustomImage && imageBuffer) {
                await imageGenerator.saveCustomCharacterImage(newCharacter.id, imageBuffer);
            }

            // Nettoyer TOUTES les données temporaires de création
            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_gender');
            await dbManager.clearTemporaryData(player.id, 'creation_kingdom');
            await dbManager.clearTemporaryData(player.id, 'creation_name');

            const imageType = hasCustomImage ? "avec ta photo personnalisée" : "avec une image générée";

            return {
                text: `🎉 **PERSONNAGE CRÉÉ AVEC SUCCÈS !**\n\n` +
                      `👤 **Nom :** ${newCharacter.name}\n` +
                      `👤 **Sexe :** ${gender === 'male' ? 'Homme' : 'Femme'}\n` +
                      `🏰 **Royaume :** ${kingdomName}\n` +
                      `📸 **Image :** ${imageType}\n` +
                      `⚔️ **Niveau :** ${newCharacter.level}\n` +
                      `🌟 **Niveau de puissance :** ${newCharacter.powerLevel}\n\n` +
                      `🎮 Utilise **/menu** pour découvrir tes options !`,
                image: await imageGenerator.generateCharacterImage(newCharacter)
            };

        } catch (error) {
            console.error('❌ Erreur lors de la création du personnage:', error);
            return {
                text: `❌ Erreur lors de la création du personnage. Réessaie plus tard.`
            };
        }
    }

    async handleModifyCharacterCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !\n\n` +
                      `Utilise la commande /créer pour en créer un.`
            };
        }

        // Marquer le début de la modification
        await dbManager.setTemporaryData(player.id, 'modification_started', true);

        return {
            text: `✨ **MODIFICATION DE PERSONNAGE**\n\n` +
                  `👤 **Personnage actuel :** ${character.name}\n` +
                  `🏰 **Royaume :** ${character.kingdom}\n` +
                  `👤 **Sexe :** ${character.gender === 'male' ? 'Homme' : 'Femme'}\n\n` +
                  `🎨 **Nouvelle apparence personnalisée :**\n\n` +
                  `📝 Décris en détail l'apparence que tu veux pour ton personnage :\n` +
                  `• Couleur des cheveux, des yeux\n` +
                  `• Taille, corpulence\n` +
                  `• Style vestimentaire\n` +
                  `• Armes et accessoires\n` +
                  `• Cicatrices, tatouages, etc.\n\n` +
                  `✍️ **Écris ta description complète en un seul message :**`,
            image: await imageGenerator.generateCharacterImage(character)
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

            // Construire le prompt optimisé pour Freepik
            const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
            const kingdomDesc = this.getKingdomDescription(character.kingdom);
            
            // Nettoyer et optimiser la description utilisateur
            const cleanDescription = description.trim();
            
            // Construire un prompt plus structuré et précis
            const basePrompt = `fantasy ${genderDesc} warrior`;
            const kingdomContext = `from ${character.kingdom} kingdom (${kingdomDesc})`;
            const userCustomization = cleanDescription;
            const artStyle = 'detailed fantasy RPG character art, full body portrait, epic fantasy style';
            
            const fullPrompt = `${basePrompt} ${kingdomContext}, appearance: ${userCustomization}, ${artStyle}`;
            
            console.log(`🎨 Prompt de modification généré: "${fullPrompt}"`);
            
            // Vérifier que la description utilisateur est bien intégrée
            if (!fullPrompt.toLowerCase().includes(cleanDescription.toLowerCase().substring(0, 20))) {
                console.log('⚠️ Description utilisateur mal intégrée, correction...');
                const correctedPrompt = `${userCustomization}, ${basePrompt} ${kingdomContext}, ${artStyle}`;
                console.log(`🔧 Prompt corrigé: "${correctedPrompt}"`);
                fullPrompt = correctedPrompt;
            }

            // Générer l'image avec Freepik
            const imagePath = `temp/character_modified_${character.id}_${Date.now()}.png`;
            
            console.log(`📝 Description originale: "${cleanDescription}"`);
            console.log(`🎯 Prompt final envoyé: "${fullPrompt}"`);
            
            await imageGenerator.freepikClient.generateImage(fullPrompt, imagePath, {
                style: '3d',
                perspective: 'third_person',
                nudity: false
            });

            // Lire l'image générée
            const fs = require('fs').promises;
            const imageBuffer = await fs.readFile(imagePath).catch(() => null);

            // Nettoyer les données temporaires
            await dbManager.clearTemporaryData(player.id, 'modification_started');

            if (imageBuffer) {
                return {
                    text: `✨ **PERSONNAGE MODIFIÉ AVEC SUCCÈS !**\n\n` +
                          `👤 **${character.name}** - Nouvelle apparence générée\n\n` +
                          `📝 **Description appliquée :**\n"${cleanDescription}"\n\n` +
                          `🎨 **Image générée par Freepik avec IA**\n\n` +
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

    async handleInnAction({ player, character, message, dbManager, imageGenerator }) {
        const isInInn = character.currentLocation.toLowerCase().includes('auberge') || 
                       character.currentLocation.toLowerCase().includes('taverne') ||
                       character.currentLocation.toLowerCase().includes('capitale');

        if (!isInInn) {
            return {
                text: `🏠 **SERVICE NON DISPONIBLE**\n\n` +
                      `❌ Tu dois être dans une auberge, taverne ou capitale pour utiliser ces services !\n\n` +
                      `📍 **Position actuelle :** ${character.currentLocation}`
            };
        }

        const action = message.toLowerCase().trim();

        if (action === 'repos') {
            if (character.coins < 100) {
                return {
                    text: `💰 **FONDS INSUFFISANTS**\n\n` +
                          `❌ Le repos coûte 100 pièces.\n` +
                          `💰 Tu n'as que ${character.coins} pièces.`
                };
            }

            // Restaurer complètement vie et énergie
            await dbManager.updateCharacter(character.id, {
                currentLife: character.maxLife,
                currentEnergy: character.maxEnergy,
                coins: character.coins - 100
            });

            const lifeBar = this.generateBar(character.maxLife, character.maxLife, '❤️');
            const energyBar = this.generateBar(character.maxEnergy, character.maxEnergy, '⚡');

            return {
                text: `🛏️ **REPOS COMPLET**\n\n` +
                      `✅ Tu te reposes dans un lit confortable...\n\n` +
                      `${lifeBar}\n` +
                      `${energyBar}\n\n` +
                      `💰 **Pièces restantes :** ${character.coins - 100}\n\n` +
                      `🌅 Tu te réveilles complètement reposé et prêt pour l'aventure !`
            };
        }

        if (action.startsWith('équiper ')) {
            const itemName = action.replace('équiper ', '').trim();
            
            if (character.coins < 50) {
                return {
                    text: `💰 **FONDS INSUFFISANTS**\n\n` +
                          `❌ Changer d'équipement coûte 50 pièces.\n` +
                          `💰 Tu n'as que ${character.coins} pièces.`
                };
            }

            // Équiper l'item (simulation)
            const newEquipment = { ...character.equipment };
            if (itemName.includes('épée') || itemName.includes('arme')) {
                newEquipment.weapon = itemName;
            } else if (itemName.includes('armure') || itemName.includes('cuirasse')) {
                newEquipment.armor = itemName;
            } else {
                newEquipment.accessory = itemName;
            }

            await dbManager.updateCharacter(character.id, {
                equipment: newEquipment,
                coins: character.coins - 50
            });

            return {
                text: `⚔️ **ÉQUIPEMENT CHANGÉ**\n\n` +
                      `✅ Tu équipes : **${itemName}**\n\n` +
                      `💰 **Coût :** 50 pièces\n` +
                      `💰 **Pièces restantes :** ${character.coins - 50}\n\n` +
                      `🎒 **Nouvel équipement :**\n` +
                      `${this.formatEquipment(newEquipment)}`
            };
        }

        return {
            text: `🏠 **COMMANDE NON RECONNUE**\n\n` +
                  `❌ Services disponibles :\n` +
                  `• **repos** - Restaurer vie et énergie (100 pièces)\n` +
                  `• **équiper [nom]** - Changer d'équipement (50 pièces)`
        };
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

}

module.exports = GameEngine;