
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class PythonVideoClient {
    constructor() {
        this.pythonPath = 'python3';
        this.scriptPath = path.join(__dirname, 'video_generator.py');
        this.isAvailable = false;
        this.initializeClient();
    }

    async initializeClient() {
        try {
            // Vérifier si Python et les dépendances sont disponibles
            const testResult = await this.runPythonScript('test', 'temp/test.mp4');
            if (!testResult.error || testResult.error.includes('Pipeline')) {
                this.isAvailable = true;
                console.log('✅ PythonVideoClient initialisé - diffusers disponible');
            }
        } catch (error) {
            console.log('⚠️ PythonVideoClient indisponible:', error.message);
            this.isAvailable = false;
        }
    }

    async runPythonScript(prompt, outputPath) {
        return new Promise((resolve, reject) => {
            const python = spawn(this.pythonPath, [this.scriptPath, prompt, outputPath]);
            
            let stdout = '';
            let stderr = '';
            
            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                stderr += data.toString();
                console.log('🐍 Python:', data.toString().trim());
            });
            
            python.on('close', (code) => {
                try {
                    if (stdout.trim()) {
                        const result = JSON.parse(stdout.trim());
                        resolve(result);
                    } else {
                        resolve({ error: `Code: ${code}, stderr: ${stderr}` });
                    }
                } catch (parseError) {
                    reject(new Error(`Parse error: ${parseError.message}, stdout: ${stdout}`));
                }
            });
            
            python.on('error', (error) => {
                reject(error);
            });
        });
    }

    async generateVideoFromText(prompt, outputPath, options = {}) {
        if (!this.isAvailable) {
            throw new Error('Python video client non disponible');
        }

        console.log(`🐍 Génération vidéo Python: "${prompt.substring(0, 100)}..."`);
        
        try {
            const result = await this.runPythonScript(prompt, outputPath);
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            if (result.success && result.video_path) {
                // Vérifier que le fichier existe
                try {
                    await fs.access(result.video_path);
                    console.log(`✅ Vidéo Python générée: ${result.video_path}`);
                    return result.video_path;
                } catch {
                    throw new Error('Fichier vidéo non créé');
                }
            }
            
            throw new Error('Génération échouée');
            
        } catch (error) {
            console.error('❌ Erreur génération vidéo Python:', error.message);
            throw error;
        }
    }

    hasValidClient() {
        return this.isAvailable;
    }
}

module.exports = PythonVideoClient;
