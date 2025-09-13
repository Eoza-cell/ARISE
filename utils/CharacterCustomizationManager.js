const ProgressManager = require('./ProgressManager');

class CharacterCustomizationManager {
    constructor(dbManager, imageGenerator, sock) {
        this.dbManager = dbManager;
        this.imageGenerator = imageGenerator;
        this.sock = sock;
        this.progressManager = new ProgressManager(sock);
        
        // États de personnalisation actifs par joueur
        this.activeCustomizations = new Map(); // playerNumber -> customizationState
        
        // Options de personnalisation disponibles
        this.customizationOptions = {
            gender: {
                male: { label: '👨 Homme', icon: '♂️' },
                female: { label: '👩 Femme', icon: '♀️' }
            },
            
            face: {
                oval: { label: 'Ovale', description: 'Visage harmonieux et équilibré' },
                round: { label: 'Rond', description: 'Traits doux et jeunes' },
                square: { label: 'Carré', description: 'Mâchoire marquée et forte' },
                heart: { label: 'Cœur', description: 'Front large, menton fin' },
                diamond: { label: 'Diamant', description: 'Pommettes saillantes' },
                long: { label: 'Allongé', description: 'Visage élancé et raffiné' }
            },
            
            skinTone: {
                pale: { label: 'Pâle', color: '#F5DEB3', description: 'Teint nordique clair' },
                fair: { label: 'Claire', color: '#FDBCB4', description: 'Peau rosée délicate' },
                medium: { label: 'Médium', color: '#D08B5B', description: 'Teint méditerranéen' },
                olive: { label: 'Olive', color: '#C68642', description: 'Peau dorée du sud' },
                dark: { label: 'Foncée', color: '#8B4513', description: 'Teint des terres chaudes' },
                ebony: { label: 'Ébène', color: '#654321', description: 'Peau d\'ébène profonde' }
            },
            
            hairStyle: {
                short_straight: { label: 'Court Lisse', icon: '✂️' },
                short_wavy: { label: 'Court Ondulé', icon: '🌊' },
                medium_straight: { label: 'Mi-long Lisse', icon: '💇' },
                medium_wavy: { label: 'Mi-long Ondulé', icon: '🌀' },
                long_straight: { label: 'Long Lisse', icon: '👸' },
                long_wavy: { label: 'Long Ondulé', icon: '🦁' },
                braided: { label: 'Tressé', icon: '🎀' },
                bald: { label: 'Chauve', icon: '🥚' }
            },
            
            hairColor: {
                black: { label: 'Noir', color: '#000000' },
                brown: { label: 'Brun', color: '#8B4513' },
                blonde: { label: 'Blond', color: '#FFD700' },
                auburn: { label: 'Auburn', color: '#A52A2A' },
                red: { label: 'Roux', color: '#FF4500' },
                silver: { label: 'Argenté', color: '#C0C0C0' },
                white: { label: 'Blanc', color: '#FFFFFF' }
            },
            
            eyeColor: {
                brown: { label: 'Marron', color: '#8B4513' },
                blue: { label: 'Bleu', color: '#0066CC' },
                green: { label: 'Vert', color: '#228B22' },
                hazel: { label: 'Noisette', color: '#DAA520' },
                gray: { label: 'Gris', color: '#708090' },
                violet: { label: 'Violet', color: '#8A2BE2' }
            },
            
            bodyType: {
                slim: { label: 'Élancé', description: 'Silhouette fine et agile' },
                athletic: { label: 'Athlétique', description: 'Musculature équilibrée' },
                muscular: { label: 'Musclé', description: 'Carrure imposante' },
                stocky: { label: 'Robuste', description: 'Constitution solide' },
                heavy: { label: 'Corpulent', description: 'Stature imposante' }
            },
            
            height: {
                short: { label: 'Petit', range: '1m50-1m65', description: 'Taille modeste, agile' },
                average: { label: 'Moyen', range: '1m65-1m75', description: 'Taille standard' },
                tall: { label: 'Grand', range: '1m75-1m85', description: 'Imposant et élégant' },
                very_tall: { label: 'Très Grand', range: '1m85+', description: 'Stature dominante' }
            },
            
            clothing: {
                peasant: { label: 'Paysan', description: 'Habits simples en toile' },
                merchant: { label: 'Marchand', description: 'Vêtements bourgeois' },
                noble: { label: 'Noble', description: 'Tenues raffinées' },
                warrior: { label: 'Guerrier', description: 'Armure légère' },
                mage: { label: 'Mage', description: 'Robes mystiques' },
                rogue: { label: 'Voleur', description: 'Cuir sombre discret' }
            }
        };
        
        // Étapes de personnalisation dans l'ordre
        this.customizationSteps = [
            'gender',
            'face', 
            'skinTone',
            'hairStyle',
            'hairColor',
            'eyeColor',
            'bodyType',
            'height',
            'clothing'
        ];
        
        // Étapes où générer un preview
        this.previewSteps = ['skinTone', 'hairColor', 'eyeColor', 'clothing'];
    }

