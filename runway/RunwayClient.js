
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class RunwayClient {
    constructor() {
        this.apiKey = process.env.RUNWAY_API_KEY || 'key_fea04da0c65548870bb187adebf6f0f5ddf32330106abb7637c9610961cd156e679f2013b021fcb933bc3054c97202d033feb21ab556bd616e8286902a8284e0';
        this.baseURL = 'https://api.runwayml.com/v1';
        this.isAvailable = false;
        
        this.initializeClient();
    }

    async initializeClient() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ RUNWAY_API_KEY non trouvée - génération de vidéos RunwayML désactivée');
                return;
            }

            // Test de l'API
            await this.testConnection();
            this.isAvailable = true;
            console.log('✅ Client RunwayML initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du client RunwayML:', error.message);
            this.isAvailable = false;
        }
    }

    async testConnection() {
        try {
            const response = await axios.get(`${this.baseURL}/tasks`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.status === 200;
        } catch (error) {
            throw new Error(`Test de connexion RunwayML échoué: ${error.message}`);
        }
    }

    hasValidClient() {
        return this.isAvailable && this.apiKey;
    }

    async generateVideoFromText(prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client RunwayML non disponible - vérifiez RUNWAY_API_KEY');
            }

            console.log(`🎬 Génération vidéo RunwayML avec prompt: "${prompt.substring(0, 100)}..."`);

            const requestData = {
                taskType: 'gen2',
                internal: false,
                options: {
                    name: `Friction Ultimate - ${Date.now()}`,
                    seconds: options.duration || 4,
                    gen2Options: {
                        mode: 'gen2',
                        seed: Math.floor(Math.random() * 1000000),
                        interpolate: true,
                        watermark: false,
                        motion_score: options.motionScore || 15,
                        use_motion_score: true,
                        text_prompt: this.optimizePromptForRunway(prompt),
                        width: options.width || 1280,
                        height: options.height || 768
                    }
                }
            };

            // Créer la tâche de génération
            const createResponse = await axios.post(`${this.baseURL}/tasks`, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const taskId = createResponse.data.task.id;
            console.log(`🎬 Tâche RunwayML créée: ${taskId}`);

            // Attendre la completion
            const videoUrl = await this.waitForCompletion(taskId);
            
            // Télécharger la vidéo
            await this.downloadVideo(videoUrl, outputPath);
            
            console.log(`✅ Vidéo RunwayML générée: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération vidéo RunwayML:', error.message);
            throw error;
        }
    }

    async generateVideoFromImage(imagePath, prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client RunwayML non disponible');
            }

            console.log(`🎬 Génération vidéo RunwayML depuis image: ${imagePath}`);

            // Uploader l'image d'abord
            const imageBuffer = await fs.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');

            const requestData = {
                taskType: 'gen2',
                internal: false,
                options: {
                    name: `Friction Ultimate Image2Video - ${Date.now()}`,
                    seconds: options.duration || 4,
                    gen2Options: {
                        mode: 'gen2',
                        seed: Math.floor(Math.random() * 1000000),
                        interpolate: true,
                        watermark: false,
                        motion_score: options.motionScore || 20,
                        use_motion_score: true,
                        text_prompt: this.optimizePromptForRunway(prompt),
                        init_image: `data:image/png;base64,${base64Image}`,
                        width: options.width || 1280,
                        height: options.height || 768
                    }
                }
            };

            const createResponse = await axios.post(`${this.baseURL}/tasks`, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const taskId = createResponse.data.task.id;
            console.log(`🎬 Tâche RunwayML Image2Video créée: ${taskId}`);

            const videoUrl = await this.waitForCompletion(taskId);
            await this.downloadVideo(videoUrl, outputPath);
            
            console.log(`✅ Vidéo RunwayML depuis image générée: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération vidéo depuis image:', error.message);
            throw error;
        }
    }

    async waitForCompletion(taskId, maxWaitTime = 180000) { // 3 minutes max
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const response = await axios.get(`${this.baseURL}/tasks/${taskId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });

                const task = response.data.task;
                console.log(`🎬 Statut RunwayML: ${task.status} (${task.progress || 0}%)`);

                if (task.status === 'SUCCEEDED') {
                    return task.artifacts[0].url;
                } else if (task.status === 'FAILED') {
                    throw new Error(`Génération échouée: ${task.failure_reason || 'Raison inconnue'}`);
                }

                // Attendre 5 secondes avant de vérifier à nouveau
                await new Promise(resolve => setTimeout(resolve, 5000));

            } catch (error) {
                console.error('❌ Erreur lors de la vérification du statut:', error.message);
                throw error;
            }
        }

        throw new Error('Timeout: La génération de vidéo a pris trop de temps');
    }

    async downloadVideo(videoUrl, outputPath) {
        try {
            const response = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            await fs.writeFile(outputPath, response.data);
            console.log(`💾 Vidéo téléchargée: ${outputPath}`);

        } catch (error) {
            console.error('❌ Erreur téléchargement vidéo:', error.message);
            throw error;
        }
    }

    optimizePromptForRunway(prompt) {
        // Optimiser le prompt pour RunwayML Gen-2
        const qualityKeywords = "cinematic, high quality, detailed, smooth motion, professional";
        const cleanPrompt = prompt
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return `${cleanPrompt}, ${qualityKeywords}`;
    }

    // Méthodes spécialisées pour le jeu
    async generateCombatVideo(combatContext, outputPath) {
        const prompt = `Epic fantasy combat scene: ${combatContext.attacker.name} fighting ${combatContext.defender.name} with ${combatContext.weapon || 'sword'}, dynamic action, medieval setting, dramatic lighting, smooth camera movement`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 6,
            motionScore: 25,
            width: 1280,
            height: 720
        });
    }

    async generateCharacterActionVideo(character, action, imagePath, outputPath) {
        const prompt = `${character.name} performing action: ${action}, fantasy RPG character, ${character.kingdom} kingdom style, cinematic movement, detailed animation`;
        
        if (imagePath && await fs.access(imagePath).then(() => true).catch(() => false)) {
            return await this.generateVideoFromImage(imagePath, prompt, outputPath, {
                duration: 4,
                motionScore: 18
            });
        } else {
            return await this.generateVideoFromText(prompt, outputPath, {
                duration: 4,
                motionScore: 18
            });
        }
    }

    async generateLocationVideo(location, character, outputPath) {
        const prompt = `Fantasy location: ${location}, ${character.name} exploring the area, epic landscape, atmospheric lighting, cinematic camera movement, medieval fantasy world`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 5,
            motionScore: 12,
            width: 1920,
            height: 1080
        });
    }
}

module.exports = RunwayClient;
