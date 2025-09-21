/**
 * Gestionnaire de boutons simulés via sondages WhatsApp
 * Permet de créer des interfaces interactives avec des sondages à option unique
 */

class WhatsAppButtonManager {
    constructor(sock) {
        this.sock = sock;
        this.buttonDelay = 300; // Délai entre l'envoi de chaque "bouton" (ms)
    }

    /**
     * Envoie un bouton unique simulé (sondage à 1 option)
     * @param {string} chatId - ID du chat WhatsApp
     * @param {string} buttonText - Texte du bouton 
     * @param {string} emoji - Emoji pour le bouton (optionnel)
     * @param {string} action - Action associée au bouton
     */
    async sendButton(chatId, buttonText, emoji = '', action = null) {
        try {
            const pollName = emoji ? `${emoji} ${buttonText}` : buttonText;
            
            await this.sock.sendMessage(chatId, {
                poll: {
                    name: pollName,
                    values: ['✓'], // Une seule option - cliquer = activer
                    selectableCount: 1,
                    toAnnouncementGroup: false
                }
            });

            console.log(`🔘 Bouton envoyé: ${pollName}`);
            return true;
        } catch (error) {
            console.error('❌ Erreur envoi bouton:', error);
            return false;
        }
    }

    /**
     * Envoie plusieurs boutons pour créer un menu interactif
     * @param {string} chatId - ID du chat 
     * @param {Array} buttons - Tableau d'objets boutons {text, emoji, action}
     * @param {string} title - Titre du menu (optionnel)
     */
    async sendButtonMenu(chatId, buttons, title = null) {
        try {
            // Envoyer le titre si fourni
            if (title) {
                await this.sock.sendMessage(chatId, { 
                    text: `📋 ${title}\n━━━━━━━━━━━━━━━━━━━━` 
                });
                await this.delay(500);
            }

            // Envoyer chaque bouton avec un délai
            for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                await this.sendButton(chatId, button.text, button.emoji, button.action);
                
                // Délai entre les boutons (sauf le dernier)
                if (i < buttons.length - 1) {
                    await this.delay(this.buttonDelay);
                }
            }

            console.log(`✅ Menu de ${buttons.length} boutons envoyé`);
            return true;
        } catch (error) {
            console.error('❌ Erreur envoi menu boutons:', error);
            return false;
        }
    }

    /**
     * Crée un menu principal pour le jeu RPG
     * @param {string} chatId - ID du chat
     * @param {Object} character - Personnage du joueur (optionnel)
     */
    async sendMainGameMenu(chatId, character = null) {
        const title = character ? 
            `Menu Principal - ${character.name}` : 
            'Menu Principal - Friction Ultimate';

        const buttons = [
            { text: 'Marcher', emoji: '🚶', action: 'walk' },
            { text: 'Combattre', emoji: '⚔️', action: 'combat' },
            { text: 'Inventaire', emoji: '🎒', action: 'inventory' },
            { text: 'Compétences', emoji: '✨', action: 'skills' },
            { text: 'Magasin', emoji: '🏪', action: 'shop' },
            { text: 'Profil', emoji: '👤', action: 'profile' },
            { text: 'Carte', emoji: '🗺️', action: 'map' },
            { text: 'Aide', emoji: '❓', action: 'help' }
        ];

        return await this.sendButtonMenu(chatId, buttons, title);
    }

    /**
     * Menu de déplacement/actions
     * @param {string} chatId - ID du chat
     */
    async sendActionMenu(chatId) {
        const buttons = [
            { text: 'Nord', emoji: '⬆️', action: 'move_north' },
            { text: 'Sud', emoji: '⬇️', action: 'move_south' },
            { text: 'Est', emoji: '➡️', action: 'move_east' },
            { text: 'Ouest', emoji: '⬅️', action: 'move_west' },
            { text: 'Explorer', emoji: '🔍', action: 'explore' },
            { text: 'Retour', emoji: '↩️', action: 'back' }
        ];

        return await this.sendButtonMenu(chatId, buttons, 'Actions de Déplacement');
    }

    /**
     * Menu de combat
     * @param {string} chatId - ID du chat
     * @param {Array} techniques - Techniques disponibles
     */
    async sendCombatMenu(chatId, techniques = []) {
        const buttons = [
            { text: 'Attaque Simple', emoji: '👊', action: 'basic_attack' },
            { text: 'Défendre', emoji: '🛡️', action: 'defend' }
        ];

        // Ajouter les techniques spéciales
        techniques.forEach(technique => {
            buttons.push({
                text: technique.name,
                emoji: '⚡',
                action: `technique_${technique.id}`
            });
        });

        buttons.push({ text: 'Fuir', emoji: '🏃', action: 'flee' });

        return await this.sendButtonMenu(chatId, buttons, 'Combat - Choisissez votre action');
    }

    /**
     * Menu de confirmation (Oui/Non)
     * @param {string} chatId - ID du chat
     * @param {string} question - Question à poser
     */
    async sendConfirmationMenu(chatId, question) {
        await this.sock.sendMessage(chatId, { text: `❓ ${question}` });
        await this.delay(300);

        const buttons = [
            { text: 'Oui', emoji: '✅', action: 'confirm_yes' },
            { text: 'Non', emoji: '❌', action: 'confirm_no' }
        ];

        return await this.sendButtonMenu(chatId, buttons);
    }

    /**
     * Menu personnalisé
     * @param {string} chatId - ID du chat
     * @param {Array} options - Options du menu
     * @param {string} title - Titre du menu
     */
    async sendCustomMenu(chatId, options, title = 'Choisissez une option') {
        const buttons = options.map((option, index) => ({
            text: option.text || `Option ${index + 1}`,
            emoji: option.emoji || '▪️',
            action: option.action || `option_${index}`
        }));

        return await this.sendButtonMenu(chatId, buttons, title);
    }

    /**
     * Menu numéroté pour les listes (ex: royaumes, ordres)
     * @param {string} chatId - ID du chat
     * @param {Array} items - Liste d'éléments
     * @param {string} title - Titre du menu
     * @param {string} actionPrefix - Préfixe pour l'action
     */
    async sendNumberedMenu(chatId, items, title = 'Liste', actionPrefix = 'select') {
        const buttons = items.map((item, index) => ({
            text: item.name || item.title || item,
            emoji: `${index + 1}️⃣`,
            action: `${actionPrefix}_${item.id || index}`
        }));

        return await this.sendButtonMenu(chatId, buttons, title);
    }

    /**
     * Menu de navigation avec pagination
     * @param {string} chatId - ID du chat
     * @param {Array} items - Tous les éléments
     * @param {number} page - Page actuelle (commence à 0)
     * @param {number} itemsPerPage - Éléments par page
     * @param {string} title - Titre du menu
     * @param {string} actionPrefix - Préfixe pour l'action
     */
    async sendPaginatedMenu(chatId, items, page = 0, itemsPerPage = 6, title = 'Liste', actionPrefix = 'select') {
        const totalPages = Math.ceil(items.length / itemsPerPage);
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, items.length);
        const pageItems = items.slice(startIndex, endIndex);

        // Boutons pour les éléments de la page actuelle
        const buttons = pageItems.map((item, index) => ({
            text: item.name || item.title || item,
            emoji: `${startIndex + index + 1}️⃣`,
            action: `${actionPrefix}_${item.id || startIndex + index}`
        }));

        // Boutons de navigation si nécessaire
        if (totalPages > 1) {
            const navButtons = [];
            
            if (page > 0) {
                navButtons.push({ text: 'Précédent', emoji: '⬅️', action: `page_${page - 1}` });
            }
            
            if (page < totalPages - 1) {
                navButtons.push({ text: 'Suivant', emoji: '➡️', action: `page_${page + 1}` });
            }

            buttons.push(...navButtons);
        }

        const fullTitle = totalPages > 1 ? 
            `${title} (Page ${page + 1}/${totalPages})` : 
            title;

        return await this.sendButtonMenu(chatId, buttons, fullTitle);
    }

    /**
     * Délai d'attente
     * @param {number} ms - Millisecondes d'attente
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Configure le délai entre les boutons
     * @param {number} delay - Délai en millisecondes
     */
    setButtonDelay(delay) {
        this.buttonDelay = Math.max(100, Math.min(2000, delay)); // Entre 100ms et 2s
        console.log(`⏱️ Délai boutons configuré: ${this.buttonDelay}ms`);
    }
}

module.exports = WhatsAppButtonManager;