    /**
     * Démarre le processus de création/modification de personnage
     */
    async startCharacterCustomization(playerNumber, chatId, isModification = false) {
        try {
            // Vérifier si une personnalisation est déjà en cours
            if (this.activeCustomizations.has(playerNumber)) {
                await this.sock.sendMessage(chatId, {
                    text: '⚠️ Une personnalisation est déjà en cours. Tapez "annuler" pour l\'arrêter.'
                });
                return false;
            }

            // Initialiser l'état de personnalisation
            const customizationState = {
                playerNumber,
                chatId,
                isModification,
                currentStep: 0,
                selections: {},
                startTime: Date.now(),
                previews: []
            };

            this.activeCustomizations.set(playerNumber, customizationState);

            // Message de bienvenue
            const welcomeMessage = isModification ? 
                '🎨 **MODIFICATION DE PERSONNAGE** 🎨\n\n' +
                '✨ Transformez votre héros selon vos désirs !\n' +
                'Chaque choix sera visualisé en 3D réaliste.' :
                '🎭 **CRÉATION DE PERSONNAGE** 🎭\n\n' +
                '🌟 Bienvenue dans l\'atelier de création !\n' +
                'Forgez votre héros avec un réalisme saisissant.\n' +
                'Chaque détail compte dans votre légende !';

            await this.sock.sendMessage(chatId, { text: welcomeMessage });

            // Démarrer la progression
            await this.progressManager.startProgress(chatId, {
                title: isModification ? 'Modification en cours' : 'Création en cours',
                totalSteps: this.customizationSteps.length,
                style: 'rpg',
                theme: 'rpg',
                showSteps: true,
                stepLabels: this.getStepLabels(),
                character: 'Artisan',
                action: 'forge votre avatar'
            });

            // Commencer avec la première étape
            await this.presentCurrentStep(customizationState);

            return true;

        } catch (error) {
            console.error('❌ Erreur démarrage personnalisation:', error);
            this.activeCustomizations.delete(playerNumber);
            
            await this.sock.sendMessage(chatId, {
                text: '❌ Erreur lors du démarrage de la personnalisation. Réessayez plus tard.'
            });
            
            return false;
        }
    }

    /**
     * Traite une réponse du joueur
     */
    async handleCustomizationResponse(playerNumber, chatId, response) {
        const customizationState = this.activeCustomizations.get(playerNumber);
        
        if (!customizationState) {
            return false;
        }

        // Commandes spéciales
        const lowercaseResponse = response.toLowerCase().trim();
        
        if (lowercaseResponse === 'annuler' || lowercaseResponse === 'cancel') {
            return await this.cancelCustomization(playerNumber, chatId);
        }
        
        if (lowercaseResponse === 'retour' || lowercaseResponse === 'back') {
            return await this.goBackStep(customizationState);
        }
        
        if (lowercaseResponse === 'confirmer' || lowercaseResponse === 'confirm') {
            return await this.finalizeCustomization(customizationState);
        }

        // Traiter le choix pour l'étape actuelle
        return await this.processStepChoice(customizationState, response);
    }

