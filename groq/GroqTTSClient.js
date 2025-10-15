const fs = require('fs').promises;
const path = require('path');
const Groq = require('groq-sdk');

class GroqTTSClient {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        this.isAvailable = false;
        this.isInitialized = false;
        
        if (!this.apiKey) {
            console.log('⚠️ GROQ_API_KEY non configurée - Groq TTS désactivé');
            return;
        }
        
        this.groq = new Groq({ apiKey: this.apiKey });
        this.isAvailable = true;
        this.isInitialized = true;
        
        console.log('✅ GroqTTSClient initialisé avec succès - Synthèse vocale Groq activée');
        console.log('🎙️ Modèle PlayAI-TTS disponible avec 19 voix (masculines et féminines)');
    }

    hasValidClient() {
        return this.isInitialized && this.isAvailable;
    }

    async generateVoice(text, outputPath, options = {}) {
        if (!this.hasValidClient()) {
            console.log('⚠️ Groq TTS non disponible - génération vocale ignorée');
            return null;
        }

        try {
            console.log(`🎙️ Génération vocale Groq TTS: "${text.substring(0, 50)}..."`);

            const voice = options.voice || 'Aaliyah-PlayAI';
            const responseFormat = options.responseFormat || 'wav';

            const wav = await this.groq.audio.speech.create({
                model: "playai-tts",
                voice: voice,
                response_format: responseFormat,
                input: text
            });

            const buffer = Buffer.from(await wav.arrayBuffer());
            
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(outputPath, buffer);

            console.log(`✅ Audio Groq TTS généré: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération vocale Groq TTS:', error.message);
            return null;
        }
    }

    async generateDialogueVoice(npcName, dialogue, outputPath, characterType = 'neutral', gender = 'female') {
        const voiceMap = {
            female: {
                warrior: 'Cheyenne-PlayAI',
                merchant: 'Gail-PlayAI',
                noble: 'Celeste-PlayAI',
                guard: 'Arista-PlayAI',
                peasant: 'Deedee-PlayAI',
                neutral: 'Aaliyah-PlayAI'
            },
            male: {
                warrior: 'Thunder-PlayAI',
                merchant: 'Calum-PlayAI',
                noble: 'Cillian-PlayAI',
                guard: 'Atlas-PlayAI',
                peasant: 'Chip-PlayAI',
                neutral: 'Mason-PlayAI'
            }
        };

        const voice = voiceMap[gender]?.[characterType] || (gender === 'male' ? 'Mason-PlayAI' : 'Aaliyah-PlayAI');
        
        const cleanDialogue = dialogue.replace(/[""]/g, '"').replace(/'/g, "'").trim();
        
        if (cleanDialogue.length > 500) {
            const truncated = cleanDialogue.substring(0, 500);
            return await this.generateVoice(truncated, outputPath, { voice });
        }
        
        return await this.generateVoice(cleanDialogue, outputPath, { voice });
    }

    async generateNarrationVoice(narration, outputPath, gender = 'male') {
        const cleanNarration = narration.replace(/[""]/g, '"').replace(/'/g, "'").trim();
        
        const narratorVoice = gender === 'male' ? 'Basil-PlayAI' : 'Celeste-PlayAI';
        
        if (cleanNarration.length > 700) {
            const truncated = cleanNarration.substring(0, 700);
            return await this.generateVoice(truncated, outputPath, { voice: narratorVoice });
        }
        
        return await this.generateVoice(cleanNarration, outputPath, { voice: narratorVoice });
    }

    getAvailableVoices() {
        return [
            // Voix féminines
            { id: 'Aaliyah-PlayAI', name: 'Aaliyah', gender: 'female', type: 'neutral' },
            { id: 'Arista-PlayAI', name: 'Arista', gender: 'female', type: 'guard' },
            { id: 'Celeste-PlayAI', name: 'Celeste', gender: 'female', type: 'noble' },
            { id: 'Cheyenne-PlayAI', name: 'Cheyenne', gender: 'female', type: 'warrior' },
            { id: 'Deedee-PlayAI', name: 'Deedee', gender: 'female', type: 'peasant' },
            { id: 'Gail-PlayAI', name: 'Gail', gender: 'female', type: 'merchant' },
            { id: 'Mamaw-PlayAI', name: 'Mamaw', gender: 'female', type: 'elder' },
            { id: 'Quinn-PlayAI', name: 'Quinn', gender: 'female', type: 'neutral' },
            
            // Voix masculines
            { id: 'Atlas-PlayAI', name: 'Atlas', gender: 'male', type: 'guard' },
            { id: 'Basil-PlayAI', name: 'Basil', gender: 'male', type: 'narrator' },
            { id: 'Briggs-PlayAI', name: 'Briggs', gender: 'male', type: 'warrior' },
            { id: 'Calum-PlayAI', name: 'Calum', gender: 'male', type: 'merchant' },
            { id: 'Chip-PlayAI', name: 'Chip', gender: 'male', type: 'peasant' },
            { id: 'Cillian-PlayAI', name: 'Cillian', gender: 'male', type: 'noble' },
            { id: 'Fritz-PlayAI', name: 'Fritz', gender: 'male', type: 'craftsman' },
            { id: 'Indigo-PlayAI', name: 'Indigo', gender: 'male', type: 'neutral' },
            { id: 'Mason-PlayAI', name: 'Mason', gender: 'male', type: 'neutral' },
            { id: 'Mikail-PlayAI', name: 'Mikail', gender: 'male', type: 'scholar' },
            { id: 'Mitch-PlayAI', name: 'Mitch', gender: 'male', type: 'trader' },
            { id: 'Thunder-PlayAI', name: 'Thunder', gender: 'male', type: 'warrior' }
        ];
    }
}

module.exports = GroqTTSClient;
