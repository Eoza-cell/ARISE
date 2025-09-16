const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const FreepikClient = require('../freepik/FreepikClient');
const BlenderClient = require('../blender/BlenderClient');
const RunwayClient = require('../runway/RunwayClient');
const KieAiClient = require('../kieai/KieAiClient');
const RunwareClient = require('../runware/RunwareClient');
const PollinationsClient = require('../pollinations/PollinationsClient');

class ImageGenerator {
    constructor() {
        this.imageCache = new Map();
        this.assetsPath = path.join(__dirname, '../assets');
        this.tempPath = path.join(__dirname, '../temp');

        // Initialisation de Pollinations Client (générateur principal GRATUIT)
        try {
            this.pollinationsClient = new PollinationsClient();
            this.hasPollinations = this.pollinationsClient.hasValidClient();
            if (this.hasPollinations) {
                console.log('✅ PollinationsClient initialisé - Générateur principal GRATUIT');
            }
        } catch (error) {
            console.error('❌ Erreur initialisation PollinationsClient:', error.message);
            this.pollinationsClient = null;
            this.hasPollinations = false;
        }

        // Initialisation de Runware Client (générateur payant)
        try {
            this.runwareClient = new RunwareClient();
            this.hasRunware = this.runwareClient.hasValidClient();
            if (this.hasRunware) {
                console.log('✅ RunwareClient initialisé - Générateur payant (désactivé par défaut)');
            }
        } catch (error) {
            console.error('❌ Erreur initialisation RunwareClient:', error.message);
            this.runwareClient = null;
            this.hasRunware = false;
        }

        // Initialisation de KieAI Client (fallback)
        try {
            this.kieaiClient = new KieAiClient();
            this.hasKieAI = this.kieaiClient.hasValidClient();
            if (this.hasKieAI) {
                console.log('✅ KieAiClient initialisé - Générateur de fallback');
            }
        } catch (error) {
            console.error('❌ Erreur initialisation KieAiClient:', error.message);
            this.kieaiClient = null;
            this.hasKieAI = false;
        }

        // Initialisation de FreepikClient (fallback)
        try {
            this.freepikClient = new FreepikClient();
            this.hasFreepik = this.freepikClient.hasValidClient();
            if (this.hasFreepik) {
                console.log('✅ FreepikClient initialisé - Générateur de fallback');
            }
        } catch (error) {
            console.error('❌ Erreur initialisation FreepikClient:', error.message);
            this.freepikClient = null;
            this.hasFreepik = false;
        }

        // Initialisation de BlenderClient pour personnalisation 3D
        try {
            this.blenderClient = new BlenderClient();
            this.hasBlender = false; // Sera vérifié lors de la première utilisation
            console.log('🎨 BlenderClient initialisé - Vérification en cours...');

            // Vérification asynchrone de la disponibilité
            this.initializeBlender();
        } catch (error) {
            console.error('❌ Erreur initialisation BlenderClient:', error.message);
            this.blenderClient = null;
            this.hasBlender = false;
        }

        // Initialisation de RunwayClient pour génération de vidéos
        try {
            this.runwayClient = new RunwayClient();
            this.hasRunway = false; // Sera vérifié lors de l'initialisation
            console.log('🎬 RunwayClient initialisé - Génération de vidéos activée');

            // Vérifier la disponibilité
            this.initializeRunway();
        } catch (error) {
            console.error('❌ Erreur initialisation RunwayClient:', error.message);
            this.runwayClient = null;
            this.hasRunway = false;
        }

        // Configuration par défaut
        this.defaultStyle = '3d'; // 3d ou 2d
        this.defaultPerspective = 'first_person'; // first_person, second_person, third_person
        this.allowNudity = true;

        // Groq pour optimisation des prompts (injecté plus tard)
        this.groqClient = null;

        // Déterminer le générateur principal
        if (this.hasPollinations) {
            console.log('🎨 Mode: Groq (narration) + Pollinations GRATUIT (images principales) + Fallbacks');
        } else if (this.hasRunware) {
            console.log('🎨 Mode: Groq (narration) + Runware (images principales) + KieAI/Freepik (fallback)');
        } else if (this.hasKieAI) {
            console.log('🎨 Mode: Groq (narration) + KieAI (images principales) + Freepik (fallback)');
        } else if (this.hasFreepik) {
            console.log('🎨 Mode: Groq (narration) + Freepik (images uniquement)');
        } else {
            console.log('🎨 Mode: Groq (narration) + Canvas (images basiques)');
        }

        // Créer les dossiers nécessaires
        this.initializeFolders();
    }

