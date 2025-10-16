/**
 * AdminManager - Système d'administration pour Friction Ultimate
 * Gère les permissions d'admin et les commandes spéciales
 */

class AdminManager {
    constructor() {
        // Code d'authentification admin
        this.adminAuthCode = '2011';

        // Codes d'authentification admin intégrés directement pour déploiement
        this.authCodes = [
            'ADMIN_FRICTION_2024_ULTRA',
            'FRICTION_MASTER_KEY_2024',
            'ULTIMATE_ADMIN_ACCESS_2024'
        ];

        // Sessions admin temporaires (validées avec le code 2011)
        this.authenticatedSessions = new Map();

        // Durée de validité d'une session admin (en millisecondes)
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes

        // ID de l'administrateur principal
        this.adminUsers = [
            '48198576038116@lid', // ID principal
            '48198576038116',     // Version sans @lid
            '+22663685468'        // Numéro de téléphone
        ];

        // Permissions d'administration
        this.adminPermissions = [
            'modify_player_stats',
            'add_powers',
            'modify_game_time',
            'manage_kingdoms',
            'ban_users',
            'give_items',
            'teleport_players',
            'modify_levels',
            'admin_chat',
            'server_management',
            'debug_mode'
        ];

        // Commandes d'administration disponibles
        this.adminCommands = {
            // Gestion des joueurs
            '/admin_stats': 'Affiche les statistiques du serveur',
            '/admin_give': 'Donne un objet à un joueur [joueur] [objet] [quantité]',
            '/admin_level': 'Modifie le niveau d\'un joueur [joueur] [niveau]',
            '/admin_teleport': 'Téléporte un joueur [joueur] [royaume] [x] [y]',
            '/admin_heal': 'Soigne complètement un joueur [joueur]',
            '/admin_power': 'Ajoute un pouvoir à un joueur [joueur] [pouvoir]',

            // Gestion du temps et du monde
            '/admin_time': 'Modifie l\'heure du jeu [heure] [minute]',
            '/admin_weather': 'Change la météo [royaume] [météo]',
            '/admin_event': 'Lance un événement spécial [type] [royaume]',

            // Gestion des royaumes et groupes
            '/admin_kingdom': 'Assigne un groupe à un royaume [groupeId] [royaume]',
            '/admin_groups': 'Liste tous les groupes et leurs royaumes',
            '/admin_reset_kingdom': 'Remet à zéro un royaume [royaume]',

            // Debug et maintenance
            '/admin_debug': 'Active/désactive le mode debug',
            '/admin_backup': 'Crée une sauvegarde de la base de données',
            '/admin_reload': 'Recharge les données du jeu',
            '/admin_announce': 'Envoie une annonce à tous les joueurs [message]',
            '/admin_tag': 'Mentionne tous les membres du groupe [message]'
        };

        // Heures du jeu (format 24h)
        this.gameTime = {
            hours: 12,
            minutes: 0,
            day: 1,
            season: 'Printemps', // Printemps, Été, Automne, Hiver
            year: 1247
        };

        // Groupes WhatsApp assignés aux royaumes
        this.kingdomGroups = new Map();

        // Log des actions d'administration
        this.adminLog = [];
    }

    /**
     * Vérifie si un message contient le code d'authentification admin
     * @param {string} message - Message à vérifier
     * @returns {boolean}
     */
    containsAuthCode(message) {
        return message && message.includes(this.adminAuthCode);
    }

    /**
     * Authentifie un admin avec le code 2011
     * @param {string} userId - ID de l'utilisateur
     * @param {string} message - Message contenant le code
     * @returns {boolean}
     */
    authenticateAdmin(userId, message) {
        if (!userId) return false;

        // Vérifier si le message contient le code d'authentification
        if (!this.containsAuthCode(message)) return false;

        console.log(`🔐 Tentative d'authentification admin: ${userId}`);

        // Vérifier si l'utilisateur est dans la liste des admins potentiels
        const isValidAdmin = this.adminUsers.some(adminId => {
            if (userId === adminId) return true;

            // Nettoyage et comparaison des IDs numériques
            const cleanUserId = userId.replace(/[^0-9]/g, '');
            const cleanAdminId = adminId.replace(/[^0-9]/g, '');

            return cleanUserId === cleanAdminId && cleanUserId.length > 0;
        });

        if (isValidAdmin) {
            // Créer une session authentifiée pour TOUS les formats possibles de l'ID
            const cleanUserId = userId.replace(/[^0-9]/g, '');

            // Authentifier avec tous les formats possibles
            this.authenticatedSessions.set(userId, {
                timestamp: Date.now(),
                authenticated: true
            });
            this.authenticatedSessions.set(cleanUserId, {
                timestamp: Date.now(),
                authenticated: true
            });
            this.authenticatedSessions.set(`${cleanUserId}@lid`, {
                timestamp: Date.now(),
                authenticated: true
            });

            console.log(`✅ Admin authentifié avec succès: ${userId} (+ variantes)`);
            return true;
        }

        console.log(`❌ ID non autorisé pour l'authentification: ${userId}`);
        return false;
    }

