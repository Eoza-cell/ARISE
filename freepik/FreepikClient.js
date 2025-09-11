
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
                num_images: 1,
                image_size: "1024x1024",
                style: style === '3d' ? 'photorealistic' : 'anime',
                negative_prompt: style === '3d' ? 'cartoon, anime, 2d' : '3d, photorealistic',
                num_inference_steps: 30,
                guidance_scale: 7.5
            };

            const response = await axios.post(`${this.baseURL}/ai/text-to-image`, requestData, {
                headers: {
                    'X-Freepik-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data && response.data.data && response.data.data[0]) {
                const imageUrl = response.data.data[0].url;
                await this.downloadAndSaveImage(imageUrl, outputPath);
                
                console.log(`✅ Image Freepik générée: ${outputPath}`);
                return outputPath;
            } else {
                throw new Error('Aucune image générée par Freepik');
            }

        } catch (error) {
            console.error('❌ Erreur génération Freepik:', error.message);
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

    async downloadAndSaveImage(imageUrl, outputPath) {
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 15000
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

    async generateActionImage(character, action, narration, options = {}) {
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
}

module.exports = FreepikClient;