    setGroqClient(groqClient) {
        this.groqClient = groqClient;
        console.log('🚀 Client Groq injecté pour narration');
    }

    // Méthodes de configuration
    setImageStyle(style) {
        this.defaultStyle = style; // '3d' ou '2d'
        console.log(`🎨 Style par défaut changé: ${style}`);
    }

    setPerspective(perspective) {
        this.defaultPerspective = perspective; // 'first_person', 'second_person', 'third_person'
        console.log(`👁️ Perspective par défaut changée: ${perspective}`);
    }

    setNudityAllowed(allowed) {
        this.allowNudity = allowed;
        console.log(`🔞 Nudité ${allowed ? 'autorisée' : 'interdite'}`);
    }

    async initializeFolders() {
        try {
            await fs.mkdir(this.assetsPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });
            await fs.mkdir(path.join(this.assetsPath, 'characters'), { recursive: true });
            await fs.mkdir(path.join(this.assetsPath, 'custom_images'), { recursive: true });
            console.log('✅ Dossiers d\'images initialisés');
        } catch (error) {
            console.error('❌ Erreur création dossiers:', error);
        }
    }

    async saveCustomCharacterImage(characterId, imageBuffer) {
        try {
            const imagePath = path.join(this.assetsPath, 'custom_images', `character_${characterId}.png`);
            await fs.writeFile(imagePath, imageBuffer);
            console.log(`✅ Image personnalisée sauvegardée: ${imagePath}`);
            return imagePath;
        } catch (error) {
            console.error('❌ Erreur sauvegarde image personnalisée:', error);
            throw error;
        }
    }

    async getCustomCharacterImage(characterId) {
        try {
            const imagePath = path.join(this.assetsPath, 'custom_images', `character_${characterId}.png`);
            const imageBuffer = await fs.readFile(imagePath);
            return imageBuffer;
        } catch (error) {
            // Image personnalisée non trouvée, retourner null
            return null;
        }
    }

    async generateMenuImage() {
        try {
            const cacheKey = 'menu_main_kieai';
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            const imagePath = path.join(this.tempPath, 'menu_main_kieai.png');

            // Essayer Pollinations d'abord (GRATUIT)
            if (this.hasPollinations && this.pollinationsClient) {
                try {
                    console.log('🎨 Génération image menu avec Pollinations GRATUIT...');
                    await this.pollinationsClient.generateMenuImage(imagePath);

                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log('✅ Image menu générée par Pollinations GRATUIT');
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (pollinationsError) {
                    console.log('⚠️ Erreur Pollinations menu, fallback vers Runware:', pollinationsError.message);
                }
            }

            // Fallback vers Runware (payant)
            if (this.hasRunware && this.runwareClient) {
                try {
                    console.log('🎨 Génération image menu avec Runware...');
                    await this.runwareClient.generateMenuImage(imagePath);

                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log('✅ Image menu générée par Runware');
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (runwareError) {
                    console.log('⚠️ Erreur Runware menu, fallback vers KieAI:', runwareError.message);
                }
            }

            // Fallback vers KieAI
            if (this.hasKieAI && this.kieaiClient) {
                try {
                    console.log('🎨 Génération image menu avec KieAI (fallback)...');
                    const prompt = 'RPG main menu background, medieval fantasy game interface, epic fantasy landscape, game UI, medieval castle, magical atmosphere';
                    await this.kieaiClient.generateImage(prompt, imagePath, { style: '3d', perspective: 'landscape' });

                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log('✅ Image menu générée par KieAI');
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (kieaiError) {
                    console.log('⚠️ Erreur KieAI menu, fallback vers Freepik:', kieaiError.message);
                }
            }

            // Fallback vers Freepik
            if (this.hasFreepik && this.freepikClient) {
                console.log('🎨 Génération image menu avec Freepik (fallback)...');
                await this.freepikClient.generateMenuImage(imagePath);

                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    console.log('✅ Image menu générée par Freepik');
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer l\'image menu - aucun générateur disponible');

        } catch (error) {
            console.error('❌ Erreur génération image menu:', error);
            // Retourner null au lieu de throw pour permettre l'affichage du menu sans image
            return null;
        }
    }

    async generateCharacterActionImage(character, action, narration, options = {}) {
        try {
            // FORCER la vue première personne pour toutes les images d'action
            const imageOptions = {
                style: options.style || this.defaultStyle,
                perspective: 'first_person', // FORCÉ - vue première personne uniquement pour les actions
                nudity: options.nudity !== undefined ? options.nudity : this.allowNudity
            };

            const imagePath = path.join(this.tempPath, `character_action_${character.id}_${Date.now()}.png`);

            // Essayer Pollinations d'abord (GRATUIT)
            if (this.hasPollinations && this.pollinationsClient) {
                try {
                    console.log(`🎨 Génération image d'action avec Pollinations GRATUIT (vue première personne forcée)...`);
                    await this.pollinationsClient.generateActionImage(character, action, narration, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log('✅ Image action générée par Pollinations GRATUIT (vue première personne)');
                        return imageBuffer;
                    }
                } catch (pollinationsError) {
                    console.log('⚠️ Erreur Pollinations action, fallback vers Runware:', pollinationsError.message);
                }
            }

            // Fallback vers Runware (payant)
            if (this.hasRunware && this.runwareClient) {
                try {
                    console.log(`🎨 Génération image d'action avec Runware (vue première personne forcée)...`);
                    await this.runwareClient.generateActionImage(character, action, narration, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log('✅ Image action générée par Runware (vue première personne)');
                        return imageBuffer;
                    }
                } catch (runwareError) {
                    console.log('⚠️ Erreur Runware action, fallback vers KieAI:', runwareError.message);
                }
            }

            // Fallback vers KieAI
            if (this.hasKieAI && this.kieaiClient) {
                try {
                    console.log(`🎨 Génération image d'action avec KieAI (fallback, vue première personne forcée)...`);
                    const prompt = `${character.gender || 'warrior'} ${character.name || 'character'} from ${character.kingdom || 'fantasy'} kingdom, ${action}, ${narration}, RPG character action, first person view, POV`;
                    await this.kieaiClient.generateCombatScene(prompt, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log('✅ Image action générée par KieAI (vue première personne)');
                        return imageBuffer;
                    }
                } catch (kieaiError) {
                    console.log('⚠️ Erreur KieAI action, fallback vers Freepik:', kieaiError.message);
                }
            }

            // Fallback vers Freepik
            if (this.hasFreepik && this.freepikClient) {
                try {
                    console.log(`🎨 Génération image d'action avec Freepik (fallback, vue première personne forcée)...`);
                    await this.freepikClient.generateActionImage(character, action, narration, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log('✅ Image action générée par Freepik (vue première personne)');
                        return imageBuffer;
                    }
                } catch (freepikError) {
                    console.log('⚠️ Erreur Freepik action:', freepikError.message);
                }
            }

            throw new Error('Impossible de générer l\'image d\'action - aucun générateur disponible');
        } catch (error) {
            console.error('❌ Erreur génération image action:', error);
            throw error;
        }
    }

    async generateCharacterImage(character, options = {}) {
        try {
            // D'abord vérifier s'il y a une image personnalisée
            const customImage = await this.getCustomCharacterImage(character.id);
            if (customImage) {
                console.log(`✅ Image personnalisée trouvée pour ${character.name}`);
                return customImage;
            }

            const cacheKey = `character_${character.id}_freepik_${options.style || this.defaultStyle}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log(`🎨 Génération image personnage ${character.name} avec AimlApi (vue première personne)...`);

            const imagePath = path.join(this.tempPath, `character_${character.id}_freepik.png`);

            // FORCER la vue première personne pour toutes les images IA
            const imageOptions = {
                style: options.style || this.defaultStyle,
                perspective: 'first_person', // FORCÉ - vue première personne uniquement
                nudity: options.nudity !== undefined ? options.nudity : this.allowNudity
            };

            // Essayer Runware d'abord
            if (this.hasRunware && this.runwareClient) {
                try {
                    console.log(`🎨 Génération image personnage ${character.name} avec Runware (vue première personne)...`);
                    await this.runwareClient.generateCharacterPortrait(character, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);

                    if (imageBuffer) {
                        console.log(`✅ Image personnage ${character.name} générée par Runware (vue première personne)`);
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (runwareError) {
                    console.log(`⚠️ Erreur Runware personnage, fallback vers KieAI:`, runwareError.message);
                }
            }

            // Fallback vers KieAI
            if (this.hasKieAI && this.kieaiClient) {
                try {
                    console.log(`🎨 Génération image personnage ${character.name} avec KieAI (fallback, vue première personne)...`);
                    await this.kieaiClient.generateCharacterPortrait(character, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);

                    if (imageBuffer) {
                        console.log(`✅ Image personnage ${character.name} générée par KieAI (vue première personne)`);
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (kieaiError) {
                    console.log(`⚠️ Erreur KieAI personnage, fallback vers Freepik:`, kieaiError.message);
                }
            }

            // Fallback vers Freepik
            if (this.hasFreepik && this.freepikClient) {
                try {
                    await this.freepikClient.generateCharacterImage(character, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);

                    if (imageBuffer) {
                        console.log(`✅ Image personnage ${character.name} générée par Freepik (vue première personne)`);
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (freepikError) {
                    console.log(`⚠️ Erreur Freepik personnage:`, freepikError.message);
                }
            }

            throw new Error('Impossible de générer l\'image personnage - aucun générateur disponible');

        } catch (error) {
            console.error('❌ Erreur génération image personnage:', error);
            throw error;
        }
    }

    async generateCharacterSheet(character) {
        try {
            // Vérifier d'abord s'il y a une image personnalisée pour la fiche
            const customImage = await this.getCustomCharacterImage(character.id);
            if (customImage) {
                console.log(`✅ Image personnalisée utilisée pour la fiche de ${character.name}`);
                return customImage;
            }

            const cacheKey = `character_sheet_${character.id}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            const imagePath = path.join(this.tempPath, `character_sheet_${character.id}.png`);

            if (this.hasFreepik && this.freepikClient) {
                console.log(`🎨 Génération fiche personnage pour ${character.name} (vue première personne)...`);

                const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
                const prompt = `Character sheet portrait of ${character.name}, detailed ${genderDesc} from ${character.kingdom} kingdom, level ${character.level}, power level ${character.powerLevel}, fantasy RPG character portrait, detailed armor and equipment, first person POV perspective`;

                await this.freepikClient.generateImage(prompt, imagePath, {
                    style: this.defaultStyle,
                    perspective: 'first_person', // FORCÉ - vue première personne
                    nudity: this.allowNudity
                });

                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    console.log(`✅ Fiche personnage générée par Freepik (vue première personne)`);
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer la fiche personnage avec Freepik');

        } catch (error) {
            console.error('❌ Erreur génération fiche personnage:', error);
            throw error;
        }
    }

    async generateInventoryImage(character) {
        try {
            const cacheKey = `inventory_${character.id}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            const imagePath = path.join(this.tempPath, `inventory_${character.id}_aimlapi.png`);

            if (this.hasFreepik && this.freepikClient) {
                console.log(`🎨 Génération inventaire pour ${character.name} avec Freepik...`);

                const prompt = `RPG inventory interface for ${character.name}, fantasy game UI, detailed equipment slots, medieval style inventory screen, character equipment display`;

                await this.freepikClient.generateImage(prompt, imagePath, {
                    style: this.defaultStyle,
                    perspective: 'third_person',
                    nudity: false
                });

                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    console.log(`✅ Inventaire généré par Freepik`);
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer l\'inventaire - Freepik requis');

        } catch (error) {
            console.error('❌ Erreur génération inventaire:', error);
            throw error;
        }
    }

    async generateKingdomImage(kingdomId, options = {}) {
        try {
            const cacheKey = `kingdom_${kingdomId}_aimlapi_${options.style || this.defaultStyle}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log(`🎨 Génération image royaume ${kingdomId} avec AimlApi...`);

            const kingdomDesc = this.getKingdomDescription(kingdomId);
            const imagePath = path.join(this.tempPath, `kingdom_${kingdomId}_freepik.png`);

            const imageOptions = {
                style: options.style || this.defaultStyle,
                perspective: 'third_person',
                nudity: false
            };

            if (this.hasAimlApi && this.aimlApiClient) {
                try {
                    await this.aimlApiClient.generateKingdomImage(kingdomId, { description: kingdomDesc }, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log(`✅ Image royaume ${kingdomId} générée par AimlApi`);
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (aimlApiError) {
                    console.log('⚠️ Erreur AimlApi royaume:', aimlApiError.message);
                }
            }

            throw new Error('Impossible de générer l\'image royaume avec AimlApi');

        } catch (error) {
            console.error(`❌ Erreur génération image royaume ${kingdomId}:`, error);
            throw error;
        }
    }

    async generateWorldMap(options = {}) {
        try {
            const cacheKey = `world_map_aimlapi_${options.style || this.defaultStyle}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log('🗺️ Génération carte du monde détaillée avec AimlApi...');

            const imagePath = path.join(this.tempPath, 'world_map_aimlapi.png');

            const imageOptions = {
                style: options.style || this.defaultStyle,
                perspective: 'third_person',
                nudity: false
            };

            if (this.hasAimlApi && this.aimlApiClient) {
                await this.aimlApiClient.generateDetailedWorldMap(imagePath, imageOptions);
                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    console.log('✅ Carte du monde détaillée générée par AimlApi');
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer la carte du monde - AimlApi requis');

        } catch (error) {
            console.error('❌ Erreur génération carte du monde:', error);
            throw error;
        }
    }

    // Méthodes utilitaires conservées
    getKingdomColors(kingdom) {
        const colors = {
            'AEGYRIA': { primary: '#FFD700', secondary: '#DAA520' },
            'SOMBRENUIT': { primary: '#2F2F2F', secondary: '#1C1C1C' },
            'KHELOS': { primary: '#CD853F', secondary: '#A0522D' },
            'ABRANTIS': { primary: '#4682B4', secondary: '#2F4F4F' },
            'VARHA': { primary: '#708090', secondary: '#2F4F4F' },
            'SYLVARIA': { primary: '#228B22', secondary: '#006400' },
            'ECLYPSIA': { primary: '#4B0082', secondary: '#2E0854' },
            'TERRE_DESOLE': { primary: '#A0522D', secondary: '#8B4513' },
            'DRAK\'TARR': { primary: '#DC143C', secondary: '#8B0000' },
            'URVALA': { primary: '#800080', secondary: '#4B0082' },
            'OMBREFIEL': { primary: '#696969', secondary: '#2F2F2F' },
            'KHALDAR': { primary: '#32CD32', secondary: '#228B22' }
        };

        return colors[kingdom] || { primary: '#666666', secondary: '#333333' };
    }

    getKingdomDescription(kingdom) {
        const descriptions = {
            'AEGYRIA': 'golden plains with honor and chivalry, knights with blessed armor',
            'SOMBRENUIT': 'dark mysterious forests with moon magic and shadow spirits',
            'KHELOS': 'burning desert with ancient ruins and nomadic warriors',
            'ABRANTIS': 'coastal fortified cities with naval armor and sea weapons',
            'VARHA': 'snowy mountains with fur armor and beast hunting weapons',
            'SYLVARIA': 'magical bright forests with nature magic and elven design',
            'ECLYPSIA': 'dark lands under eclipse with shadow magic and dark robes',
            'TERRE_DESOLE': 'post-apocalyptic wasteland with scavenged armor and improvised weapons',
            'DRAK_TARR': 'volcanic peaks with dragon-scale armor and fire-forged weapons',
            'URVALA': 'misty swamps with alchemical gear and necromantic accessories',
            'OMBREFIEL': 'gray plains with mercenary armor and practical weapons',
            'KHALDAR': 'tropical jungles with light armor and poison weapons'
        };

        return descriptions[kingdom] || 'mysterious lands with unknown customs';
    }



    // Initialisation asynchrone de Blender
    async initializeBlender() {
        if (this.blenderClient) {
            try {
                this.hasBlender = await this.blenderClient.checkAvailability();
                if (this.hasBlender) {
                    console.log('✅ BlenderClient disponible - Personnalisation 3D prête');
                } else {
                    console.log('⚠️ Blender non disponible - Utilisation de Freepik uniquement');
                }
            } catch (error) {
                console.error('❌ Erreur vérification Blender:', error.message);
                this.hasBlender = false;
            }
        }
    }

    // Initialisation asynchrone de RunwayML
    async initializeRunway() {
        if (this.runwayClient) {
            try {
                this.hasRunway = this.runwayClient.hasValidClient();
                if (this.hasRunway) {
                    console.log('✅ RunwayClient disponible - Génération de vidéos prête');
                } else {
                    console.log('⚠️ RunwayML non disponible - Génération de vidéos désactivée');
                }
            } catch (error) {
                console.error('❌ Erreur vérification RunwayML:', error.message);
                this.hasRunway = false;
            }
        }
    }

    /**
     * Générer un modèle 3D personnalisé avec Blender
     */
    async generateCustom3DCharacter(character, customization, outputPath) {
        try {
            if (!this.hasBlender || !this.blenderClient) {
                throw new Error('Blender non disponible');
            }

            console.log(`🎨 Génération 3D personnalisée pour ${character.name}...`);
            return await this.blenderClient.generateCustomCharacter(character, customization, outputPath);

        } catch (error) {
            console.error('❌ Erreur génération 3D personnalisée:', error);
            throw error;
        }
    }

    /**
     * Générer des variations de vêtements pour auberges
     */
    async generateClothingVariation(character, clothingType) {
        try {
            const outputPath = path.join(this.tempPath, `${character.name}_${clothingType}_${Date.now()}.png`);

            if (this.hasBlender && this.blenderClient) {
                // Utiliser Blender pour un rendu 3D des vêtements
                return await this.blenderClient.generateClothingVariation(character, clothingType, outputPath);
            } else if (this.hasAimlApi && this.aimlApiClient) {
                // Fallback sur AimlApi
                const prompt = `${character.name} wearing ${clothingType} clothing, ${this.getKingdomDescription(character.kingdom)}, detailed fashion illustration`;
                await this.aimlApiClient.generateImage(prompt, outputPath, {
                    style: this.defaultStyle,
                    perspective: 'third_person',
                    nudity: false
                });
                return outputPath;
            } else {
                throw new Error('Aucun générateur d\'image disponible');
            }

        } catch (error) {
            console.error(`❌ Erreur génération vêtements ${clothingType}:`, error);
            throw error;
        }
    }

    // ===== MÉTHODES DE GÉNÉRATION DE VIDÉOS =====

    async generateActionVideo(character, action, narration, imagePath = null) {
        try {
            console.log('🎬 Génération vidéo d\'action avec RunwayML...');

            if (!this.hasRunway || !this.runwayClient) {
                console.log('⚠️ RunwayClient non disponible pour vidéo');
                return null;
            }

            // Construire le prompt pour la vidéo
            const videoPrompt = `${character.name} performing: ${action}. Medieval fantasy setting, cinematic movement, epic fantasy atmosphere`;

            return await this.runwayClient.generateVideo(videoPrompt, imagePath);
        } catch (error) {
            console.error('❌ Erreur génération vidéo:', error.message);
            return null;
        }
    }

    async generateCombatVideo(combatContext) {
        try {
            if (!this.hasRunway || !this.runwayClient) {
                console.log('⚠️ RunwayML non disponible - pas de vidéo de combat générée');
                return null;
            }

            const videoPath = path.join(this.tempPath, `combat_video_${Date.now()}.mp4`);

            console.log(`🎬 Génération vidéo de combat: ${combatContext.attacker.name} vs ${combatContext.defender.name}`);

            return await this.runwayClient.generateCombatVideo(combatContext, videoPath);

        } catch (error) {
            console.error('❌ Erreur génération vidéo de combat:', error);
            return null;
        }
    }

    async generateLocationVideo(location, character) {
        try {
            if (!this.hasRunway || !this.runwayClient) {
                console.log('⚠️ RunwayML non disponible - pas de vidéo de lieu générée');
                return null;
            }

            const videoPath = path.join(this.tempPath, `location_video_${location.replace(/\s+/g, '_')}_${Date.now()}.mp4`);

            console.log(`🎬 Génération vidéo de lieu: ${location}`);

            return await this.runwayClient.generateLocationVideo(location, character, videoPath);

        } catch (error) {
            console.error('❌ Erreur génération vidéo de lieu:', error);
            return null;
        }
    }

    async generateCustomVideo(prompt, outputPath, options = {}) {
        try {
            if (!this.hasRunway || !this.runwayClient) {
                throw new Error('RunwayML non disponible');
            }

            console.log(`🎬 Génération vidéo personnalisée: ${prompt.substring(0, 100)}...`);

            return await this.runwayClient.generateVideoFromText(prompt, outputPath, options);

        } catch (error) {
            console.error('❌ Erreur génération vidéo personnalisée:', error);
            throw error;
        }
    }

    async generateHelpImage() {
        try {
            const cacheKey = 'help_image_aimlapi';
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            const imagePath = path.join(this.tempPath, 'help_image_aimlapi.png');

            if (this.hasAimlApi && this.aimlApiClient) {
                await this.aimlApiClient.generateHelpImage(imagePath);
                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer l\'image d\'aide - AimlApi requis');
        } catch (error) {
            console.error('❌ Erreur génération image aide:', error);
            throw error;
        }
    }

    async generateOrdersOverview() {
        try {
            const cacheKey = 'orders_overview_aimlapi';
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            const imagePath = path.join(this.tempPath, 'orders_overview_aimlapi.png');

            if (this.hasAimlApi && this.aimlApiClient) {
                await this.aimlApiClient.generateOrdersOverview(imagePath);
                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer l\'image des ordres - AimlApi requis');
        } catch (error) {
            console.error('❌ Erreur génération image ordres:', error);
            throw error;
        }
    }

    async generateCombatGuideImage() {
        try {
            const cacheKey = 'combat_guide_aimlapi';
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            const imagePath = path.join(this.tempPath, 'combat_guide_aimlapi.png');

            if (this.hasAimlApi && this.aimlApiClient) {
                await this.aimlApiClient.generateCombatGuideImage(imagePath);
                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer l\'image de combat - AimlApi requis');
        } catch (error) {
            console.error('❌ Erreur génération image combat:', error);
            throw error;
        }
    }

    async generateDialogueImage(character, npcName, dialogue, options = {}) {
        try {
            console.log(`🗣️ Génération image dialogue avec Pollinations GRATUIT...`);

            if (!this.hasPollinations || !this.pollinationsClient) {
                console.log('⚠️ Pollinations non disponible pour dialogue');
                return null;
            }

            const imageOptions = {
                style: options.style || '3d',
                perspective: 'second_person', // Vue pour dialogue/conversation
                nudity: options.nudity !== undefined ? options.nudity : false
            };

            const imagePath = path.join(this.tempPath, `dialogue_${character.id}_${Date.now()}.png`);

            // Créer le prompt pour dialogue
            const genderDesc = character.gender === 'male' ? 'male' : 'female';
            const prompt = `${character.name}, ${genderDesc} warrior from ${character.kingdom}, talking with ${npcName}, medieval fantasy conversation scene, detailed portrait style, dialogue interaction`;

            await this.pollinationsClient.generateImage(prompt, imagePath, imageOptions);
            const imageBuffer = await fs.readFile(imagePath).catch(() => null);

            if (imageBuffer) {
                console.log('✅ Image dialogue générée par Pollinations GRATUIT');
                return imageBuffer;
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur génération image dialogue:', error.message);
            return null;
        }
    }

    clearCache() {
        this.imageCache.clear();
        console.log('🗑️ Cache d\'images vidé');
    }
}

module.exports = ImageGenerator;