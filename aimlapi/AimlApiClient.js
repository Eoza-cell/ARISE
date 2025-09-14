
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class AimlApiClient {
    constructor() {
        this.apiKey = 'f096718811994413a3fcc5819a3b7984';
        this.baseURL = 'https://api.aimlapi.com/v1';
        this.isAvailable = true;
        
        console.log('✅ AimlApiClient initialisé avec succès');
    }

    hasValidClient() {
        return this.isAvailable && this.apiKey;
    }

    async generateImage(prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client AIMLAPI non disponible - vérifiez la clé API');
            }

            console.log(`🎨 Génération d'image AIMLAPI avec prompt: "${prompt}"`);

            // Configuration par défaut
            const style = options.style || '3d';
            const perspective = options.perspective || 'first_person';
            const nudity = options.nudity || true;
            
            console.log(`⚙️ Options: style=${style}, perspective=${perspective}, nudity=${nudity}`);
            
            // Optimiser le prompt selon les options
            const optimizedPrompt = this.optimizePrompt(prompt, style, perspective, nudity);
            
            console.log(`✨ Prompt final optimisé: "${optimizedPrompt}"`);

            const requestData = {
                model: 'flux/schnell',
                prompt: optimizedPrompt,
                n: 1,
                size: "1024x1024",
                response_format: "url"
            };

            console.log('📤 Données envoyées à AIMLAPI:', JSON.stringify(requestData, null, 2));

            const response = await axios.post(`${this.baseURL}/images/generations`, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            console.log('🔍 Statut réponse AIMLAPI:', response.status);
            console.log('🔍 Données reçues:', response.data ? 'Oui' : 'Non');

            if (response.data && response.data.data && response.data.data.length > 0) {
                const imageData = response.data.data[0];
                
                let imageUrl = null;
                if (imageData.url) {
                    imageUrl = imageData.url;
                } else if (imageData.b64_json) {
                    // Image en base64
                    const base64Image = `data:image/png;base64,${imageData.b64_json}`;
                    await this.saveBase64Image(base64Image, outputPath);
                    console.log(`✅ Image AIMLAPI générée: ${outputPath}`);
                    return outputPath;
                } else if (typeof imageData === 'string') {
                    imageUrl = imageData;
                }
                
                console.log('🔍 Type de réponse AIMLAPI:', typeof imageData);
                console.log('🔍 URL reçue:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'null');
                
                if (imageUrl) {
                    try {
                        if (imageUrl.startsWith('data:image')) {
                            await this.saveBase64Image(imageUrl, outputPath);
                        } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                            await this.downloadAndSaveImage(imageUrl, outputPath);
                        } else {
                            const base64Image = `data:image/png;base64,${imageUrl}`;
                            await this.saveBase64Image(base64Image, outputPath);
                        }
                        
                        console.log(`✅ Image AIMLAPI générée: ${outputPath}`);
                        return outputPath;
                    } catch (urlError) {
                        console.error('❌ Erreur traitement URL:', urlError.message);
                        console.log('🔍 Données complètes:', JSON.stringify(response.data, null, 2));
                    }
                }
            }

            throw new Error('Aucune image générée par AIMLAPI - réponse vide');

        } catch (error) {
            console.error('❌ Erreur génération AIMLAPI:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    optimizePrompt(prompt, style, perspective, nudity) {
        let optimized = prompt;

        // Nettoyer le prompt de base
        optimized = optimized.trim();

        // Styles améliorés pour de meilleures images
        if (style === '3d') {
            optimized = `cinematic 3D render, unreal engine 5, ray tracing, dramatic lighting, vibrant colors, fantasy game art style, ${optimized}`;
        } else {
            optimized = `high quality anime art, studio ghibli style, detailed illustration, vibrant colors, fantasy art, ${optimized}`;
        }

        // Perspectives améliorées
        const perspectiveMap = {
            'first_person': 'dynamic POV shot, immersive perspective, action scene',
            'second_person': 'heroic portrait, front facing, confident pose, detailed facial features', 
            'third_person': 'epic full body shot, action pose, detailed environment, cinematic composition'
        };
        
        optimized = `${optimized}, ${perspectiveMap[perspective]}`;

        // Gestion de la nudité améliorée
        if (nudity) {
            optimized = `${optimized}, detailed character design, anatomically correct`;
        } else {
            optimized = `${optimized}, detailed fantasy armor, medieval clothing, warrior outfit`;
        }

        // Mots-clés de qualité premium (plus courts)
        optimized = `${optimized}, masterpiece, detailed art, fantasy style`;

        // Limiter strictement la longueur pour éviter l'erreur 400
        if (optimized.length > 250) {
            // Couper au dernier mot complet mais plus agressivement
            const lastSpace = optimized.lastIndexOf(' ', 250);
            optimized = optimized.substring(0, lastSpace > 100 ? lastSpace : 250);
        }

        console.log(`🔧 Prompt optimisé final (${optimized.length} chars): "${optimized}"`);
        return optimized;
    }

    async saveBase64Image(base64Data, outputPath) {
        try {
            let base64Image;
            
            if (base64Data.includes(';base64,')) {
                base64Image = base64Data.split(';base64,').pop();
            } else if (base64Data.startsWith('data:image')) {
                base64Image = base64Data.split(',').pop();
            } else {
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
        const prompt = `Fantasy game menu, medieval castle, epic landscape`;
        
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
            perspective: options.perspective || 'first_person',
            nudity: options.nudity || false
        });
    }

    async generateActionImage(character, action, narration, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male' : 'female';
        const prompt = `${character.name}, ${genderDesc} warrior from ${character.kingdom} kingdom, performing: ${action}. ${narration}. Epic fantasy scene, detailed environment, first person POV perspective`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: 'first_person',
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

    async generateHelpImage(outputPath) {
        const prompt = `Fantasy RPG help guide interface, medieval scroll with game commands, detailed UI design, magical parchment with glowing text, fantasy game manual page`;
        
        return await this.generateImage(prompt, outputPath, {
            style: '3d',
            perspective: 'third_person',
            nudity: false
        });
    }

    async generateOrdersOverview(outputPath) {
        const prompt = `Seven fantasy military orders overview, detailed guild emblems and banners, medieval warrior organizations, fantasy order symbols and crests`;
        
        return await this.generateImage(prompt, outputPath, {
            style: '3d',
            perspective: 'third_person',
            nudity: false
        });
    }

    async generateCombatGuideImage(outputPath) {
        const prompt = `Fantasy RPG combat system guide, detailed combat interface, medieval weapons and armor, power level progression chart, epic combat scene`;
        
        return await this.generateImage(prompt, outputPath, {
            style: '3d',
            perspective: 'third_person',
            nudity: false
        });
    }
}

module.exports = AimlApiClient;
