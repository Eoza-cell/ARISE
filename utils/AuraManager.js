/**
 * AuraManager - Gère le système d'aura avec barres de chargement temps réel
 * Les techniques d'aura prennent 10 jours d'entraînement
 */
class AuraManager {
    constructor(dbManager, loadingBarManager) {
        this.dbManager = dbManager;
        this.loadingBarManager = loadingBarManager;
        this.activeTraining = new Map(); // Stockage des entraînements actifs
        this.activeAnimations = new Map(); // Animations en cours
        this.auraLevels = new Map(); // Niveaux d'aura des joueurs
        
        // Types d'aura disponibles
        this.auraTypes = {
            fire: {
                name: 'Aura de Flamme',
                emoji: '🔥',
                color: '🟠',
                description: 'Maîtrise des flammes éternelles',
                trainingDays: 10,
                maxLevel: 100,
                techniques: [
                    'Souffle Ardent', 'Mur de Flammes', 'Météore Igné', 
                    'Phoenix Renaissant', 'Apocalypse de Feu'
                ]
            },
            water: {
                name: 'Aura Aquatique',
                emoji: '🌊',
                color: '🔵',
                description: 'Contrôle des eaux primordiales',
                trainingDays: 10,
                maxLevel: 100,
                techniques: [
                    'Torrent Glacial', 'Barrière Liquide', 'Tsunami Dévastateur',
                    'Régénération Aquatique', 'Déluge Éternel'
                ]
            },
            earth: {
                name: 'Aura Tellurique',
                emoji: '🌍',
                color: '🟤',
                description: 'Force de la terre-mère',
                trainingDays: 10,
                maxLevel: 100,
                techniques: [
                    'Armure de Roche', 'Tremblement de Terre', 'Pics de Cristal',
                    'Sanctuaire de Pierre', 'Cataclysme Tellurique'
                ]
            },
            wind: {
                name: 'Aura Éolienne',
                emoji: '💨',
                color: '⚪',
                description: 'Liberté des vents célestes',
                trainingDays: 10,
                maxLevel: 100,
                techniques: [
                    'Lame de Vent', 'Cyclone Protecteur', 'Tornade Fléau',
                    'Vol Éthéré', 'Tempête Apocalyptique'
                ]
            },
            lightning: {
                name: 'Aura Foudroyante',
                emoji: '⚡',
                color: '🟡',
                description: 'Puissance de la foudre divine',
                trainingDays: 10,
                maxLevel: 100,
                techniques: [
                    'Éclair Perçant', 'Champ Électrique', 'Foudre Vengeresse',
                    'Vitesse Lumière', 'Jugement Céleste'
                ]
            },
            shadow: {
                name: 'Aura Ténébreuse',
                emoji: '🌑',
                color: '⚫',
                description: 'Mystères des ombres éternelles',
                trainingDays: 10,
                maxLevel: 100,
                techniques: [
                    'Invisibilité', 'Liens d\'Ombre', 'Void Dévastateur',
                    'Téléportation Noire', 'Néant Absolu'
                ]
            },
            light: {
                name: 'Aura Lumineuse',
                emoji: '✨',
                color: '🟨',
                description: 'Grâce de la lumière sacrée',
                trainingDays: 10,
                maxLevel: 100,
                techniques: [
                    'Rayon Purificateur', 'Bouclier Sacré', 'Explosion Solaire',
                    'Bénédiction Divine', 'Apocalypse Lumineuse'
                ]
            }
        };

        // Frames d'animation pour les barres de chargement (30 secondes)
        this.loadingFrames = this.generateLoadingFrames();
    }

    /**
     * Génère les frames d'animation pour 30 secondes (une par seconde)
     */
    generateLoadingFrames() {
        const frames = [];
        const characters = ['▰', '▱'];
        const barLength = 20;
        
        for (let second = 0; second <= 30; second++) {
            const progress = second / 30;
            const filledLength = Math.floor(progress * barLength);
            const emptyLength = barLength - filledLength;
            
            const filled = characters[0].repeat(filledLength);
            const empty = characters[1].repeat(emptyLength);
            const percentage = Math.floor(progress * 100);
            
            // Animation des particules d'aura
            const particles = this.generateAuraParticles(second);
            
            const frame = {
                second,
                progress: percentage,
                bar: `${filled}${empty}`,
                particles,
                text: this.generateTrainingText(second, percentage)
            };
            
            frames.push(frame);
        }
        
        return frames;
    }

