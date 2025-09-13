const ProgressBarRenderer = require('./ProgressBarRenderer');

class ProgressManager {
    constructor(sock) {
        this.sock = sock;
        this.renderer = new ProgressBarRenderer();
        this.activeProgresses = new Map(); // chatId -> progressData
        this.minUpdateInterval = 700; // Minimum 700ms entre les mises à jour pour éviter le spam
        this.maxConcurrentProgresses = 10; // Limite le nombre de progressions simultanées
    }

    /**
     * Démarre une nouvelle progression pour un chat
     */
    async startProgress(chatId, options = {}) {
        const {
            title = 'Chargement en cours',
            totalSteps = 100,
            style = 'elegant',
            theme = 'rpg',
            showTime = true,
            showSteps = false,
            stepLabels = [],
            character = 'Héros',
            action = 'création'
        } = options;

        // Vérifier les limites
        if (this.activeProgresses.size >= this.maxConcurrentProgresses) {
            console.warn(`⚠️ Trop de progressions actives (${this.activeProgresses.size}), ignorée pour ${chatId}`);
            return false;
        }

        // Si une progression existe déjà pour ce chat, la terminer
        if (this.activeProgresses.has(chatId)) {
            await this.completeProgress(chatId, '✅ Terminé');
        }

        const progressData = {
            chatId,
            title,
            currentStep: 0,
            totalSteps,
            percentage: 0,
            startTime: Date.now(),
            lastUpdateTime: 0,
            messageId: null,
            style,
            theme,
            showTime,
            showSteps,
            stepLabels,
            character,
            action,
            isCompleted: false
        };

        this.activeProgresses.set(chatId, progressData);

        // Envoyer le message initial
        await this.sendInitialMessage(progressData);
        
        // Démarrer la présence "en cours de frappe"
        try {
            await this.sock.sendPresenceUpdate('composing', chatId);
        } catch (error) {
            console.log('⚠️ Erreur présence composing:', error.message);
        }

        console.log(`📊 Progression démarrée pour ${chatId}: ${title}`);
        return true;
    }

    /**
     * Met à jour la progression
     */
    async updateProgress(chatId, percentage, customText = null) {
        const progressData = this.activeProgresses.get(chatId);
        
        if (!progressData || progressData.isCompleted) {
            return false;
        }

        // Anti-spam: vérifier l'intervalle minimum
        const now = Date.now();
        if (now - progressData.lastUpdateTime < this.minUpdateInterval) {
            // Mettre à jour silencieusement les données
            progressData.percentage = Math.max(0, Math.min(100, percentage));
            return true;
        }

        progressData.lastUpdateTime = now;
        progressData.percentage = Math.max(0, Math.min(100, percentage));
        
        if (progressData.showSteps) {
            progressData.currentStep = Math.floor((percentage / 100) * progressData.totalSteps);
        }

        // Envoyer la mise à jour
        await this.sendProgressUpdate(progressData, customText);
        
        // Compléter automatiquement à 100%
        if (percentage >= 100) {
            setTimeout(() => this.completeProgress(chatId), 500);
        }

        return true;
    }

    /**
     * Avance la progression par étapes
     */
    async advanceStep(chatId, stepText = null) {
        const progressData = this.activeProgresses.get(chatId);
        
        if (!progressData || progressData.isCompleted) {
            return false;
        }

        progressData.currentStep++;
        progressData.percentage = (progressData.currentStep / progressData.totalSteps) * 100;
        
        return await this.updateProgress(chatId, progressData.percentage, stepText);
    }

    /**
     * Termine la progression
     */
    async completeProgress(chatId, finalMessage = null) {
        const progressData = this.activeProgresses.get(chatId);
        
        if (!progressData) {
            return false;
        }

        progressData.isCompleted = true;
        progressData.percentage = 100;
        
        // Message final
        const message = finalMessage || this.generateCompletionMessage(progressData);
        
        try {
            await this.sock.sendMessage(chatId, {
                text: message
            });
            
            // Arrêter la présence "en cours de frappe"
            await this.sock.sendPresenceUpdate('available', chatId);
            
        } catch (error) {
            console.error('❌ Erreur envoi message final:', error);
        }

        // Nettoyer
        this.activeProgresses.delete(chatId);
        console.log(`✅ Progression terminée pour ${chatId}`);
        
        return true;
    }