    /**
     * Présente l'étape actuelle de personnalisation
     */
    async presentCurrentStep(customizationState) {
        const { chatId, currentStep } = customizationState;
        const stepName = this.customizationSteps[currentStep];
        const options = this.customizationOptions[stepName];

        if (!stepName || !options) {
            return await this.finalizeCustomization(customizationState);
        }

        // Créer le message de choix
        let message = `🎨 **ÉTAPE ${currentStep + 1}/${this.customizationSteps.length}** 🎨\n\n`;
        message += `✨ **${this.getStepTitle(stepName)}**\n\n`;

        // Options disponibles
        const optionEntries = Object.entries(options);
        optionEntries.forEach(([key, option], index) => {
            const number = index + 1;
            const icon = option.icon || '▶️';
            
            let optionText = `${number}. ${icon} **${option.label}**`;
            
            if (option.description) {
                optionText += `\n   _${option.description}_`;
            }
            
            if (option.color) {
                optionText += ` 🎨`;
            }
            
            if (option.range) {
                optionText += ` _(${option.range})_`;
            }
            
            message += optionText + '\n\n';
        });

        // Instructions
        message += '📝 **Instructions:**\n';
        message += '• Tapez le numéro de votre choix\n';
        if (currentStep > 0) message += '• "retour" pour revenir en arrière\n';
        message += '• "annuler" pour tout annuler\n\n';

        // Progression
        const percentage = ((currentStep) / this.customizationSteps.length) * 100;
        await this.progressManager.updateProgress(chatId, percentage, this.getStepTitle(stepName));

        await this.sock.sendMessage(chatId, { text: message });
    }

    /**
     * Traite le choix d'une étape
     */
    async processStepChoice(customizationState, response) {
        const { chatId, currentStep } = customizationState;
        const stepName = this.customizationSteps[currentStep];
        const options = this.customizationOptions[stepName];
        
        // Vérifications de sécurité
        if (!stepName) {
            console.error(`❌ Étape ${currentStep} invalide dans customizationSteps`);
            return false;
        }
        
        if (!options) {
            console.error(`❌ Options non trouvées pour l'étape: ${stepName}`);
            await this.sock.sendMessage(chatId, {
                text: `❌ Erreur dans le système de personnalisation. Redémarrez avec /create`
            });
            return false;
        }
        
        // Convertir la réponse en index
        const choiceNumber = parseInt(response.trim()) - 1;
        const optionKeys = Object.keys(options);
        
        if (choiceNumber < 0 || choiceNumber >= optionKeys.length) {
            await this.sock.sendMessage(chatId, {
                text: `⚠️ Choix invalide. Tapez un numéro entre 1 et ${optionKeys.length}.`
            });
            return true;
        }

        const selectedKey = optionKeys[choiceNumber];
        const selectedOption = options[selectedKey];
        
        // Vérification de sécurité supplémentaire
        if (!selectedOption) {
            console.error(`❌ Option non trouvée: ${selectedKey} dans ${stepName}`);
            await this.sock.sendMessage(chatId, {
                text: `❌ Erreur de sélection. Réessayez.`
            });
            return true;
        }
        
        // Enregistrer la sélection
        customizationState.selections[stepName] = {
            key: selectedKey,
            ...selectedOption
        };

        // Confirmer le choix
        await this.sock.sendMessage(chatId, {
            text: `✅ **${selectedOption.label}** sélectionné ! ${selectedOption.icon || '🎯'}`
        });

        // Avancer la progression
        await this.progressManager.advanceStep(chatId, this.getStepTitle(stepName));

        // Générer un preview si c'est une étape importante
        if (this.previewSteps.includes(stepName)) {
            await this.generatePreview(customizationState, stepName);
        }

        // Passer à l'étape suivante
        customizationState.currentStep++;
        
        if (customizationState.currentStep >= this.customizationSteps.length) {
            return await this.finalizeCustomization(customizationState);
        }

        await this.presentCurrentStep(customizationState);
        return true;
    }

    /**
     * Génère un aperçu 3D du personnage
     */
    async generatePreview(customizationState, stepName) {
        const { chatId, selections } = customizationState;
        
        try {
            await this.progressManager.updateProgress(chatId, null, 'Génération du preview 3D...');

            // Préparer les paramètres pour le rendu 3D
            const renderParams = this.buildRenderParameters(selections, true); // preview mode
            
            // Générer l'image via BlenderClient ou fallback Canvas
            let previewImage = null;
            
            if (this.imageGenerator.hasBlender) {
                previewImage = await this.generateBlender3DPreview(renderParams);
            }
            
            // Fallback: génération via Canvas/Freepik
            if (!previewImage) {
                previewImage = await this.generateFallbackPreview(renderParams);
            }

            if (previewImage) {
                customizationState.previews.push({
                    step: stepName,
                    image: previewImage,
                    timestamp: Date.now()
                });

                // Envoyer l'image preview
                await this.sock.sendMessage(chatId, {
                    image: previewImage,
                    caption: `🎨 **Aperçu après ${this.getStepTitle(stepName)}**\n\n` +
                            `✨ Voici à quoi ressemble votre personnage !\n` +
                            `_Continuez la personnalisation..._`
                });
            }

        } catch (error) {
            console.error('❌ Erreur génération preview:', error);
            
            await this.sock.sendMessage(chatId, {
                text: '⚠️ Impossible de générer l\'aperçu, mais la personnalisation continue !'
            });
        }
    }