    /**
     * Génère des particules d'aura animées
     */
    generateAuraParticles(second) {
        const baseParticles = ['✨', '⭐', '💫', '🌟', '✦', '✧', '⚡', '🔥', '💎'];
        const count = Math.floor(Math.random() * 5) + 3;
        let particles = '';
        
        for (let i = 0; i < count; i++) {
            particles += baseParticles[Math.floor(Math.random() * baseParticles.length)];
        }
        
        return particles;
    }

    /**
     * Génère le texte d'entraînement selon le progrès
     */
    generateTrainingText(second, percentage) {
        const phases = [
            { min: 0, max: 10, texts: [
                'Concentration initiale...',
                'Respiration profonde...',
                'Canalisation de l\'énergie...',
                'Éveil des sens intérieurs...'
            ]},
            { min: 11, max: 20, texts: [
                'L\'aura commence à vibrer...',
                'Énergie spirituelle en formation...',
                'Harmonisation des chakras...',
                'Résonance énergétique...'
            ]},
            { min: 21, max: 30, texts: [
                'Maîtrise progressive...',
                'Stabilisation de l\'aura...',
                'Perfectionnement final...',
                'Accomplissement imminent...'
            ]}
        ];
        
        const phase = phases.find(p => second >= p.min && second <= p.max);
        const randomText = phase.texts[second % phase.texts.length];
        
        return randomText;
    }

    /**
     * Démarre l'entraînement d'une technique d'aura
     */
    async startAuraTraining(playerId, auraType, techniqueName) {
        const aura = this.auraTypes[auraType];
        if (!aura) {
            throw new Error('Type d\'aura invalide');
        }

        const trainingId = `${playerId}_${auraType}_${Date.now()}`;
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (aura.trainingDays * 24 * 60 * 60 * 1000));

        const training = {
            id: trainingId,
            playerId,
            auraType,
            techniqueName,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            progress: 0,
            status: 'in_progress',
            dailySessionsCompleted: 0,
            totalSessions: aura.trainingDays
        };

        this.activeTraining.set(trainingId, training);
        
