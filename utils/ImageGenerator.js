const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');
const FreepikClient = require('../freepik/FreepikClient');
const BlenderClient = require('../blender/BlenderClient');

class ImageGenerator {
    constructor() {
        this.imageCache = new Map();
        this.assetsPath = path.join(__dirname, '../assets');
        this.tempPath = path.join(__dirname, '../temp');

        // Initialisation de FreepikClient (seul générateur)
        try {
            this.freepikClient = new FreepikClient();
            this.hasFreepik = this.freepikClient.hasValidClient();
            if (this.hasFreepik) {
                console.log('✅ FreepikClient initialisé - Générateur principal');
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

        // Configuration par défaut
        this.defaultStyle = '3d'; // 3d ou 2d
        this.defaultPerspective = 'first_person'; // first_person, second_person, third_person
        this.allowNudity = true;

        // Groq pour optimisation des prompts (injecté plus tard)
        this.groqClient = null;

        console.log('🎨 Mode: Groq (narration) + Freepik (images seul) + Canvas (fallback)');

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
            console.log('✅ Dossiers d\'images initialisés');
        } catch (error) {
            console.error('❌ Erreur création dossiers:', error);
        }
    }

    async generateMenuImage() {
        try {
            const cacheKey = 'menu_main_freepik';
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            const imagePath = path.join(this.tempPath, 'menu_main_freepik.png');

            if (this.hasFreepik && this.freepikClient) {
                console.log('🎨 Génération image menu avec Freepik...');
                await this.freepikClient.generateMenuImage(imagePath);

                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    console.log('✅ Image menu générée par Freepik');
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer l\'image menu - Freepik requis');

        } catch (error) {
            console.error('❌ Erreur génération image menu:', error);
            throw error;
        }
    }

    async generateCharacterActionImage(character, action, narration, options = {}) {
        try {
            const imageOptions = {
                style: options.style || this.defaultStyle,
                perspective: options.perspective || this.defaultPerspective,
                nudity: options.nudity !== undefined ? options.nudity : this.allowNudity
            };

            const imagePath = path.join(this.tempPath, `character_action_${character.id}_${Date.now()}.png`);

            if (this.hasFreepik && this.freepikClient) {
                try {
                    await this.freepikClient.generateActionImage(character, action, narration, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log('✅ Image action générée par Freepik');
                        return imageBuffer;
                    }
                } catch (freepikError) {
                    console.log('⚠️ Erreur Freepik action:', freepikError.message);
                }
            }

            throw new Error('Impossible de générer l\'image action avec Freepik');
        } catch (error) {
            console.error('❌ Erreur génération image action:', error);
            throw error;
        }
    }

    async generateCharacterImage(character, options = {}) {
        try {
            const cacheKey = `character_${character.id}_freepik_${options.style || this.defaultStyle}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log(`🎨 Génération image personnage ${character.name} avec Freepik...`);

            const imagePath = path.join(this.tempPath, `character_${character.id}_freepik.png`);

            const imageOptions = {
                style: options.style || this.defaultStyle,
                perspective: options.perspective || this.defaultPerspective,
                nudity: options.nudity !== undefined ? options.nudity : this.allowNudity
            };

            if (this.hasFreepik && this.freepikClient) {
                try {
                    await this.freepikClient.generateCharacterImage(character, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);

                    if (imageBuffer) {
                        console.log(`✅ Image personnage ${character.name} générée par Freepik`);
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (freepikError) {
                    console.log(`⚠️ Erreur Freepik personnage:`, freepikError.message);
                }
            }

            throw new Error('Impossible de générer l\'image personnage avec Freepik');

        } catch (error) {
            console.error('❌ Erreur génération image personnage:', error);
            throw error;
        }
    }

    async generateCharacterSheet(character) {
        try {
            const cacheKey = `character_sheet_${character.id}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            const imagePath = path.join(this.tempPath, `character_sheet_${character.id}.png`);

            if (this.hasFreepik && this.freepikClient) {
                console.log(`🎨 Génération fiche personnage pour ${character.name}...`);
                
                const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
                const prompt = `Character sheet portrait of ${character.name}, detailed ${genderDesc} from ${character.kingdom} kingdom, level ${character.level}, power level ${character.powerLevel}, fantasy RPG character portrait, detailed armor and equipment, first person POV perspective`;

                await this.freepikClient.generateImage(prompt, imagePath, {
                    style: this.defaultStyle,
                    perspective: 'first_person',
                    nudity: this.allowNudity
                });

                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    console.log(`✅ Fiche personnage générée par Freepik`);
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
            const canvas = createCanvas(1200, 300); // Format horizontal
            const ctx = canvas.getContext('2d');

            // Background inventaire horizontal
            ctx.fillStyle = '#2c2c2c';
            ctx.fillRect(0, 0, 1200, 300);

            // Grille d'inventaire horizontale - carrés parfaits
            const slotSize = 80;
            const slotsPerRow = 12; // Plus de slots en horizontal
            const startX = 50;
            const startY = 50;

            // Dessiner les emplacements carrés
            for (let i = 0; i < 24; i++) { // 2 rangées de 12
                const x = startX + (i % slotsPerRow) * (slotSize + 10);
                const y = startY + Math.floor(i / slotsPerRow) * (slotSize + 10);

                // Emplacement carré
                ctx.fillStyle = '#404040';
                ctx.fillRect(x, y, slotSize, slotSize);
                ctx.strokeStyle = '#606060';
                ctx.strokeRect(x, y, slotSize, slotSize);

                // Numéro de slot
                ctx.fillStyle = '#888888';
                ctx.font = '12px serif';
                ctx.textAlign = 'center';
                ctx.fillText((i + 1).toString(), x + slotSize/2, y + slotSize/2 + 4);
            }

            // Titre
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px serif';
            ctx.textAlign = 'center';
            ctx.fillText(`INVENTAIRE DE ${character.name.toUpperCase()}`, 600, 30);

            // Équipement actuel dans les premiers slots
            const equipment = character.equipment || {};
            let slotIndex = 0;

            if (equipment.weapon) {
                const x = startX + (slotIndex % slotsPerRow) * (slotSize + 10);
                const y = startY + Math.floor(slotIndex / slotsPerRow) * (slotSize + 10);
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(x + 5, y + 5, slotSize - 10, slotSize - 10);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚔️', x + slotSize/2, y + slotSize/2 + 4);
                slotIndex++;
            }

            if (equipment.armor) {
                const x = startX + (slotIndex % slotsPerRow) * (slotSize + 10);
                const y = startY + Math.floor(slotIndex / slotsPerRow) * (slotSize + 10);
                ctx.fillStyle = '#4ecdc4';
                ctx.fillRect(x + 5, y + 5, slotSize - 10, slotSize - 10);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px serif';
                ctx.textAlign = 'center';
                ctx.fillText('🛡️', x + slotSize/2, y + slotSize/2 + 4);
                slotIndex++;
            }

            // Pièces en bas
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px serif';
            ctx.textAlign = 'left';
            ctx.fillText(`💰 Pièces: ${character.coins}`, 50, 280);

            const buffer = canvas.toBuffer('image/png');
            return buffer;

        } catch (error) {
            console.error('❌ Erreur génération inventaire:', error);
            return null;
        }
    }

    async generateKingdomImage(kingdomId, options = {}) {
        try {
            const cacheKey = `kingdom_${kingdomId}_freepik_${options.style || this.defaultStyle}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log(`🎨 Génération image royaume ${kingdomId} avec Freepik...`);

            const kingdomDesc = this.getKingdomDescription(kingdomId);
            const imagePath = path.join(this.tempPath, `kingdom_${kingdomId}_freepik.png`);

            const imageOptions = {
                style: options.style || this.defaultStyle,
                perspective: 'third_person',
                nudity: false
            };

            if (this.hasFreepik && this.freepikClient) {
                try {
                    await this.freepikClient.generateKingdomImage(kingdomId, { description: kingdomDesc }, imagePath, imageOptions);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    if (imageBuffer) {
                        console.log(`✅ Image royaume ${kingdomId} générée par Freepik`);
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    }
                } catch (freepikError) {
                    console.log('⚠️ Erreur Freepik royaume:', freepikError.message);
                }
            }

            throw new Error('Impossible de générer l\'image royaume avec Freepik');

        } catch (error) {
            console.error(`❌ Erreur génération image royaume ${kingdomId}:`, error);
            throw error;
        }
    }

    async generateWorldMap(options = {}) {
        try {
            const cacheKey = `world_map_freepik_${options.style || this.defaultStyle}`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log('🗺️ Génération carte du monde détaillée avec Freepik...');

            const imagePath = path.join(this.tempPath, 'world_map_freepik.png');

            const imageOptions = {
                style: options.style || this.defaultStyle,
                perspective: 'third_person',
                nudity: false
            };

            if (this.hasFreepik && this.freepikClient) {
                await this.freepikClient.generateDetailedWorldMap(imagePath, imageOptions);
                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                if (imageBuffer) {
                    console.log('✅ Carte du monde détaillée générée par Freepik');
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                }
            }

            throw new Error('Impossible de générer la carte du monde - Freepik requis');

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
            } else if (this.hasFreepik && this.freepikClient) {
                // Fallback sur Freepik
                const prompt = `${character.name} wearing ${clothingType} clothing, ${this.getKingdomDescription(character.kingdom)}, detailed fashion illustration`;
                await this.freepikClient.generateImage(prompt, outputPath, {
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

    clearCache() {
        this.imageCache.clear();
        console.log('🗑️ Cache d\'images vidé');
    }
}

module.exports = ImageGenerator;