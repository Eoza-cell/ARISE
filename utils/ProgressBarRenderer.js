class ProgressBarRenderer {
    constructor() {
        // Jeux de caractères pour différents styles de barres de progression
        this.styles = {
            // Style moderne avec caractères blocs
            modern: {
                filled: '█',
                empty: '░',
                left: '▐',
                right: '▌'
            },
            // Style élégant avec des caractères fins
            elegant: {
                filled: '▰',
                empty: '▱',
                left: '⟨',
                right: '⟩'
            },
            // Style futuriste avec lignes doubles
            futuristic: {
                filled: '═',
                empty: '─',
                left: '╟',
                right: '╢'
            },
            // Style fantasy médiéval
            fantasy: {
                filled: '▣',
                empty: '▢',
                left: '⟪',
                right: '⟫'
            },
            // Style RPG avec caractères spéciaux
            rpg: {
                filled: '⬛',
                empty: '⬜',
                left: '⚔️',
                right: '🛡️'
            }
        };

        this.animations = {
            // Animation de pulsation
            pulse: ['◐', '◓', '◑', '◒'],
            // Animation de rotation
            spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
            // Animation de vagues
            wave: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
            // Animation fantasy
            magic: ['✦', '✧', '✦', '✧', '⟐', '⟡', '⟐', '⟡'],
            // Animation de forge
            forge: ['🔥', '⚡', '💫', '✨', '🔥', '⚡', '💫', '✨']
        };

        this.currentAnimationFrame = 0;
    }

    /**
     * Génère une barre de progression horizontale avec caractères spéciaux
     * @param {number} percentage - Pourcentage de progression (0-100)
     * @param {Object} options - Options de style et format
     * @returns {string} - Barre de progression formatée
     */
    renderProgressBar(percentage, options = {}) {
        const {
            width = 10,
            style = 'elegant', 
            showPercentage = true,
            showAnimation = true,
            text = '',
            includeEmojis = true,
            theme = 'rpg',
            timeRemaining = null
        } = options;

        // Valider le pourcentage
        percentage = Math.max(0, Math.min(100, percentage));
        
        // Calculer le nombre de segments remplis
        const filledSegments = Math.floor((percentage / 100) * width);
        const emptySegments = width - filledSegments;
        
        // Utiliser directement les caractères ▰ et ▱ pour une meilleure compatibilité
        const filledChar = '▰';
        const emptyChar = '▱';
        
        // Construire la barre
        const progressBar = filledChar.repeat(filledSegments) + emptyChar.repeat(emptySegments);
        
        // Construire le résultat
        let result = '';
        
        // Emoji selon le pourcentage
        if (includeEmojis) {
            if (percentage === 0) {
                result += '⚡ ';
            } else if (percentage < 25) {
                result += '🌟 ';
            } else if (percentage < 50) {
                result += '✨ ';
            } else if (percentage < 75) {
                result += '🔥 ';
            } else if (percentage < 100) {
                result += '💫 ';
            } else {
                result += '✅ ';
            }
        }
        
        // Texte personnalisé
        if (text) {
            result += `${text}\n`;
        }
        
        // Barre de progression avec pourcentage
        result += `${progressBar} ${Math.floor(percentage)}%`;
        
        // Temps restant si fourni
        if (timeRemaining !== null) {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            result += `\n⏰ Temps restant: ${timeDisplay}`;
        }
        
        return result;
    }

    /**
     * Génère une barre multi-étapes avec labels
     */
    renderMultiStepProgress(currentStep, totalSteps, stepLabels = [], options = {}) {
        const percentage = (currentStep / totalSteps) * 100;
        const {
            showSteps = true,
            stepStyle = 'elegant',
            ...otherOptions
        } = options;
        
        let result = this.renderProgressBar(percentage, { style: stepStyle, ...otherOptions });
        
        if (showSteps) {
            result += `\n📍 Étape ${currentStep}/${totalSteps}`;
            
            if (stepLabels[currentStep - 1]) {
                result += `: ${stepLabels[currentStep - 1]}`;
            }
        }
        
        return result;
    }

    /**
     * Génère une barre de progression avec temps estimé
     */
    renderProgressWithTime(percentage, timeElapsed, estimatedTotal, options = {}) {
        const baseProgress = this.renderProgressBar(percentage, options);
        
        const remainingTime = Math.max(0, estimatedTotal - timeElapsed);
        const timeText = this.formatTime(remainingTime);
        
        return `${baseProgress}\n⏱️ Temps restant: ${timeText}`;
    }

    /**
     * Génère une barre de chargement avec effet de vague
     */
    renderWaveProgress(percentage, options = {}) {
        const {
            width = 20,
            waveLength = 4,
            showPercentage = true
        } = options;
        
        const wave = this.animations.wave;
        let progressBar = '';
        
        for (let i = 0; i < width; i++) {
            const position = (i + this.currentAnimationFrame) % waveLength;
            const intensity = Math.sin((position / waveLength) * Math.PI);
            const threshold = (percentage / 100) * width;
            
            if (i <= threshold) {
                const charIndex = Math.floor(intensity * (wave.length - 1));
                progressBar += wave[charIndex];
            } else {
                progressBar += '▁';
            }
        }
        
        this.currentAnimationFrame++;
        
        let result = `🌊 ⟨${progressBar}⟩`;
        if (showPercentage) {
            result += ` ${percentage.toFixed(0)}%`;
        }
        
        return result;
    }

    /**
     * Génère une progression thématique RPG
     */
    renderRPGProgress(percentage, action = 'loading', options = {}) {
        const {
            character = 'Héros',
            location = 'Royaume',
            showFlavor = true
        } = options;
        
        const baseProgress = this.renderProgressBar(percentage, {
            style: 'rpg',
            theme: 'rpg',
            includeEmojis: true,
            ...options
        });
        
        let flavorText = '';
        if (showFlavor) {
            if (percentage < 25) {
                flavorText = `⚔️ ${character} commence son ${action}...`;
            } else if (percentage < 50) {
                flavorText = `🔥 L'énergie magique s'accumule...`;
            } else if (percentage < 75) {
                flavorText = `✨ Les forces mystiques convergent...`;
            } else if (percentage < 100) {
                flavorText = `💫 La magie atteint son apogée...`;
            } else {
                flavorText = `✅ ${action} accompli avec succès!`;
            }
        }
        
        return showFlavor ? `${flavorText}\n${baseProgress}` : baseProgress;
    }

    /**
     * Formate le temps en format lisible
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.ceil(seconds)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.ceil(seconds % 60);
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    /**
     * Réinitialise l'animation
     */
    resetAnimation() {
        this.currentAnimationFrame = 0;
    }
}

module.exports = ProgressBarRenderer;