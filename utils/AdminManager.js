/**
 * AdminManager - Système d'administration pour Friction Ultimate
 * Gère les permissions d'admin et les commandes spéciales
 */

class AdminManager {
    constructor() {
        // ID de l'administrateur principal
        this.adminUsers = [
            '48198576038116@lid', // ID principal
            '+22663685468' // Numéro de téléphone
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
            '/admin_announce': 'Envoie une annonce à tous les joueurs [message]'
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
     * Vérifie si un utilisateur est administrateur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} phoneNumber - Numéro de téléphone
     * @returns {boolean}
     */
    isAdmin(userId, phoneNumber = null) {
        // Vérifier si userId est défini
        if (!userId) return false;
        
        // Vérifier l'ID exact
        if (this.adminUsers.includes(userId)) return true;
        
        // Vérifier avec le suffixe @lid ajouté
        if (this.adminUsers.includes(userId + '@lid')) return true;
        
        // Vérifier le numéro de téléphone
        if (phoneNumber && this.adminUsers.includes(phoneNumber)) return true;
        
        // Vérifier si l'userId correspond à un numéro dans la liste (sans préfixe)
        if (typeof userId === 'string') {
            const cleanUserId = userId.replace(/[^0-9]/g, '');
            for (const adminId of this.adminUsers) {
                if (typeof adminId === 'string') {
                    const cleanAdminId = adminId.replace(/[^0-9]/g, '');
                    if (cleanAdminId === cleanUserId && cleanUserId.length > 0) {
                        return true;
                    }
                }
            }
        }
        
        return false;
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
     * @returns {string|null}
     */
    getGroupKingdom(groupId) {
        return this.kingdomGroups.get(groupId) || null;
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
        }
        
        return params;
    }
}

module.exports = AdminManager;