    /**
     * Envoie le message initial de progression
     */
    async sendInitialMessage(progressData) {
        const message = this.generateProgressMessage(progressData);
        
        try {
            const response = await this.sock.sendMessage(progressData.chatId, {
                text: message
            });
            
            // Stocker l'ID du message pour éventuelle modification future
            if (response && response.key) {
                progressData.messageId = response.key.id;
            }
            
        } catch (error) {
            console.error('❌ Erreur envoi message initial:', error);
        }
    }

    /**
     * Envoie une mise à jour de progression
     */
    async sendProgressUpdate(progressData, customText = null) {
        const message = this.generateProgressMessage(progressData, customText);
        
        try {
            await this.sock.sendMessage(progressData.chatId, {
                text: message
            });
            
            // Maintenir la présence composing si pas terminé
            if (progressData.percentage < 100) {
                await this.sock.sendPresenceUpdate('composing', progressData.chatId);
            }
            
        } catch (error) {
            console.error('❌ Erreur envoi mise à jour:', error);
        }
    }

    /**
     * Génère le message de progression
     */
    generateProgressMessage(progressData, customText = null) {
        const { 
            title, 
            percentage, 
            style, 
            theme, 
            showTime, 
            showSteps, 
            stepLabels, 
            character, 
            action,
            currentStep,
            totalSteps,
            startTime
        } = progressData;

        let message = `🎮 **${title.toUpperCase()}**\n\n`;
        
        // Barre de progression principale
        if (theme === 'rpg') {
            const rpgProgress = this.renderer.renderRPGProgress(percentage, action, {
                character,
                style,
                theme,
                showFlavor: true
            });
            message += rpgProgress;
        } else if (showSteps && stepLabels.length > 0) {
            const stepProgress = this.renderer.renderMultiStepProgress(
                currentStep, 
                totalSteps, 
                stepLabels,
                { style, theme, showPercentage: true }
            );
            message += stepProgress;
        } else {
            const progress = this.renderer.renderProgressBar(percentage, {
                style,
                theme,
                text: customText || action,
                includeEmojis: true,
                showAnimation: percentage < 100
            });
            message += progress;
        }

        // Temps écoulé/estimé
        if (showTime && percentage > 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const estimated = (elapsed / percentage) * 100;
            const remaining = Math.max(0, estimated - elapsed);
            
            message += `\n⏱️ ${this.renderer.formatTime(remaining)}`;
        }

        // Message personnalisé
        if (customText && theme !== 'rpg') {
            message += `\n💭 ${customText}`;
        }

        // Indicateur d'activité
        if (percentage < 100) {
            message += '\n\n_Veuillez patienter..._';
        }

        return message;
    }

    /**
     * Génère un message de completion
     */
    generateCompletionMessage(progressData) {
        const { title, character, action, startTime } = progressData;
        const elapsed = (Date.now() - startTime) / 1000;
        
        const messages = [
            `✅ **${title.toUpperCase()} TERMINÉ !**`,
            `🎉 ${character} a accompli ${action} avec succès !`,
            `⏱️ Temps total: ${this.renderer.formatTime(elapsed)}`,
            '',
            '🌟 _Prêt pour la suite !_'
        ];
        
        return messages.join('\n');
    }

    /**
     * Annule toutes les progressions actives
     */
    async cancelAll(reason = 'Opération annulée') {
        const chatIds = Array.from(this.activeProgresses.keys());
        
        for (const chatId of chatIds) {
            await this.completeProgress(chatId, `❌ ${reason}`);
        }
        
        console.log(`🛑 ${chatIds.length} progressions annulées`);
    }

    /**
     * Nettoie les progressions expirées (plus de 5 minutes)
     */
    cleanupExpired() {
        const now = Date.now();
        const expiredTimeout = 5 * 60 * 1000; // 5 minutes
        
        const expiredChats = [];
        
        for (const [chatId, progressData] of this.activeProgresses.entries()) {
            if (now - progressData.startTime > expiredTimeout) {
                expiredChats.push(chatId);
            }
        }
        
        for (const chatId of expiredChats) {
            this.completeProgress(chatId, '⏰ Opération expirée');
        }
        
        if (expiredChats.length > 0) {
            console.log(`🧹 ${expiredChats.length} progressions expirées nettoyées`);
        }
    }

    /**
     * Obtient les statistiques des progressions actives
     */
    getStats() {
        return {
            active: this.activeProgresses.size,
            maxConcurrent: this.maxConcurrentProgresses,
            chatIds: Array.from(this.activeProgresses.keys())
        };
    }
}

module.exports = ProgressManager;