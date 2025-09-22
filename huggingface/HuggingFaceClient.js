const { InferenceClient } = require("@huggingface/inference");
const fs = require('fs').promises;
const path = require('path');

class HuggingFaceClient {
    constructor() {
        this.apiKey = process.env.HF_TOKEN;
        this.client = null;
        this.isAvailable = false;
        
        this.initializeClient();
    }

    async initializeClient() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ HF_TOKEN non trouvée - génération de vidéos Hugging Face désactivée');
                return;
            }

            this.client = new InferenceClient(this.apiKey);
            this.isAvailable = true;
            console.log('✅ Client Hugging Face initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du client Hugging Face:', error.message);
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isAvailable && this.client && this.apiKey;
    }

    async generateVideoFromText(prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Hugging Face non disponible - vérifiez HF_TOKEN');
            }

            console.log(`🤗 Génération vidéo Hugging Face avec prompt: "${prompt.substring(0, 100)}..."`);

            const optimizedPrompt = this.optimizePromptForHuggingFace(prompt);
            
            // Generate video using Hugging Face text-to-video
            const videoBlob = await this.client.textToVideo({
                provider: "fal-ai",
                model: "Wan-AI/Wan2.2-T2V-A14B",
                inputs: optimizedPrompt,
            });

            // Convert Blob to Buffer and save to file
            const arrayBuffer = await videoBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            await fs.writeFile(outputPath, buffer);
            console.log(`✅ Vidéo Hugging Face générée: ${outputPath}`);
            
            return {
                success: true,
                videoPath: outputPath,
                duration: options.duration || 5,
                provider: 'huggingface'
            };

        } catch (error) {
            console.error('❌ Erreur génération vidéo Hugging Face:', error.message);
            throw new Error(`Génération vidéo échouée: ${error.message}`);
        }
    }

    optimizePromptForHuggingFace(prompt) {
        // Optimize prompt for Hugging Face video generation
        let optimized = prompt
            .replace(/['"]/g, '') // Remove quotes
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

        // Add common video generation improvements
        const improvements = [
            'cinematic',
            'high quality',
            'detailed',
            'smooth motion'
        ];

        // Add improvements if not already present
        improvements.forEach(improvement => {
            if (!optimized.toLowerCase().includes(improvement)) {
                optimized += `, ${improvement}`;
            }
        });

        // Limit length for better performance
        if (optimized.length > 200) {
            optimized = optimized.substring(0, 197) + '...';
        }

        console.log(`🎯 Prompt optimisé HF: "${optimized}"`);
        return optimized;
    }

    // RPG-specific video generation methods
    async generateCombatVideo(action, character, outputPath) {
        const prompt = `${character.name} in medieval fantasy combat, ${action}, epic battle scene, dynamic movement, armor and weapons, dramatic lighting, action sequence`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 4
        });
    }

    async generateCharacterActionVideo(action, character, location, outputPath) {
        const prompt = `${character.name} performing ${action} in ${location}, medieval fantasy setting, character in motion, atmospheric environment, cinematic camera angle`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 5
        });
    }

    async generateLocationVideo(location, character, outputPath) {
        const prompt = `Fantasy location: ${location}, ${character.name} exploring the area, epic landscape, atmospheric lighting, cinematic camera movement, medieval fantasy world`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 6
        });
    }

    async generateMagicSpellVideo(spellName, character, outputPath) {
        const prompt = `${character.name} casting ${spellName} magic spell, mystical energy effects, glowing magical aura, fantasy spellcasting, dynamic magical particles, epic scene`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 4
        });
    }
}

module.exports = HuggingFaceClient;