const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');
const GeminiClient = require('../gemini/GeminiClient');

class ImageGenerator {
    constructor() {
        this.imageCache = new Map();
        this.assetsPath = path.join(__dirname, '../assets');
        this.tempPath = path.join(__dirname, '../temp');
        
        // Initialisation optionnelle de GeminiClient
        try {
            this.geminiClient = new GeminiClient();
            this.hasGemini = this.geminiClient.isAvailable;
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de GeminiClient dans ImageGenerator:', error.message);
            this.geminiClient = null;
            this.hasGemini = false;
            console.log('⚠️ ImageGenerator fonctionnera en mode fallback uniquement');
        }
        
        // Créer les dossiers nécessaires
        this.initializeFolders();
    }

    async initializeFolders() {
        try {
            await fs.mkdir(this.assetsPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });
            console.log('✅ Dossiers d\'images initialisés');
        } catch (error) {
            console.error('❌ Erreur lors de la création des dossiers:', error);
        }
    }

    async generateMenuImage() {
        try {
            const cacheKey = 'menu_main_ai';
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log('🎨 Génération de l\'image de menu avec IA Gemini...');
            
            const prompt = `Create a stunning steampunk fantasy menu background image for "FRICTION ULTIMATE" RPG game. 
            - Show a young dark-haired man throwing a powerful right hook punch directly into the face of a demon at maximum speed
            - Steampunk medieval-technological setting with brass gears, pipes, and steam
            - Dark atmospheric background with golden accents
            - Epic action scene with motion blur and impact effects
            - Text space for "FRICTION ULTIMATE" title
            - High quality, dramatic lighting, cinematic composition
            - Style: Dark fantasy steampunk art, highly detailed`;

            const imagePath = path.join(this.tempPath, 'menu_main_ai.png');
            
            try {
                // Générer l'image avec Gemini AI (si disponible)
                if (this.hasGemini && this.geminiClient) {
                    await this.geminiClient.generateImage(prompt, imagePath);
                } else {
                    console.log('⚠️ Gemini AI non disponible, passage direct au fallback');
                    return await this.generateMenuImageFallback();
                }
                
                // Vérifier si l'image a été créée
                const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                
                if (imageBuffer) {
                    console.log('✅ Image de menu générée avec succès par IA');
                    this.imageCache.set(cacheKey, imageBuffer);
                    return imageBuffer;
                } else {
                    console.log('⚠️ IA indisponible, utilisation du fallback Canvas');
                    return await this.generateMenuImageFallback();
                }
            } catch (aiError) {
                console.log('⚠️ Erreur IA, utilisation du fallback Canvas:', aiError.message);
                return await this.generateMenuImageFallback();
            }

        } catch (error) {
            console.error('❌ Erreur lors de la génération de l\'image de menu:', error);
            return await this.generateMenuImageFallback();
        }
    }

    async generateCharacterImage(character) {
        try {
            const cacheKey = `character_${character.id}_ai`;
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log(`🎨 Génération de l'image du personnage ${character.name} avec IA...`);
            
            const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
            const kingdomDesc = this.getKingdomDescription(character.kingdom);
            
            const prompt = `Create a detailed 3D realistic portrait of a ${genderDesc} from ${character.kingdom} kingdom:\n` +
                          `- Character name: ${character.name}\n` +
                          `- Kingdom style: ${kingdomDesc}\n` +
                          `- Power level: ${character.powerLevel} (${this.getPowerLevelDescription(character.powerLevel)})\n` +
                          `- Full body standing pose, detailed armor and weapons\n` +
                          `- Background matching the kingdom's environment\n` +
                          `- High quality 3D realistic rendering\n` +
                          `- Fantasy RPG character design\n` +
                          `- Cinematic lighting and composition`;

            const imagePath = path.join(this.tempPath, `character_${character.id}_ai.png`);
            
            try {
                if (this.hasGemini && this.geminiClient) {
                    await this.geminiClient.generateImage(prompt, imagePath);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    
                    if (imageBuffer) {
                        console.log(`✅ Image du personnage ${character.name} générée avec succès par IA`);
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    } else {
                        return await this.generateCharacterImageFallback(character);
                    }
                } else {
                    console.log('⚠️ Gemini AI non disponible pour personnage, fallback utilisé');
                    return await this.generateCharacterImageFallback(character);
                }
            } catch (aiError) {
                console.log(`⚠️ Fallback Canvas pour personnage ${character.name}:`, aiError.message);
                return await this.generateCharacterImageFallback(character);
            }

        } catch (error) {
            console.error('❌ Erreur lors de la génération de l\'image de personnage:', error);
            return await this.generateCharacterImageFallback(character);
        }
    }

    async generateCharacterSheet(character) {
        try {
            const canvas = createCanvas(800, 1000);
            const ctx = canvas.getContext('2d');

            // Background parchemin
            const gradient = ctx.createLinearGradient(0, 0, 800, 1000);
            gradient.addColorStop(0, '#f4e4bc');
            gradient.addColorStop(1, '#e6d3a3');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 800, 1000);

            // Bordure ornementée
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 5;
            ctx.strokeRect(20, 20, 760, 960);

            // Titre
            ctx.fillStyle = '#8b4513';
            ctx.font = 'bold 32px serif';
            ctx.textAlign = 'center';
            ctx.fillText('FICHE DE PERSONNAGE', 400, 70);

            // Portrait placeholder
            ctx.fillStyle = '#d2b48c';
            ctx.fillRect(50, 100, 200, 250);
            ctx.strokeStyle = '#8b4513';
            ctx.strokeRect(50, 100, 200, 250);

            // Informations principales
            ctx.fillStyle = '#2f1b14';
            ctx.font = 'bold 24px serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Nom: ${character.name}`, 280, 140);
            ctx.fillText(`Sexe: ${character.gender === 'male' ? 'Homme' : 'Femme'}`, 280, 170);
            ctx.fillText(`Royaume: ${character.kingdom}`, 280, 200);
            ctx.fillText(`Ordre: ${character.order || 'Aucun'}`, 280, 230);

            // Statistiques
            ctx.font = '18px serif';
            let yPos = 280;
            ctx.fillText(`Niveau: ${character.level}`, 280, yPos);
            ctx.fillText(`Expérience: ${character.experience}`, 280, yPos + 30);
            ctx.fillText(`Puissance: ${character.powerLevel}`, 280, yPos + 60);
            ctx.fillText(`Friction: ${character.frictionLevel}`, 280, yPos + 90);

            // Barres de vie et énergie
            yPos = 400;
            ctx.fillText('Barres de combat:', 50, yPos);
            this.drawHealthBar(ctx, 50, yPos + 20, character.currentLife, character.maxLife);
            this.drawEnergyBar(ctx, 50, yPos + 50, character.currentEnergy, character.maxEnergy);

            // Équipement
            yPos = 500;
            ctx.font = 'bold 20px serif';
            ctx.fillText('ÉQUIPEMENT:', 50, yPos);
            ctx.font = '16px serif';
            
            const equipmentText = this.formatEquipmentForImage(character.equipment);
            const lines = equipmentText.split('\n');
            lines.forEach((line, index) => {
                ctx.fillText(line, 50, yPos + 30 + (index * 20));
            });

            // Techniques
            yPos = 650;
            ctx.font = 'bold 20px serif';
            ctx.fillText('TECHNIQUES APPRISES:', 50, yPos);
            ctx.font = '16px serif';
            
            const techniques = character.learnedTechniques || [];
            if (techniques.length === 0) {
                ctx.fillText('• Aucune technique apprise', 50, yPos + 30);
            } else {
                techniques.forEach((tech, index) => {
                    ctx.fillText(`• ${tech}`, 50, yPos + 30 + (index * 20));
                });
            }

            // Position et richesse
            yPos = 800;
            ctx.font = 'bold 18px serif';
            ctx.fillText(`Position actuelle: ${character.currentLocation}`, 50, yPos);
            ctx.fillText(`Pièces d'or: ${character.coins}`, 50, yPos + 30);

            const buffer = canvas.toBuffer('image/png');
            return buffer;

        } catch (error) {
            console.error('❌ Erreur lors de la génération de la fiche:', error);
            return null;
        }
    }

    async generateInventoryImage(character) {
        try {
            const canvas = createCanvas(800, 600);
            const ctx = canvas.getContext('2d');

            // Background inventaire
            ctx.fillStyle = '#2c2c2c';
            ctx.fillRect(0, 0, 800, 600);

            // Grille d'inventaire horizontale
            const slotSize = 80;
            const slotsPerRow = 8;
            const startX = 50;
            const startY = 100;

            // Dessiner les emplacements
            for (let i = 0; i < 24; i++) { // 3 rangées de 8
                const x = startX + (i % slotsPerRow) * (slotSize + 10);
                const y = startY + Math.floor(i / slotsPerRow) * (slotSize + 10);

                // Emplacement vide
                ctx.fillStyle = '#404040';
                ctx.fillRect(x, y, slotSize, slotSize);
                ctx.strokeStyle = '#606060';
                ctx.strokeRect(x, y, slotSize, slotSize);
            }

            // Titre
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px serif';
            ctx.textAlign = 'center';
            ctx.fillText(`INVENTAIRE DE ${character.name.toUpperCase()}`, 400, 40);

            // Équipement porté
            ctx.font = '16px serif';
            ctx.textAlign = 'left';
            ctx.fillText('Équipement porté:', 50, 450);
            
            const equipment = character.equipment || {};
            let yPos = 470;
            if (equipment.weapon) {
                ctx.fillText(`⚔️ Arme: ${equipment.weapon}`, 50, yPos);
                yPos += 20;
            }
            if (equipment.armor) {
                ctx.fillText(`🛡️ Armure: ${equipment.armor}`, 50, yPos);
                yPos += 20;
            }

            // Pièces
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 18px serif';
            ctx.fillText(`💰 Pièces: ${character.coins}`, 50, 550);

            const buffer = canvas.toBuffer('image/png');
            return buffer;

        } catch (error) {
            console.error('❌ Erreur lors de la génération de l\'inventaire:', error);
            return null;
        }
    }

    async generateKingdomsOverview() {
        try {
            const cacheKey = 'kingdoms_overview_ai';
            if (this.imageCache.has(cacheKey)) {
                return this.imageCache.get(cacheKey);
            }

            console.log('🎨 Génération de l\'aperçu des royaumes avec IA...');
            
            const prompt = `Create a magnificent fantasy world map showing the 12 kingdoms of Friction Ultimate:
            - AEGYRIA: Golden plains with honor and chivalry, mountain forges
            - SOMBRENUIT: Dark mysterious forests with moon and spirits
            - KHELOS: Burning desert with ancient ruins and oasis
            - ABRANTIS: Coastal fortified cities with ships and sea
            - VARHA: Snowy mountains with hunters and beasts
            - SYLVARIA: Magical bright forests with druids and archers
            - ECLYPSIA: Dark lands under eclipse skies with shadow magic
            - TERRE_DESOLE: Wasteland with survivors and ruins
            - DRAK_TARR: Volcanic peaks with dragon fire forges
            - URVALA: Misty swamps with alchemists and undead
            - OMBREFIEL: Gray plains with exiled mercenaries
            - KHALDAR: Tropical jungles with treasures and pirates
            Style: Fantasy world map, detailed regions, ancient cartography, vibrant colors`;

            const imagePath = path.join(this.tempPath, 'kingdoms_overview_ai.png');
            
            try {
                if (this.hasGemini && this.geminiClient) {
                    await this.geminiClient.generateImage(prompt, imagePath);
                    const imageBuffer = await fs.readFile(imagePath).catch(() => null);
                    
                    if (imageBuffer) {
                        console.log('✅ Aperçu des royaumes généré avec succès par IA');
                        this.imageCache.set(cacheKey, imageBuffer);
                        return imageBuffer;
                    } else {
                        return await this.generateKingdomsOverviewFallback();
                    }
                } else {
                    console.log('⚠️ Gemini AI non disponible pour royaumes, fallback utilisé');
                    return await this.generateKingdomsOverviewFallback();
                }
            } catch (aiError) {
                console.log('⚠️ Fallback Canvas pour royaumes:', aiError.message);
                return await this.generateKingdomsOverviewFallback();
            }

        } catch (error) {
            console.error('❌ Erreur lors de la génération de l\'aperçu des royaumes:', error);
            return await this.generateKingdomsOverviewFallback();
        }
    }

    async generateWorldMap() {
        try {
            const canvas = createCanvas(1200, 800);
            const ctx = canvas.getContext('2d');

            // Background - style carte ancienne
            ctx.fillStyle = '#f4e4bc';
            ctx.fillRect(0, 0, 1200, 800);

            // Titre
            ctx.fillStyle = '#8b4513';
            ctx.font = 'bold 32px serif';
            ctx.textAlign = 'center';
            ctx.fillText('CARTE DU MONDE - FRICTION ULTIMATE', 600, 40);

            // Légende simple des régions
            ctx.font = '16px serif';
            ctx.textAlign = 'left';
            ctx.fillText('🏰 Royaumes principaux', 50, 100);
            ctx.fillText('⚔️ Quartiers des Ordres', 50, 130);
            ctx.fillText('💀 Zones dangereuses', 50, 160);

            // Représentation simplifiée de la carte
            // Ceci sera remplacé par une vraie carte générée avec les APIs
            ctx.fillStyle = '#90EE90';
            ctx.fillRect(200, 200, 800, 500);
            
            ctx.fillStyle = '#8B4513';
            ctx.font = 'bold 20px serif';
            ctx.textAlign = 'center';
            ctx.fillText('MONDE DE FRICTION', 600, 450);
            ctx.fillText('Carte détaillée en développement', 600, 480);

            const buffer = canvas.toBuffer('image/png');
            return buffer;

        } catch (error) {
            console.error('❌ Erreur lors de la génération de la carte:', error);
            return null;
        }
    }

    // Méthodes utilitaires
    drawHealthBar(ctx, x, y, current, max) {
        const barWidth = 150;
        const barHeight = 20;
        const percentage = current / max;

        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Barre de vie
        ctx.fillStyle = percentage > 0.5 ? '#00ff00' : percentage > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(x, y, barWidth * percentage, barHeight);

        // Bordure
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Texte
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px serif';
        ctx.textAlign = 'center';
        ctx.fillText(`❤️ ${current}/${max}`, x + barWidth/2, y + 15);
    }

    drawEnergyBar(ctx, x, y, current, max) {
        const barWidth = 150;
        const barHeight = 20;
        const percentage = current / max;

        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Barre d'énergie
        ctx.fillStyle = '#0080ff';
        ctx.fillRect(x, y, barWidth * percentage, barHeight);

        // Bordure
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Texte
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚡ ${current}/${max}`, x + barWidth/2, y + 15);
    }

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

    getPowerLevelDescription(level) {
        const descriptions = {
            'G': 'very weak beginner',
            'F': 'weak apprentice fighter',
            'E': 'moderate basic soldier',
            'D': 'experienced combatant',
            'C': 'strong experienced warrior',
            'B': 'elite combat specialist',
            'A': 'master level fighter'
        };
        
        return descriptions[level] || 'unknown power level';
    }

    async generateCharacterImageFallback(character) {
        const canvas = createCanvas(600, 800);
        const ctx = canvas.getContext('2d');

        // Background selon le royaume
        const kingdomColors = this.getKingdomColors(character.kingdom);
        const gradient = ctx.createLinearGradient(0, 0, 600, 800);
        gradient.addColorStop(0, kingdomColors.primary);
        gradient.addColorStop(1, kingdomColors.secondary);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 600, 800);

        // Cadre du personnage
        ctx.fillStyle = '#000000';
        ctx.fillRect(50, 100, 500, 600);

        // Modèle 3D placeholder
        ctx.fillStyle = character.gender === 'male' ? '#8B4513' : '#DEB887';
        ctx.fillRect(200, 200, 200, 400);

        // Tête
        ctx.beginPath();
        ctx.arc(300, 180, 40, 0, 2 * Math.PI);
        ctx.fill();

        // Titre
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px serif';
        ctx.textAlign = 'center';
        ctx.fillText(character.name, 300, 50);

        // Informations du personnage
        ctx.font = '16px serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Royaume: ${character.kingdom}`, 60, 720);
        ctx.fillText(`Ordre: ${character.order || 'Aucun'}`, 60, 745);
        ctx.fillText(`Niveau: ${character.level} (${character.powerLevel})`, 60, 770);

        // Barres de vie et énergie
        this.drawHealthBar(ctx, 400, 720, character.currentLife, character.maxLife);
        this.drawEnergyBar(ctx, 400, 750, character.currentEnergy, character.maxEnergy);

        const buffer = canvas.toBuffer('image/png');
        return buffer;
    }

    formatEquipmentForImage(equipment) {
        if (!equipment || Object.keys(equipment).length === 0) {
            return '• Aucun équipement';
        }
        
        let formatted = '';
        if (equipment.weapon) formatted += `• Arme: ${equipment.weapon}\n`;
        if (equipment.armor) formatted += `• Armure: ${equipment.armor}\n`;
        if (equipment.accessories && equipment.accessories.length > 0) {
            formatted += `• Accessoires: ${equipment.accessories.join(', ')}\n`;
        }
        
        return formatted || '• Aucun équipement';
    }

    // Méthodes fallback utilisant Canvas en cas d'indisponibilité de l'IA
    async generateMenuImageFallback() {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        // Background steampunk
        const gradient = ctx.createLinearGradient(0, 0, 800, 600);
        gradient.addColorStop(0, '#2c1810');
        gradient.addColorStop(0.5, '#4a2c1a');
        gradient.addColorStop(1, '#1a0f08');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);

        // Titre "FRICTION ULTIMATE"
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 48px serif';
        ctx.textAlign = 'center';
        ctx.fillText('FRICTION ULTIMATE', 400, 100);

        // Image de combat placeholder
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(150, 180, 500, 300);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px serif';
        ctx.fillText('🥊 JEUNE HOMME vs DÉMON 👹', 400, 330);

        const buffer = canvas.toBuffer('image/png');
        this.imageCache.set('menu_fallback', buffer);
        return buffer;
    }

    async generateKingdomsOverviewFallback() {
        const canvas = createCanvas(1000, 800);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 1000, 800);

        // Titre
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 36px serif';
        ctx.textAlign = 'center';
        ctx.fillText('LES 12 ROYAUMES', 500, 50);

        // Grille simple des royaumes
        const kingdoms = [
            'AEGYRIA', 'SOMBRENUIT', 'KHELOS', 'ABRANTIS',
            'VARHA', 'SYLVARIA', 'ECLYPSIA', 'TERRE_DESOLE',
            'DRAK\'TARR', 'URVALA', 'OMBREFIEL', 'KHALDAR'
        ];

        kingdoms.forEach((kingdom, index) => {
            const x = 100 + (index % 4) * 250;
            const y = 150 + Math.floor(index / 4) * 200;

            ctx.fillStyle = this.getKingdomColors(kingdom).primary;
            ctx.fillRect(x, y, 200, 150);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px serif';
            ctx.textAlign = 'center';
            ctx.fillText(kingdom, x + 100, y + 75);
        });

        const buffer = canvas.toBuffer('image/png');
        return buffer;
    }

    clearCache() {
        this.imageCache.clear();
        console.log('🗑️ Cache d\'images vidé');
    }
}

module.exports = ImageGenerator;