    /**
     * Finalise la personnalisation
     */
    async finalizeCustomization(customizationState) {
        const { playerNumber, chatId, selections, isModification } = customizationState;
        
        try {
            // Progression finale
            await this.progressManager.updateProgress(chatId, 90, 'Génération du rendu final...');

            // Générer le rendu final haute qualité
            const renderParams = this.buildRenderParameters(selections, false); // final mode
            let finalImage = null;
            
            if (this.imageGenerator.hasBlender) {
                finalImage = await this.generateBlender3DFinal(renderParams);
            }
            
            if (!finalImage) {
                finalImage = await this.generateFallbackPreview(renderParams);
            }

            // Sauvegarder dans la base de données
            if (finalImage) {
                const imagePath = await this.imageGenerator.saveCustomCharacterImage(
                    playerNumber, 
                    finalImage, 
                    selections
                );
                
                // Mettre à jour le personnage en base
                await this.updateCharacterInDatabase(playerNumber, selections, imagePath);
            }

            // Progression complète
            await this.progressManager.completeProgress(chatId, 
                isModification ? 
                '✅ **MODIFICATION TERMINÉE !**\n\n🎉 Votre héros a été transformé avec succès !' :
                '✅ **CRÉATION TERMINÉE !**\n\n🎉 Votre héros est né dans le monde de Friction Ultimate !'
            );

            // Envoyer le résultat final
            if (finalImage) {
                await this.sock.sendMessage(chatId, {
                    image: finalImage,
                    caption: this.generateFinalMessage(selections, isModification)
                });
            }

            // Nettoyer
            this.activeCustomizations.delete(playerNumber);
            
            return true;

        } catch (error) {
            console.error('❌ Erreur finalisation:', error);
            
            await this.progressManager.completeProgress(chatId, 
                '❌ Erreur lors de la finalisation. Vos choix ont été sauvegardés.'
            );
            
            this.activeCustomizations.delete(playerNumber);
            return false;
        }
    }

    /**
     * Annule la personnalisation
     */
    async cancelCustomization(playerNumber, chatId) {
        if (this.activeCustomizations.has(playerNumber)) {
            this.activeCustomizations.delete(playerNumber);
            await this.progressManager.completeProgress(chatId, '❌ Personnalisation annulée.');
        }
        
        await this.sock.sendMessage(chatId, {
            text: '🚫 Personnalisation annulée. Tapez /créer pour recommencer.'
        });
        
        return true;
    }

    /**
     * Revient à l'étape précédente
     */
    async goBackStep(customizationState) {
        if (customizationState.currentStep > 0) {
            customizationState.currentStep--;
            
            // Supprimer la sélection de l'étape actuelle
            const stepName = this.customizationSteps[customizationState.currentStep];
            delete customizationState.selections[stepName];
            
            await this.presentCurrentStep(customizationState);
        }
        
        return true;
    }

    // Méthodes utilitaires

    getStepTitle(stepName) {
        const titles = {
            gender: 'Sexe du Personnage',
            face: 'Forme du Visage',
            skinTone: 'Teint de Peau',
            hairStyle: 'Coiffure',
            hairColor: 'Couleur de Cheveux',
            eyeColor: 'Couleur des Yeux',
            bodyType: 'Morphologie',
            height: 'Taille',
            clothing: 'Style Vestimentaire'
        };
        return titles[stepName] || stepName;
    }

    getStepLabels() {
        return this.customizationSteps.map(step => this.getStepTitle(step));
    }

    buildRenderParameters(selections, isPreview = false) {
        return {
            gender: selections.gender?.key || 'male',
            face: selections.face?.key || 'oval',
            skinTone: selections.skinTone?.color || '#FDBCB4',
            hairStyle: selections.hairStyle?.key || 'medium_straight',
            hairColor: selections.hairColor?.color || '#8B4513',
            eyeColor: selections.eyeColor?.color || '#8B4513',
            bodyType: selections.bodyType?.key || 'athletic',
            height: selections.height?.key || 'average',
            clothing: selections.clothing?.key || 'peasant',
            quality: isPreview ? 'preview' : 'final',
            resolution: isPreview ? '512x512' : '1024x1024'
        };
    }

