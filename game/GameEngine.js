const GeminiClient = require('../gemini/GeminiClient');

class GameEngine {
    constructor() {
        this.commandHandlers = {
            '/menu': this.handleMenuCommand.bind(this),
            '/créer': this.handleCreateCharacterCommand.bind(this),
            '/créer_personnage': this.handleCreateCharacterCommand.bind(this),
            '/fiche': this.handleCharacterSheetCommand.bind(this),
            '/aide': this.handleHelpCommand.bind(this),
            '/royaumes': this.handleKingdomsCommand.bind(this),
            '/ordres': this.handleOrdersCommand.bind(this),
            '/combat': this.handleCombatCommand.bind(this),
            '/inventaire': this.handleInventoryCommand.bind(this),
            '/carte': this.handleMapCommand.bind(this)
        };
    }

    async processPlayerMessage({ playerNumber, chatId, message, dbManager, imageGenerator }) {
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
            return await this.handleGameAction({ player, chatId, message, dbManager, imageGenerator });

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
                   `• /créer - Créer/modifier ton personnage\n` +
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

    async handleGameAction({ player, chatId, message, dbManager, imageGenerator }) {
        // D'abord traiter les actions de création de personnage (avant de vérifier si personnage existe)
        
        // Traitement des actions de création de personnage en cours
        if (message.toUpperCase() === 'HOMME' || message.toUpperCase() === 'FEMME' || message === '1' || message === '2') {
            return await this.handleGenderSelection({ player, message, dbManager, imageGenerator });
        }

        // Gestion des numéros de royaumes (1-12)
        const kingdomNumber = parseInt(message);
        if (kingdomNumber >= 1 && kingdomNumber <= 12) {
            return await this.handleKingdomSelection({ player, kingdomNumber, dbManager, imageGenerator });
        }

        // Gestion du nom de personnage (si en cours de création)
        const tempGender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const tempKingdom = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        
        if (tempGender && tempKingdom) {
            // Le joueur est en train de donner le nom de son personnage
            return await this.handleCharacterNameInput({ player, name: message, dbManager, imageGenerator });
        }

        // Maintenant vérifier si le personnage existe pour les actions de jeu normales
        const character = await dbManager.getCharacterByPlayer(player.id);
        
        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !`
            };
        }

        // Traitement des actions de jeu normales avec IA Gemini
        return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
    }

    async processGameActionWithAI({ player, character, message, dbManager, imageGenerator }) {
        // Cette méthode sera étendue avec l'intégration Gemini pour la narration
        return {
            text: `🎮 **Action en cours de traitement...**\n\n` +
                  `Ton personnage **${character.name}** dans le royaume de **${character.kingdom}**\n\n` +
                  `Action demandée : "${message}"\n\n` +
                  `💀 Le système de narration IA sera bientôt intégré !`
        };
    }

    // Méthodes utilitaires
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

    formatTechniques(techniques) {
        if (!techniques || techniques.length === 0) {
            return '• Aucune technique apprise';
        }
        
        return techniques.map(tech => `• ${tech}`).join('\n');
    }

    async handleHelpCommand() {
        return {
            text: `📱 **AIDE - FRICTION ULTIMATE**\n\n` +
                  `🎮 **Commandes de base :**\n` +
                  `• /menu - Menu principal\n` +
                  `• /créer - Créer un personnage\n` +
                  `• /fiche - Fiche de personnage\n\n` +
                  `🌍 **Exploration :**\n` +
                  `• /royaumes - Les 12 royaumes\n` +
                  `• /ordres - Les 7 ordres\n` +
                  `• /carte - Carte du monde\n\n` +
                  `⚔️ **Combat :**\n` +
                  `• /combat - Système de combat\n` +
                  `• /inventaire - Gestion équipement\n\n` +
                  `💀 **Le monde de Friction est impitoyable !**\n` +
                  `Chaque action doit être précise et réfléchie.`
        };
    }

    async handleKingdomsCommand({ dbManager }) {
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

        return { text: kingdomsText };
    }

    async handleOrdersCommand({ dbManager }) {
        const orders = await dbManager.getAllOrders();
        
        let ordersText = `⚔️ **LES 7 ORDRES DE FRICTION ULTIMATE**\n\n`;
        
        orders.forEach((order, index) => {
            ordersText += `**${index + 1}. ${order.name}**\n` +
                         `${order.description}\n` +
                         `🏰 **Localisation :** ${order.location}\n` +
                         `⚔️ **Spécialités :** ${order.specialties.join(', ')}\n\n`;
        });

        return { text: ordersText };
    }

    async handleCombatCommand() {
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
                  `🎯 **Sans précision = vulnérabilité !**`
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

        // Stocker le royaume temporairement
        await dbManager.setTemporaryData(player.id, 'creation_kingdom', selectedKingdom.id);

        return {
            text: `🏰 **Royaume sélectionné :** ${selectedKingdom.name}\n\n` +
                  `👤 **Sexe :** ${gender === 'male' ? 'HOMME' : 'FEMME'}\n` +
                  `🏰 **Royaume :** ${selectedKingdom.name}\n\n` +
                  `📝 **Étape 3/3 - Donne un nom à ton personnage :**\n\n` +
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
            currentLocation: `Capitale de ${kingdomId}`,
            coins: 100,
            equipment: {},
            inventory: [],
            learnedTechniques: []
        };

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
                      `🏰 **Royaume :** ${kingdomId}\n` +
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
}

module.exports = GameEngine;