    /**
     * Vérifie si un utilisateur est administrateur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} phoneNumber - Numéro de téléphone (optionnel)
     * @returns {boolean}
     */
    isAdmin(userId, phoneNumber = null) {
        if (!userId) {
            console.log(`❌ userId est vide ou null`);
            return false;
        }

        console.log(`🔐 Vérification admin pour: "${userId}"`);

        // Nettoyer l'ID et créer toutes les variantes possibles
        const cleanUserId = userId.replace(/[^0-9]/g, '');
        const userIdVariants = [
            userId,
            cleanUserId,
            `${cleanUserId}@lid`,
            `${cleanUserId}@s.whatsapp.net`
        ];

        // Vérifier si l'utilisateur a une session authentifiée valide (toutes les variantes)
        for (const variant of userIdVariants) {
            const session = this.authenticatedSessions.get(variant);
            if (session) {
                // Vérifier si la session n'a pas expiré
                if (Date.now() - session.timestamp < this.sessionTimeout) {
                    console.log(`✅ Admin authentifié (session valide): ${userId} via ${variant}`);
                    return true;
                } else {
                    // Session expirée, la supprimer
                    this.authenticatedSessions.delete(variant);
                    console.log(`⏰ Session admin expirée: ${variant}`);
                }
            }
        }

        console.log(`❌ Admin non authentifié: ${userId}`);
        return false;
    }

    /**
     * Déconnecte un admin (supprime sa session)
     * @param {string} userId - ID de l'utilisateur
     */
    logoutAdmin(userId) {
        this.authenticatedSessions.delete(userId);
        console.log(`🔒 Admin déconnecté: ${userId}`);
    }

    /**
     * Obtient le statut d'authentification d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Object}
     */
    getAuthStatus(userId) {
        const session = this.authenticatedSessions.get(userId);
        if (!session) return { authenticated: false, timeLeft: 0 };

        const timeLeft = this.sessionTimeout - (Date.now() - session.timestamp);
        return {
            authenticated: timeLeft > 0,
            timeLeft: Math.max(0, Math.floor(timeLeft / 1000 / 60)) // minutes
        };
    }

    /**
     * Vérifie si un admin a une permission spécifique
     * @param {string} userId - ID de l'utilisateur
     * @param {string} permission - Permission à vérifier
     * @returns {boolean}
     */
    hasPermission(userId, permission) {
        if (!this.isAdmin(userId)) return false;
        return this.adminPermissions.includes(permission);
    }

    /**
     * Traite une commande d'administration
     * @param {string} command - Commande à exécuter
     * @param {string} adminId - ID de l'admin
     * @param {Object} params - Paramètres de la commande
     * @returns {Promise<string>}
     */
    async processAdminCommand(command, adminId, params = {}) {
        if (!this.isAdmin(adminId)) {
            return '❌ Accès refusé. Vous n\'êtes pas administrateur.';
        }

        this.logAdminAction(adminId, command, params);

        switch (command) {
            case '/admin_stats':
                return this.getServerStats();

            case '/admin_time':
                return this.modifyGameTime(params.hours, params.minutes);

            case '/admin_kingdom':
                return this.assignKingdomToGroup(params.groupId, params.kingdom);

            case '/admin_groups':
                return this.listKingdomGroups();

            case '/admin_give':
                return this.giveItemToPlayer(params.player, params.item, params.quantity);

            case '/admin_level':
                return this.modifyPlayerLevel(params.player, params.level);

            case '/admin_power':
                return this.addPowerToPlayer(params.player, params.power);

            case '/admin_teleport':
                return this.teleportPlayer(params.player, params.kingdom, params.x, params.y);

            case '/admin_heal':
                return this.healPlayer(params.player);

            case '/admin_debug':
                return this.toggleDebugMode();

            case '/admin_announce':
                return this.sendAnnouncement(params.message);

            case '/admin_tag':
                return this.tagAllMembers(params.message, params.groupId, params.sock);

            default:
                return this.getAdminHelp();
        }
    }