    generateFinalMessage(selections, isModification) {
        const gender = selections.gender?.label || 'Héros';
        const face = selections.face?.label || '';
        const skin = selections.skinTone?.label || '';
        const hair = selections.hairStyle?.label || '';
        const eyes = selections.eyeColor?.label || '';
        
        return isModification ?
            `🎭 **TRANSFORMATION ACCOMPLIE !** 🎭\n\n` +
            `✨ Votre ${gender.toLowerCase()} renaît avec un nouveau style !\n\n` +
            `🎨 **Nouvelles caractéristiques:**\n` +
            `• Visage: ${face}\n` +
            `• Peau: ${skin}\n` +
            `• Cheveux: ${hair}\n` +
            `• Yeux: ${eyes}\n\n` +
            `🌟 Prêt à conquérir le monde avec ce nouveau look !` :
            
            `🎭 **NAISSANCE D'UNE LÉGENDE !** 🎭\n\n` +
            `✨ Votre ${gender.toLowerCase()} entre dans l'arène !\n\n` +
            `🎨 **Caractéristiques:**\n` +
            `• Visage: ${face}\n` +
            `• Peau: ${skin}\n` +
            `• Cheveux: ${hair}\n` +
            `• Yeux: ${eyes}\n\n` +
            `⚔️ L'aventure commence maintenant !`;
    }

    async generateBlender3DPreview(params) {
        // À implémenter avec BlenderClient amélioré
        return null;
    }

    async generateBlender3DFinal(params) {
        // À implémenter avec BlenderClient amélioré
        return null;
    }

    async generateFallbackPreview(params) {
        // Génération avec Canvas en attendant Blender
        try {
            const prompt = this.buildFallbackPrompt(params);
            return await this.imageGenerator.generateCharacterImage(prompt, {
                style: '3d realistic',
                quality: params.quality,
                width: parseInt(params.resolution.split('x')[0]),
                height: parseInt(params.resolution.split('x')[1])
            });
        } catch (error) {
            console.error('❌ Erreur génération fallback:', error);
            return null;
        }
    }

    buildFallbackPrompt(params) {
        const genderText = params.gender === 'male' ? 'male character' : 'female character';
        const faceText = `${params.face} face shape`;
        const hairText = `${params.hairStyle} ${params.hairColor} hair`;
        const eyeText = `${params.eyeColor} eyes`;
        const bodyText = `${params.bodyType} build`;
        const clothingText = `${params.clothing} clothing`;
        
        return `3D realistic ${genderText}, ${faceText}, ${hairText}, ${eyeText}, ${bodyText}, ${clothingText}, high quality render, medieval fantasy style, professional lighting`;
    }

    async updateCharacterInDatabase(playerNumber, selections, imagePath) {
        // Mise à jour en base de données
        try {
            console.log(`💾 Création personnage ${playerNumber}:`, selections);
            console.log(`🖼️ Image sauvée: ${imagePath}`);
            
            // Récupérer le joueur
            const player = await this.dbManager.getPlayerByNumber(playerNumber);
            if (!player) {
                throw new Error('Joueur introuvable');
            }
            
            // Construire les données du personnage depuis les sélections
            const characterData = {
                playerId: player.id,
                name: `${selections.gender?.key === 'male' ? 'Guerrier' : 'Guerrière'}_${playerNumber.slice(-4)}`,
                gender: selections.gender?.key || 'male',
                kingdom: 'ASTORIA', // Royaume par défaut
                order: null,
                level: 1,
                experience: 0,
                powerLevel: 'G',
                frictionLevel: 'G',
                currentLife: 100,
                maxLife: 100,
                currentEnergy: 100,
                maxEnergy: 100,
                currentLocation: 'Capitale d\'Astoria',
                position: { x: 0, y: 0, z: 0 },
                equipment: {},
                learnedTechniques: [],
                coins: 100,
                inventory: []
            };
            
            // Créer le personnage dans la base de données
            const newCharacter = await this.dbManager.createCharacter(characterData);
            console.log(`✅ Personnage créé avec ID: ${newCharacter.id}`);
            
            return newCharacter;
        } catch (error) {
            console.error('❌ Erreur sauvegarde BDD:', error);
            throw error;
        }
    }

    // Méthodes de nettoyage et maintenance

    cleanup() {
        this.activeCustomizations.clear();
        this.progressManager.cancelAll('Redémarrage du système');
    }

    getActiveCustomizations() {
        return Array.from(this.activeCustomizations.keys());
    }
}

module.exports = CharacterCustomizationManager;