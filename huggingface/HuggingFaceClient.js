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
            
            console.log(`🎬 Utilisation du modèle Wan-AI/Wan2.2-T2V-A14B pour génération vidéo...`);

            // Use the new textToVideo API with Wan-AI model
            const videoBlob = await this.client.textToVideo({
                provider: "auto",
                model: "Wan-AI/Wan2.2-T2V-A14B",
                inputs: optimizedPrompt
            });

            console.log(`📥 Réponse reçue, traitement du blob vidéo...`);

            // Handle the Blob response
            let buffer;
            if (videoBlob instanceof Blob) {
                const arrayBuffer = await videoBlob.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
                console.log(`💾 Vidéo convertie en buffer (${buffer.length} bytes)`);
            } else {
                throw new Error('Format de réponse inattendu - attendu Blob');
            }
            
            // Créer le dossier de sortie si nécessaire
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            await fs.writeFile(outputPath, buffer);
            console.log(`✅ Vidéo Hugging Face générée avec Wan-AI: ${outputPath} (${buffer.length} bytes)`);
            
            return {
                success: true,
                videoPath: outputPath,
                duration: options.duration || 5,
                provider: 'huggingface',
                model: 'Wan-AI/Wan2.2-T2V-A14B',
                fileSize: buffer.length
            };

        } catch (error) {
            console.error('❌ Erreur génération vidéo Hugging Face:', error.message);
            
            // Si l'erreur concerne le modèle, essayer un fallback
            if (error.message.includes('model') || error.message.includes('Wan-AI')) {
                console.log('🔄 Tentative avec le modèle de fallback...');
                try {
                    const fallbackVideo = await this.generateVideoWithFallbackModel(prompt, outputPath, options);
                    return fallbackVideo;
                } catch (fallbackError) {
                    console.error('❌ Erreur modèle de fallback:', fallbackError.message);
                }
            }
            
            throw new Error(`Génération vidéo échouée: ${error.message}`);
        }
    }

    /**
     * Méthode de fallback avec l'ancien modèle
     */
    async generateVideoWithFallbackModel(prompt, outputPath, options = {}) {
        try {
            console.log(`🔄 Utilisation du modèle de fallback damo-vilab/text-to-video-ms-1.7b...`);

            const optimizedPrompt = this.optimizePromptForHuggingFace(prompt);
            
            const response = await this.client.request({
                model: "damo-vilab/text-to-video-ms-1.7b",
                inputs: optimizedPrompt,
                parameters: {
                    num_frames: options.num_frames || 16,
                    fps: options.fps || 8,
                    width: options.width || 256,
                    height: options.height || 256
                }
            });

            let buffer;
            if (response instanceof Blob) {
                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            } else if (response instanceof ArrayBuffer) {
                buffer = Buffer.from(response);
            } else if (Buffer.isBuffer(response)) {
                buffer = response;
            } else {
                throw new Error('Format de réponse inattendu de Hugging Face');
            }
            
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            await fs.writeFile(outputPath, buffer);
            console.log(`✅ Vidéo Hugging Face générée avec modèle de fallback: ${outputPath}`);
            
            return {
                success: true,
                videoPath: outputPath,
                duration: options.duration || 5,
                provider: 'huggingface',
                model: 'damo-vilab/text-to-video-ms-1.7b',
                fileSize: buffer.length
            };

        } catch (error) {
            console.error('❌ Erreur modèle de fallback:', error.message);
            throw error;
        }
    }

    optimizePromptForHuggingFace(prompt) {
        // Optimize prompt specifically for Wan-AI/Wan2.2-T2V-A14B model
        let optimized = prompt
            .replace(/['"]/g, '') // Remove quotes
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

        // Add video generation improvements optimized for Wan-AI model
        const improvements = [
            'cinematic quality',
            'professional video',
            'smooth camera movement',
            'high definition',
            '4K quality'
        ];

        // Add improvements if not already present
        improvements.forEach(improvement => {
            if (!optimized.toLowerCase().includes(improvement.toLowerCase())) {
                optimized += `, ${improvement}`;
            }
        });

        // Wan-AI model works better with longer, more descriptive prompts
        if (optimized.length > 300) {
            optimized = optimized.substring(0, 297) + '...';
        }

        console.log(`🎯 Prompt optimisé pour Wan-AI: "${optimized}"`);
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