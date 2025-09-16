
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class PollinationsClient {
    constructor() {
        this.baseURL = 'https://image.pollinations.ai/prompt';
        this.isAvailable = true;
        
        console.log('✅ PollinationsClient initialisé avec succès (GRATUIT)');
    }

    hasValidClient() {
        return this.isAvailable;
    }

    async generateImage(prompt, outputPath, options = {}) {
        try {
            console.log(`🎨 Génération d'image Pollinations GRATUITE avec prompt: "${prompt}"`);

            // Configuration par défaut
            const style = options.style || '3d';
            const perspective = options.perspective || 'first_person';
            const nudity = options.nudity || true;
            
            // Optimiser le prompt
            const optimizedPrompt = this.optimizePrompt(prompt, style, perspective, nudity);
            
            console.log(`✨ Prompt final optimisé: "${optimizedPrompt}"`);

            // URL de l'API Pollinations avec paramètres
            const imageUrl = `${this.baseURL}/${encodeURIComponent(optimizedPrompt)}?width=1024&height=1024&seed=-1&model=flux&nologo=true`;
            
            console.log(`📥 Téléchargement depuis: ${imageUrl.substring(0, 100)}...`);
            
            // Télécharger l'image directement
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Sauvegarder l'image
            await fs.writeFile(outputPath, Buffer.from(response.data));
            console.log(`✅ Image Pollinations générée GRATUITEMENT: ${outputPath}`);
            
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération Pollinations:', error.message);
            throw error;
        }
    }

    optimizePrompt(prompt, style, perspective, nudity) {
        let optimized = prompt;

        // Nettoyer le prompt
        optimized = optimized.trim();

        // Styles améliorés
        if (style === '3d') {
            optimized = `3D render, unreal engine, photorealistic, detailed, ${optimized}`;
        } else {
            optimized = `digital art, illustration, anime style, ${optimized}`;
        }

        // Perspectives
        const perspectiveMap = {
            'first_person': 'POV, first person view, immersive angle',
            'second_person': 'portrait, face focus, detailed features', 
            'third_person': 'full body, dynamic pose, action shot'
        };
        
        optimized = `${optimized}, ${perspectiveMap[perspective]}`;

        // Gestion nudité
        if (nudity) {
            optimized = `${optimized}, detailed anatomy`;
        } else {
            optimized = `${optimized}, clothed, armor, medieval outfit`;
        }

        // Qualité
        optimized = `${optimized}, masterpiece, high quality, 8K, vibrant colors, sharp focus`;

        // Limiter la longueur pour l'URL
        if (optimized.length > 300) {
            optimized = optimized.substring(0, 300);
        }

        return optimized;
    }

    async generateMenuImage(outputPath) {
        const prompt = `Fantasy RPG main menu, epic medieval castle, magical atmosphere, cinematic lighting, game interface background`;
        
        return await this.generateImage(prompt, outputPath, {
            style: '3d',
            perspective: 'third_person',
            nudity: false
        });
    }

    async generateCharacterImage(character, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
        const prompt = `${genderDesc} from ${character.kingdom} kingdom, fantasy RPG character, detailed armor, level ${character.level}`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: options.perspective || 'first_person',
            nudity: options.nudity || false
        });
    }

    async generateActionImage(character, action, narration, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male' : 'female';
        const prompt = `${character.name}, ${genderDesc} warrior, ${action}, ${narration}, epic fantasy scene, first person POV`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: 'first_person',
            nudity: options.nudity || false
        });
    }
}

module.exports = PollinationsClient;