    /**
     * Modifie l'heure du jeu
     * @param {number} hours - Heures (0-23)
     * @param {number} minutes - Minutes (0-59)
     * @returns {string}
     */
    modifyGameTime(hours, minutes) {
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return '❌ Heure invalide. Format: HH:MM (24h)';
        }

        this.gameTime.hours = hours;
        this.gameTime.minutes = minutes;

        const timeEmoji = this.getTimeEmoji(hours);

        return `🕐 **TEMPS MODIFIÉ** 🕐

${timeEmoji} Nouvelle heure: **${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}**
📅 Jour ${this.gameTime.day} - ${this.gameTime.season} ${this.gameTime.year}

✨ Tous les joueurs seront notifiés du changement temporel.`;
    }

    /**
     * Assigne un groupe WhatsApp à un royaume
     * @param {string} groupId - ID du groupe
     * @param {string} kingdom - Nom du royaume
     * @returns {string}
     */
    assignKingdomToGroup(groupId, kingdom) {
        if (!kingdom) {
            return '❌ Veuillez spécifier un royaume valide.';
        }

        const validKingdoms = [
            'AEGYRIA', 'SOMBRENUIT', 'TERRAVERDE', 'CIELNUAGE',
            'FLAMMEBOURG', 'GELOPOLIS', 'VENTARIA', 'AURORALIS',
            'OMBRETERRE', 'CRYSTALIS', 'MAREVERDE', 'SOLARIA'
        ];

        if (!validKingdoms.includes(kingdom.toUpperCase())) {
            return `❌ Royaume invalide. Royaumes disponibles:\n${validKingdoms.join(', ')}`;
        }

        this.kingdomGroups.set(groupId, kingdom.toUpperCase());

        return `🏰 **ROYAUME ASSIGNÉ** 🏰

📱 Groupe: \`${groupId}\`
👑 Royaume: **${kingdom.toUpperCase()}**

✅ Ce groupe est maintenant officiellement le territoire de ${kingdom.toUpperCase()}.
🛡️ Les joueurs de ce groupe appartiendront automatiquement à ce royaume.
🗺️ Les événements spécifiques au royaume seront activés.`;
    }

    /**
     * Liste tous les groupes et leurs royaumes assignés
     * @returns {string}
     */
    listKingdomGroups() {
        if (this.kingdomGroups.size === 0) {
            return '📝 **GROUPES ASSIGNÉS**\n\n❌ Aucun groupe n\'est actuellement assigné à un royaume.';
        }

        let result = '📝 **GROUPES ASSIGNÉS AUX ROYAUMES** 📝\n\n';

        for (const [groupId, kingdom] of this.kingdomGroups.entries()) {
            result += `🏰 **${kingdom}**\n`;
            result += `   📱 Groupe: \`${groupId}\`\n\n`;
        }

        return result;
    }

    /**
     * Vérifie si un groupe appartient à un royaume spécifique
     * @param {string} groupId - ID du groupe
     * @param {string} groupName - Nom du groupe (optionnel)
     * @returns {string|null}
     */
    getGroupKingdom(groupId, groupName = null) {
        // D'abord vérifier les assignations manuelles
        const manualAssignment = this.kingdomGroups.get(groupId);
        if (manualAssignment) {
            return manualAssignment;
        }

        // Si pas d'assignation manuelle, essayer de détecter via le nom du groupe
        if (groupName) {
            return this.detectKingdomFromGroupName(groupName);
        }

        return null;
    }

    /**
     * Normalise le texte pour la détection de royaume
     * @param {string} text - Le texte à normaliser
     * @returns {string} - Le texte normalisé
     */
    normalizeTextForDetection(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD') // Sépare les caractères diacritiques
            .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
            .replace(/[^a-z0-9\s]/g, ''); // Supprime les caractères non alphanumériques sauf espace
    }

    /**
     * Détecte automatiquement le royaume basé sur le nom du groupe WhatsApp
     * @param {string} groupName - Nom du groupe
     * @returns {string|null}
     */
    detectKingdomFromGroupName(groupName) {
        const normalized = groupName.toLowerCase().trim();

        // Mapping des noms de royaumes avec variations
        const kingdomMapping = {
            'aegyria': 'AEGYRIA',
            'aegyr': 'AEGYRIA',
            'sombrenuit': 'SOMBRENUIT',
            'sombre': 'SOMBRENUIT',
            'nuit': 'SOMBRENUIT',
            'khelos': 'KHELOS',
            'khel': 'KHELOS',
            'abrantis': 'ABRANTIS',
            'abrant': 'ABRANTIS',
            'varha': 'VARHA',
            'var': 'VARHA',
            'sylvaria': 'SYLVARIA',
            'sylv': 'SYLVARIA',
            'foret': 'SYLVARIA',
            'eclypsia': 'ECLYPSIA',
            'eclyps': 'ECLYPSIA',
            'terre desole': 'TERRE_DESOLE',
            'terre_desole': 'TERRE_DESOLE',
            'terre': 'TERRE_DESOLE',
            'desole': 'TERRE_DESOLE',
            'drak tarr': 'DRAK_TARR',
            'drak-tarr': 'DRAK_TARR',
            'drak_tarr': 'DRAK_TARR',
            'drak': 'DRAK_TARR',
            'tarr': 'DRAK_TARR',
            'urvala': 'URVALA',
            'urval': 'URVALA',
            'ombrefiel': 'OMBREFIEL',
            'ombre': 'OMBREFIEL',
            'khaldar': 'KHALDAR',
            'khald': 'KHALDAR'
        };

        // Recherche par correspondance exacte d'abord
        for (const [keyword, kingdom] of Object.entries(kingdomMapping)) {
            if (normalized === keyword) {
                console.log(`✅ Correspondance exacte: "${groupName}" → ${kingdom}`);
                return kingdom;
            }
        }

        // Puis recherche par inclusion
        for (const [keyword, kingdom] of Object.entries(kingdomMapping)) {
            if (normalized.includes(keyword)) {
                console.log(`✅ Correspondance partielle: "${groupName}" (contient "${keyword}") → ${kingdom}`);
                return kingdom;
            }
        }

        console.log(`❌ Aucun royaume détecté pour: "${groupName}"`);
        return null;
    }

    /**
     * Vérifie si un joueur est dans le bon royaume selon sa position
     * @param {string} groupId - ID du groupe
     * @param {string} playerKingdom - Royaume du joueur
     * @returns {Object}
     */
    validatePlayerLocation(groupId, playerKingdom) {
        const groupKingdom = this.getGroupKingdom(groupId);

        if (!groupKingdom) {
            return {
                valid: true,
                message: null
            };
        }

        if (playerKingdom !== groupKingdom) {
            return {
                valid: false,
                message: `⚠️ **DÉPLACEMENT ILLÉGAL DÉTECTÉ** ⚠️

🚫 Vous êtes dans le groupe du royaume **${groupKingdom}** mais votre personnage est situé en **${playerKingdom}**.

🛤️ Pour rejoindre ce royaume légalement, vous devez :
1. Utiliser la commande \`/voyager ${groupKingdom}\`
2. Payer les frais de voyage
3. Respecter les routes commerciales

🏰 Royaume actuel du groupe: **${groupKingdom}**
📍 Votre position: **${playerKingdom}**

✅ Déplacez-vous correctement ou retournez dans votre royaume d'origine.`
            };
        }

        return {
            valid: true,
            message: `✅ Position validée dans le royaume de **${groupKingdom}**`
        };
    }

    /**
     * Ajoute un pouvoir spécial à un joueur
     * @param {string} playerName - Nom du joueur
     * @param {string} power - Pouvoir à ajouter
     * @returns {string}
     */
    addPowerToPlayer(playerName, power) {
        const powers = [
            'Téléportation', 'Vol', 'Invisibilité', 'Super Force',
            'Régénération', 'Contrôle Élémentaire', 'Vision Mystique',
            'Maîtrise du Temps', 'Communication Animale', 'Guérison Divine'
        ];

        if (!powers.includes(power)) {
            return `❌ Pouvoir invalide. Pouvoirs disponibles:\n${powers.join(', ')}`;
        }

        return `✨ **POUVOIR ACCORDÉ** ✨

👤 Joueur: **${playerName}**
🌟 Nouveau pouvoir: **${power}**

⚡ Le pouvoir a été ajouté au personnage avec succès !
🔮 Le joueur peut maintenant utiliser ce pouvoir spécial.`;
    }

    /**
     * Obtient l'emoji correspondant à l'heure
     * @param {number} hours - Heure
     * @returns {string}
     */
    getTimeEmoji(hours) {
        if (hours >= 6 && hours < 12) return '🌅'; // Matin
        if (hours >= 12 && hours < 18) return '☀️'; // Après-midi
        if (hours >= 18 && hours < 22) return '🌆'; // Soirée
        return '🌙'; // Nuit
    }

    /**
     * Enregistre une action d'administration
     * @param {string} adminId - ID de l'admin
     * @param {string} action - Action effectuée
     * @param {Object} params - Paramètres
     */
    logAdminAction(adminId, action, params) {
        this.adminLog.push({
            timestamp: new Date(),
            adminId: adminId,
            action: action,
            params: params
        });

        // Garde seulement les 100 dernières actions
        if (this.adminLog.length > 100) {
            this.adminLog.shift();
        }
    }

    /**
     * Obtient les statistiques du serveur
     * @returns {string}
     */
    getServerStats() {
        return `📊 **STATISTIQUES SERVEUR** 📊

🕐 **Temps du jeu:** ${this.gameTime.hours.toString().padStart(2, '0')}:${this.gameTime.minutes.toString().padStart(2, '0')}
📅 **Date:** Jour ${this.gameTime.day} - ${this.gameTime.season} ${this.gameTime.year}

🏰 **Royaumes assignés:** ${this.kingdomGroups.size}
👑 **Administrateurs:** ${this.adminUsers.length}
📝 **Actions admin:** ${this.adminLog.length}

🎮 **Serveur:** En ligne
💾 **Base de données:** Connectée
🤖 **Bot:** Opérationnel`;
    }

    /**
     * Mentionne tous les membres d'un groupe
     * @param {string} message - Message à envoyer avec les mentions
     * @param {string} groupId - ID du groupe
     * @param {Object} sock - Connexion WhatsApp
     * @returns {Promise<Object>}
     */
    async tagAllMembers(message, groupId, sock) {
        if (!groupId || !sock) {
            return {
                text: '❌ Commande invalide. Utilisez dans un groupe: /admin_tag [message]'
            };
        }

        if (!groupId.includes('@g.us')) {
            return {
                text: '❌ Cette commande ne fonctionne que dans les groupes.'
            };
        }

        try {
            // Récupérer les métadonnées du groupe
            const groupMetadata = await sock.groupMetadata(groupId);
            const participants = groupMetadata.participants;

            // Créer le message de mention
            const mentions = participants.map(p => p.id);
            const mentionText = participants.map(p => `@${p.id.split('@')[0]}`).join(' ');

            const fullMessage = `📢 **ANNONCE** 📢

${message || 'Attention à tous!'}

${mentionText}`;

            return {
                text: fullMessage,
                mentions: mentions,
                isTagAll: true
            };

        } catch (error) {
            console.error('❌ Erreur lors du tag des membres:', error);
            return {
                text: '❌ Impossible de récupérer les membres du groupe.'
            };
        }
    }

    /**
     * Obtient l'aide pour les commandes d'administration
     * @returns {string}
     */
    getAdminHelp() {
        let help = '👑 **COMMANDES D\'ADMINISTRATION** 👑\n\n';

        for (const [command, description] of Object.entries(this.adminCommands)) {
            help += `\`${command}\`\n   ${description}\n\n`;
        }

        help += '⚠️ **Attention:** Ces commandes sont réservées aux administrateurs.';

        return help;
    }

    /**
     * Format une commande d'administration avec ses paramètres
     * @param {string} command - Commande de base
     * @param {string[]} args - Arguments
     * @returns {Object}
     */
    parseAdminCommand(command, args) {
        const params = {};

        switch (command) {
            case '/admin_time':
                if (args.length >= 2) {
                    params.hours = parseInt(args[0]);
                    params.minutes = parseInt(args[1]);
                }
                break;

            case '/admin_kingdom':
                if (args.length >= 2) {
                    params.groupId = args[0];
                    params.kingdom = args[1];
                }
                break;

            case '/admin_give':
                if (args.length >= 3) {
                    params.player = args[0];
                    params.item = args[1];
                    params.quantity = parseInt(args[2]);
                }
                break;

            case '/admin_level':
                if (args.length >= 2) {
                    params.player = args[0];
                    params.level = parseInt(args[1]);
                }
                break;

            case '/admin_power':
                if (args.length >= 2) {
                    params.player = args[0];
                    params.power = args.slice(1).join(' ');
                }
                break;

            case '/admin_announce':
                params.message = args.join(' ');
                break;

            case '/admin_tag':
                params.message = args.join(' ');
                break;
        }

        return params;
    }

    /**
     * Récupère le chatId d'un royaume
     */
    getKingdomChatId(kingdom) {
        for (const [chatId, assignedKingdom] of this.kingdomGroups.entries()) {
            if (assignedKingdom === kingdom) {
                return chatId;
            }
        }
        return null;
    }
}

module.exports = AdminManager;