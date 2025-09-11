
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class FreepikClient {
    constructor() {
        this.apiKey = process.env.FREEPIK_API_KEY || 'FPSX11305a933da0266dcebc4968539c331a';
        this.baseURL = 'https://api.freepik.com/v1';
        this.isAvailable = true;
        
        console.log('✅ FreepikClient initialisé avec succès');
    }

    hasValidClient() {
        return this.isAvailable && this.apiKey;
    }

    async generateImage(prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Freepik non disponible - vérifiez FREEPIK_API_KEY');
            }

            console.log(`🎨 Génération d'image Freepik: "${prompt.substring(0, 100)}..."`);

            // Configuration par défaut
            const style = options.style || '3d'; // 3d ou 2d
            const perspective = options.perspective || 'first_person'; // first_person, second_person, third_person
            const nudity = options.nudity || true; // Autoriser la nudité complète
            
            // Optimiser le prompt selon les options
            const optimizedPrompt = this.optimizePrompt(prompt, style, perspective, nudity);

            const requestData = {
                prompt: optimizedPrompt,
                negative_prompt: style === '3d' ? 'cartoon, anime, 2d' : '3d, photorealistic',
                image: {
                    size: "1024x1024"
                }
            };

            const response = await axios.post(`${this.baseURL}/ai/text-to-image`, requestData, {
                headers: {
                    'X-Freepik-API-Key': this.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 60000
            });

            if (response.data && response.data.data && response.data.data.length > 0) {
                const imageData = response.data.data[0];
                
                // Vérifier différents formats de réponse possible
                let imageUrl = null;
                if (imageData.url) {
                    imageUrl = imageData.url;
                } else if (imageData.base64) {
                    imageUrl = imageData.base64;
                } else if (imageData.image && imageData.image.url) {
                    imageUrl = imageData.image.url;
                } else if (typeof imageData === 'string') {
                    imageUrl = imageData;
                }
                
                console.log('🔍 Type de réponse Freepik:', typeof imageData);
                console.log('🔍 URL reçue:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'null');
                
                if (imageUrl) {
                    try {
                        if (imageUrl.startsWith('data:image')) {
                            // Image en base64
                            await this.saveBase64Image(imageUrl, outputPath);
                        } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                            // URL d'image valide
                            await this.downloadAndSaveImage(imageUrl, outputPath);
                        } else {
                            // Probablement base64 sans préfixe
                            const base64Image = `data:image/png;base64,${imageUrl}`;
                            await this.saveBase64Image(base64Image, outputPath);
                        }
                        
                        console.log(`✅ Image Freepik générée: ${outputPath}`);
                        return outputPath;
                    } catch (urlError) {
                        console.error('❌ Erreur traitement URL:', urlError.message);
                        console.log('🔍 Données complètes:', JSON.stringify(response.data, null, 2));
                    }
                }
            }

            throw new Error('Aucune image générée par Freepik - réponse vide');

        } catch (error) {
            console.error('❌ Erreur génération Freepik:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            
            // Log de debug pour comprendre la structure
            if (response && response.data) {
                console.log('🔍 Structure réponse complète:', JSON.stringify(response.data, null, 2));
            }
            
            throw error;
        }
    }

    optimizePrompt(prompt, style, perspective, nudity) {
        let optimized = prompt;

        // Ajouter la perspective
        const perspectiveMap = {
            'first_person': 'first person view, POV perspective, seen from character eyes',
            'second_person': 'second person view, facing the character directly',
            'third_person': 'third person view, external perspective, full body visible'
        };
        
        optimized = `${perspectiveMap[perspective]}, ${optimized}`;

        // Ajouter le style
        if (style === '3d') {
            optimized = `3D realistic, highly detailed 3D rendering, photorealistic, ${optimized}`;
        } else {
            optimized = `2D anime style, manga art style, detailed anime illustration, ${optimized}`;
        }

        // Gestion de la nudité
        if (nudity) {
            optimized = `${optimized}, detailed anatomy, nude, naked, visible genitals, uncensored, explicit content allowed`;
        }

        // Mots-clés de qualité
        optimized = `masterpiece, best quality, ultra-detailed, 8k resolution, ${optimized}`;

        return optimized;
    }

    async saveBase64Image(base64Data, outputPath) {
        try {
            let base64Image;
            
            if (base64Data.includes(';base64,')) {
                base64Image = base64Data.split(';base64,').pop();
            } else if (base64Data.startsWith('data:image')) {
                // Format sans ;base64, mais avec data:image
                base64Image = base64Data.split(',').pop();
            } else {
                // Données base64 brutes
                base64Image = base64Data;
            }
            
            // Nettoyer les caractères indésirables
            base64Image = base64Image.replace(/[^A-Za-z0-9+/=]/g, '');
            
            console.log(`💾 Longueur base64: ${base64Image.length}`);
            const imageBuffer = Buffer.from(base64Image, 'base64');
            
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(outputPath, imageBuffer);
            console.log(`💾 Image base64 sauvegardée: ${outputPath} (${imageBuffer.length} bytes)`);

        } catch (error) {
            console.error('❌ Erreur sauvegarde image base64:', error.message);
            console.error('❌ Données base64 problématiques:', base64Data.substring(0, 100) + '...');
            throw error;
        }
    }

    async downloadAndSaveImage(imageUrl, outputPath) {
        try {
            console.log(`📥 Téléchargement depuis: ${imageUrl}`);
            
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(outputPath, Buffer.from(response.data));
            console.log(`💾 Image téléchargée: ${outputPath}`);

        } catch (error) {
            console.error('❌ Erreur téléchargement image:', error.message);
            throw error;
        }
    }

    async generateMenuImage(outputPath) {
        const prompt = `Young man with black hair throwing a powerful right hook punch directly into demon's face at maximum speed, impact moment, steampunk medieval fantasy setting, dramatic lighting, action scene, motion blur, epic composition`;
        
        return await this.generateImage(prompt, outputPath, {
            style: '3d',
            perspective: 'third_person',
            nudity: false
        });
    }

    async generateCharacterImage(character, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
        const prompt = `Detailed ${genderDesc} from ${character.kingdom} kingdom, power level ${character.powerLevel}, fantasy RPG character, detailed armor and weapons`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: options.perspective || 'third_person',
            nudity: options.nudity || false
        });
    }

    async generateActionImage(character, action, narration, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male' : 'female';
        const prompt = `${character.name}, ${genderDesc} warrior from ${character.kingdom} kingdom, performing: ${action}. ${narration}. Epic fantasy scene, detailed environment`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: options.perspective || 'first_person',
            nudity: options.nudity || false
        });
    }

    async generateKingdomImage(kingdomId, kingdomData, outputPath, options = {}) {
        const prompt = `Fantasy kingdom of ${kingdomId}: ${kingdomData.description}, epic landscape, detailed architecture, atmospheric lighting`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: 'third_person',
            nudity: false
        });
    }

    async generateWorldMap(outputPath, options = {}) {
        const prompt = `Detailed fantasy world map showing 12 kingdoms, ancient cartography style, medieval fantasy, detailed regions, mountains, forests, deserts, coastlines`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: 'third_person',
            nudity: false
        });
    }

    async generateDetailedWorldMap(outputPath, options = {}) {
        const prompt = `Ultra-detailed fantasy world map with 12 distinct kingdoms: 
        AEGYRIA golden plains with castles and honor banners, 
        SOMBRENUIT dark mysterious forests with shadow towers, 
        KHELOS burning desert with ancient pyramids and ruins, 
        ABRANTIS coastal fortified cities with harbors and ships, 
        VARHA snowy mountains with ice fortresses, 
        SYLVARIA magical bright forests with elven cities, 
        ECLYPSIA dark eclipse lands with obsidian spires, 
        TERRE_DESOLE post-apocalyptic wasteland with ruins, 
        DRAK_TARR volcanic peaks with dragon lairs, 
        URVALA misty swamps with alchemist towers, 
        OMBREFIEL gray plains with mercenary camps, 
        KHALDAR tropical jungles with tribal villages. 
        Show detailed roads connecting kingdoms, trade routes, rivers, mountains, forests, cities, villages, landmarks. 
        Ancient parchment style with ornate borders, compass rose, legend. 
        Masterpiece cartography with every detail visible: houses, farms, bridges, watchtowers, temples, markets.`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: 'third_person',
            nudity: false
        });
    }
}

module.exports = FreepikClient;