        return {
            trainingId,
            message: this.formatTrainingStart(training, aura),
            estimatedCompletion: endTime.toISOString()
        };
    }

    /**
     * Démarre la régénération d'aura (1 minute)
     */
    async startAuraRegeneration(playerId, sock, chatId) {
        const regenId = `aura_${playerId}_${Date.now()}`;
        let currentValue = 0;
        const maxValue = 60; // 60 secondes

        // Message initial
        let initialMessage = this.generateAuraRegenMessage(0, maxValue);
        const response = await sock.sendMessage(chatId, { text: initialMessage });
        const messageId = response.key.id;

        // Régénération seconde par seconde
        const interval = setInterval(async () => {
            currentValue++;
            const updatedMessage = this.generateAuraRegenMessage(currentValue, maxValue);
            
            try {
                await sock.sendMessage(chatId, {
                    text: updatedMessage,
                    edit: messageId
                });
            } catch (error) {
                // Si l'édition échoue, envoyer un nouveau message
                await sock.sendMessage(chatId, { text: updatedMessage });
            }
            
            if (currentValue >= maxValue) {
                clearInterval(interval);
                
                // Message final
                await sock.sendMessage(chatId, {
                    text: `✅ **AURA RECHARGÉE COMPLÈTEMENT !**\n\n🔮 Votre aura spirituelle est maintenant à son maximum !\n💫 Vous pouvez à nouveau utiliser vos techniques les plus puissantes !`
                });
            }
        }, 1000);

        return regenId;
    }

    /**
     * Génère le message de régénération d'aura
     */
    generateAuraRegenMessage(current, max) {
        const percentage = (current / max) * 100;
        const barLength = 10;
        const filledBars = Math.floor((current / max) * barLength);
        const emptyBars = barLength - filledBars;
        
        // Créer la barre progressive
        const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);
        
        return `🔮 **RÉGÉNÉRATION D'AURA** 🔮

${progressBar} ${Math.floor(percentage)}%

⚡ **Énergie spirituelle:** ${current}/${max}
⏱️ **Temps restant:** ${max - current} secondes

✨ Votre aura se reconstitue progressivement...
💫 Les particules d'énergie tourbillonnent autour de vous
🌟 Vous sentez votre pouvoir revenir peu à peu`;
    }

    /**
     * Démarre la régénération de magie (1 minute)
     */
    async startMagicRegeneration(playerId, sock, chatId) {
        const regenId = `magic_${playerId}_${Date.now()}`;
        let currentValue = 0;
        const maxValue = 60; // 60 secondes

        // Message initial
        let initialMessage = this.generateMagicRegenMessage(0, maxValue);
        const response = await sock.sendMessage(chatId, { text: initialMessage });
        const messageId = response.key.id;

        // Régénération seconde par seconde
        const interval = setInterval(async () => {
            currentValue++;
            const updatedMessage = this.generateMagicRegenMessage(currentValue, maxValue);
            
            try {
                await sock.sendMessage(chatId, {
                    text: updatedMessage,
                    edit: messageId
                });
            } catch (error) {
                // Si l'édition échoue, envoyer un nouveau message
                await sock.sendMessage(chatId, { text: updatedMessage });
            }
            
            if (currentValue >= maxValue) {
                clearInterval(interval);
                
                // Message final
                await sock.sendMessage(chatId, {
                    text: `✅ **MAGIE RECHARGÉE COMPLÈTEMENT !**\n\n✨ Votre énergie magique est maintenant à son maximum !\n🔥 Vos sorts retrouvent toute leur puissance !`
                });
            }
        }, 1000);

        return regenId;
    }

    /**
     * Génère le message de régénération de magie
     */
    generateMagicRegenMessage(current, max) {
        const percentage = (current / max) * 100;
        const barLength = 10;
        const filledBars = Math.floor((current / max) * barLength);
        const emptyBars = barLength - filledBars;
        
        // Créer la barre progressive avec effet alternatif
        let progressBar = '';
        for (let i = 0; i < barLength; i++) {
            if (i < filledBars) {
                progressBar += i % 2 === 0 ? '▰' : '▰';
            } else {
                progressBar += i % 2 === 0 ? '▱' : '▱';
            }
        }
        
        return `✨ **RÉGÉNÉRATION MAGIQUE** ✨

${progressBar} ${Math.floor(percentage)}%

🔥 **Énergie magique:** ${current}/${max}
⏱️ **Temps restant:** ${max - current} secondes

🌟 Les flux magiques se reconstituent dans vos veines...
💙 Vous sentez le mana circuler à nouveau en vous
⚡ Vos capacités mystiques reviennent progressivement`;
    }

    /**
     * Crée une animation de méditation/entraînement en temps réel
     */
    async createAuraAnimation(playerId, auraType, techniqueName, sock, chatId) {
        const aura = this.auraTypes[auraType];
        if (!aura) return null;

        const animationId = `${playerId}_${Date.now()}`;
        const frames = this.loadingFrames;
        
        // Message initial
        let messageContent = this.formatAnimationHeader(aura, techniqueName);
        
        // Envoyer le message initial
        const sentMessage = await sock.sendMessage(chatId, { text: messageContent });
        const messageId = sentMessage.key.id;

        // Démarrer l'animation (30 secondes)
        this.activeAnimations.set(animationId, {
            playerId,
            auraType,
            techniqueName,
            messageId,
            chatId,
            currentFrame: 0,
            sock
        });

        // Animation frame par frame
        for (let i = 0; i < frames.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
            
            const frame = frames[i];
            const updatedContent = this.formatAnimationFrame(aura, techniqueName, frame);
            
            try {
                // Mettre à jour le message existant
                await sock.sendMessage(chatId, {
                    text: updatedContent,
                    edit: messageId
                });
            } catch (error) {
                // Si l'édition échoue, envoyer un nouveau message
                await sock.sendMessage(chatId, { text: updatedContent });
            }
        }

        // Message de completion
        const completionMessage = this.formatAnimationCompletion(aura, techniqueName);
        await sock.sendMessage(chatId, { text: completionMessage });

        this.activeAnimations.delete(animationId);
        
        return {
            animationId,
            duration: 30,
            completed: true
        };
    }

    /**
     * Formate l'en-tête de l'animation
     */
    formatAnimationHeader(aura, techniqueName) {
        return `${aura.emoji} **ENTRAÎNEMENT D'AURA** ${aura.emoji}

🧘 **Technique:** ${techniqueName}
${aura.color} **Type:** ${aura.name}
⏱️ **Durée:** 30 secondes

🔮 **Préparation de la méditation...**

Concentrez-vous et laissez l'énergie vous traverser...`;
    }

    /**
     * Formate une frame d'animation
     */
    formatAnimationFrame(aura, techniqueName, frame) {
        return `${aura.emoji} **ENTRAÎNEMENT D'AURA** ${aura.emoji}

🧘 **Technique:** ${techniqueName}
${aura.color} **Type:** ${aura.name}

⏳ **Progression:** ${frame.progress}%
${frame.bar} ${frame.progress}%

${frame.particles}

💭 **${frame.text}**

⚡ **Énergie spirituelle:** ${frame.particles}
🕐 **Temps restant:** ${30 - frame.second} secondes`;
    }

    /**
     * Formate le message de completion
     */
    formatAnimationCompletion(aura, techniqueName) {
        return `${aura.emoji} **ENTRAÎNEMENT TERMINÉ !** ${aura.emoji}

✅ **Session d'entraînement complétée avec succès !**

🧘 **Technique:** ${techniqueName}
${aura.color} **Type:** ${aura.name}

🎯 **Résultats de la session:**
• +15 Points d'Expérience d'Aura
• +5 Points de Maîtrise
• +1 Session complétée

✨ **Votre aura s'est renforcée !** ✨

💡 **Conseil:** Répétez l'entraînement quotidiennement pendant ${this.auraTypes[aura.name.toLowerCase()]?.trainingDays || 10} jours pour maîtriser complètement cette technique.`;
    }

    /**
     * Formate le début d'entraînement
     */
    formatTrainingStart(training, aura) {
        return `${aura.emoji} **ENTRAÎNEMENT COMMENCÉ** ${aura.emoji}

🎯 **Programme d'entraînement activé !**

📚 **Technique:** ${training.techniqueName}
${aura.color} **Type:** ${aura.name}
📅 **Durée totale:** ${aura.trainingDays} jours
⏰ **Début:** ${new Date(training.startTime).toLocaleString('fr-FR')}
🏁 **Fin estimée:** ${new Date(training.endTime).toLocaleString('fr-FR')}

📋 **Programme journalier:**
• 1 session de méditation (30 secondes)
• 3 exercices de canalisation
• 5 pratiques de concentration

💪 **Engagement requis:** ${aura.trainingDays} jours consécutifs

✨ **Utilisez \`/aura_session\` pour votre session quotidienne !**`;
    }

    /**
     * Obtient les informations d'entraînement d'un joueur
     */
    getPlayerTraining(playerId) {
        for (const [id, training] of this.activeTraining) {
            if (training.playerId === playerId) {
                return training;
            }
        }
        return null;
    }

    /**
     * Met à jour le progrès d'entraînement
     */
    updateTrainingProgress(trainingId) {
        const training = this.activeTraining.get(trainingId);
        if (!training) return false;

        training.dailySessionsCompleted++;
        training.progress = (training.dailySessionsCompleted / training.totalSessions) * 100;

        if (training.progress >= 100) {
            training.status = 'completed';
            this.completeTraining(training);
        }

        return true;
    }

    /**
     * Complète un entraînement d'aura
     */
    completeTraining(training) {
        // Ajouter la technique au joueur
        if (!this.auraLevels.has(training.playerId)) {
            this.auraLevels.set(training.playerId, {});
        }

        const playerAuras = this.auraLevels.get(training.playerId);
        if (!playerAuras[training.auraType]) {
            playerAuras[training.auraType] = {
                level: 1,
                techniques: [],
                masteryPoints: 0
            };
        }

        playerAuras[training.auraType].techniques.push(training.techniqueName);
        playerAuras[training.auraType].masteryPoints += 100;
        playerAuras[training.auraType].level++;

        this.activeTraining.delete(training.id);
    }

    /**
     * Obtient le niveau d'aura d'un joueur
     */
    getPlayerAuraLevel(playerId, auraType = null) {
        const playerAuras = this.auraLevels.get(playerId) || {};
        
        if (auraType) {
            return playerAuras[auraType] || { level: 0, techniques: [], masteryPoints: 0 };
        }
        
        return playerAuras;
    }

    /**
     * Affiche les informations d'aura d'un joueur
     */
    formatAuraInfo(playerId, characterName) {
        const playerAuras = this.getPlayerAuraLevel(playerId);
        
        let display = `✨ **AURAS DE ${characterName.toUpperCase()}** ✨\n\n`;
        
        if (Object.keys(playerAuras).length === 0) {
            display += `🌟 **Aucune aura maîtrisée**\n\n`;
            display += `💡 Utilisez \`/aura_apprendre [type]\` pour commencer votre entraînement !\n\n`;
            display += `**Types d'aura disponibles:**\n`;
            
            for (const [type, info] of Object.entries(this.auraTypes)) {
                display += `${info.emoji} ${info.name}\n`;
            }
            
            return display;
        }
        
        for (const [type, auraData] of Object.entries(playerAuras)) {
            const auraInfo = this.auraTypes[type];
            display += `${auraInfo.emoji} **${auraInfo.name}**\n`;
            display += `   📊 Niveau ${auraData.level}/${auraInfo.maxLevel}\n`;
            display += `   ⚡ Maîtrise: ${auraData.masteryPoints} points\n`;
            display += `   🎯 Techniques: ${auraData.techniques.length}\n`;
            
            if (auraData.techniques.length > 0) {
                display += `   📚 ${auraData.techniques.join(', ')}\n`;
            }
            display += `\n`;
        }
        
        const activeTraining = this.getPlayerTraining(playerId);
        if (activeTraining) {
            const aura = this.auraTypes[activeTraining.auraType];
            display += `🔥 **ENTRAÎNEMENT ACTIF**\n`;
            display += `${aura.emoji} ${activeTraining.techniqueName}\n`;
            display += `📅 Progrès: ${Math.floor(activeTraining.progress)}%\n`;
            display += `⏰ Sessions: ${activeTraining.dailySessionsCompleted}/${activeTraining.totalSessions}\n`;
        }
        
        return display;
    }

    /**
     * Vérifie si un joueur peut commencer un entraînement
     */
    canStartTraining(playerId) {
        const activeTraining = this.getPlayerTraining(playerId);
        return !activeTraining || activeTraining.status === 'completed';
    }

    /**
     * Obtient les statistiques globales des auras
     */
    getAuraStats() {
        return {
            totalAuraTypes: Object.keys(this.auraTypes).length,
            activeTrainings: this.activeTraining.size,
            activeAnimations: this.activeAnimations.size,
            playersWithAuras: this.auraLevels.size
        };
    }

    /**
     * Lance une technique d'aura
     */
    async castAuraTechnique(playerId, auraType, techniqueName) {
        const playerAuras = this.getPlayerAuraLevel(playerId);
        const auraData = playerAuras[auraType];
        
        if (!auraData || !auraData.techniques.includes(techniqueName)) {
            return {
                success: false,
                message: `❌ Vous ne maîtrisez pas la technique "${techniqueName}" !`
            };
        }
        
        const aura = this.auraTypes[auraType];
        const power = auraData.level * 10 + auraData.masteryPoints / 10;
        
        return {
            success: true,
            power,
            message: this.formatTechniqueExecution(aura, techniqueName, power)
        };
    }

    /**
     * Formate l'exécution d'une technique
     */
    formatTechniqueExecution(aura, techniqueName, power) {
        return `${aura.emoji} **TECHNIQUE D'AURA ACTIVÉE !** ${aura.emoji}

⚡ **${techniqueName}**
${aura.color} **Type:** ${aura.name}
💥 **Puissance:** ${Math.floor(power)}

✨ L'aura ${aura.name.toLowerCase()} jaillit de votre être !
🌟 Une énergie mystique enveloppe votre technique !
💫 La puissance de vos ancêtres guide vos mouvements !

**Effet:** Technique exécutée avec une puissance exceptionnelle !`;
    }
}

module.exports = AuraManager;