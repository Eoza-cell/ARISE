const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class BlenderClient {
    constructor() {
        this.blenderPath = '/nix/store/z0kq8gpxrydf4zg7pyh0rmgifscdnm73-blender-4.4.3/bin/blender';
        this.scriptsPath = path.join(__dirname, 'scripts');
        this.outputPath = path.join(__dirname, '..', 'temp');
        this.isAvailable = true;

        console.log('🎨 BlenderClient initialisé pour personnalisation 3D');
    }

    /**
     * Générer un modèle 3D de personnage personnalisé
     * @param {Object} character - Données du personnage
     * @param {Object} customization - Options de personnalisation
     * @param {string} outputPath - Chemin de sortie
     */
    async generateCustomCharacter(character, customization, outputPath) {
        try {
            console.log(`🎨 Génération modèle 3D personnalisé pour ${character.name}...`);

            // Créer le script Python pour Blender
            const scriptContent = this.generateBlenderScript(character, customization, outputPath);
            const scriptPath = path.join(this.scriptsPath, `character_${character.id}_${Date.now()}.py`);

            // Créer le dossier des scripts s'il n'existe pas
            await fs.mkdir(this.scriptsPath, { recursive: true });

            // Écrire le script Blender
            await fs.writeFile(scriptPath, scriptContent);

            // Exécuter Blender en mode headless
            await this.executeBlenderScript(scriptPath, outputPath);

            // Nettoyer le script temporaire
            await fs.unlink(scriptPath);

            console.log(`✅ Modèle 3D personnalisé généré: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération 3D Blender:', error);
            throw error;
        }
    }

    /**
     * Générer le script Python pour Blender
     */
    generateBlenderScript(character, customization, outputPath) {
        return `
import bpy
import bmesh
import os
from mathutils import Vector

# Nettoyer la scène
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Créer un personnage de base (cube modifié)
bpy.ops.mesh.primitive_monkey_add(location=(0, 0, 0))
character_obj = bpy.context.active_object
character_obj.name = "${character.name}_model"

# Entrer en mode édition
bpy.context.view_layer.objects.active = character_obj
bpy.ops.object.mode_set(mode='EDIT')

# Créer un maillage de base pour personnage
bm = bmesh.from_mesh(character_obj.data)

# Personnalisations basées sur les paramètres
${this.generateCustomizationCode(customization)}

# Appliquer les modifications
bmesh.update_edit_mesh(character_obj.data)
bpy.ops.object.mode_set(mode='OBJECT')

# Ajouter un matériau
material = bpy.data.materials.new(name="${character.name}_Material")
material.use_nodes = True
character_obj.data.materials.append(material)

# Configuration de la couleur basée sur le royaume
${this.generateKingdomMaterial(character.kingdom)}

# Configuration de l'éclairage
bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
light = bpy.context.active_object
light.data.energy = 3

# Configuration de la caméra
bpy.ops.object.camera_add(location=(7, -7, 5))
camera = bpy.context.active_object
camera.rotation_euler = (1.1, 0, 0.785)

# Configuration du rendu
bpy.context.scene.camera = camera
bpy.context.scene.render.resolution_x = 1024
bpy.context.scene.render.resolution_y = 1024
bpy.context.scene.render.filepath = "${outputPath}"

# Rendu de l'image
bpy.ops.render.render(write_still=True)

print("✅ Rendu 3D personnalisé terminé: ${outputPath}")
`;
    }

    /**
     * Générer le code de personnalisation basé sur les options
     */
    generateCustomizationCode(customization) {
        let code = '';
        
        // Taille du personnage
        if (customization.height) {
            const scale = customization.height === 'tall' ? 1.2 : customization.height === 'short' ? 0.8 : 1.0;
            code += `
# Ajuster la taille
bpy.ops.transform.resize(value=(1, 1, ${scale}))
`;
        }

        // Corpulence
        if (customization.build) {
            const scaleX = customization.build === 'muscular' ? 1.1 : customization.build === 'thin' ? 0.9 : 1.0;
            code += `
# Ajuster la corpulence
bpy.ops.transform.resize(value=(${scaleX}, ${scaleX}, 1))
`;
        }

        // Couleur de peau (sera appliquée via le matériau)
        if (customization.skinColor) {
            code += `
# Note: Couleur de peau appliquée via le matériau
`;
        }

        return code;
    }

    /**
     * Générer le matériau basé sur le royaume
     */
    generateKingdomMaterial(kingdom) {
        const kingdomColors = {
            'ASTORIA': '(0.8, 0.7, 0.3, 1.0)',  // Doré
            'URVALA': '(0.3, 0.6, 0.3, 1.0)',   // Vert marécageux
            'TERRE_DESOLE': '(0.6, 0.4, 0.2, 1.0)', // Brun post-apocalyptique
            'NEIGE_ETERNELLE': '(0.9, 0.9, 1.0, 1.0)', // Blanc glacé
            'MAGNA_FORGE': '(0.8, 0.3, 0.1, 1.0)',  // Rouge forge
            'TEMPETE_NOIRE': '(0.2, 0.2, 0.4, 1.0)', // Violet sombre
            'ELDORIA': '(0.4, 0.8, 0.9, 1.0)',      // Cyan mystique
            'VALLEES_VERDOYANTES': '(0.2, 0.8, 0.2, 1.0)', // Vert nature
            'CITADELLE_CELESTE': '(1.0, 0.9, 0.7, 1.0)',   // Blanc céleste
            'ABYSSES_PROFONDS': '(0.1, 0.1, 0.3, 1.0)',    // Bleu abyssal
            'SABLES_ARDENTS': '(0.9, 0.6, 0.1, 1.0)',      // Orange désert
            'CRISTAUX_ETERNELS': '(0.7, 0.3, 0.9, 1.0)'    // Violet cristal
        };

        const color = kingdomColors[kingdom] || '(0.5, 0.5, 0.5, 1.0)';

        return `
# Configuration matériau du royaume ${kingdom}
nodes = material.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs[0].default_value = ${color}  # Base Color
    bsdf.inputs[4].default_value = 0.3  # Metallic
    bsdf.inputs[9].default_value = 0.5  # Roughness
`;
    }

    /**
     * Exécuter le script Blender
     */
    async executeBlenderScript(scriptPath, outputPath) {
        return new Promise((resolve, reject) => {
            const blender = spawn(this.blenderPath, [
                '--background',  // Mode headless
                '--python', scriptPath
            ]);

            let output = '';
            let errorOutput = '';

            blender.stdout.on('data', (data) => {
                output += data.toString();
            });

            blender.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            blender.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Script Blender exécuté avec succès');
                    resolve(outputPath);
                } else {
                    console.error('❌ Erreur exécution Blender:', errorOutput);
                    reject(new Error(`Blender failed with code ${code}: ${errorOutput}`));
                }
            });

            blender.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Générer les variations de vêtements pour auberges
     */
    async generateClothingVariation(character, clothingType, outputPath) {
        const customization = {
            clothing: clothingType,
            height: 'normal',
            build: 'normal'
        };

        return await this.generateCustomCharacter(character, customization, outputPath);
    }

    /**
     * Vérifier la disponibilité de Blender
     */
    async checkAvailability() {
        try {
            const result = await new Promise((resolve, reject) => {
                const blender = spawn(this.blenderPath, ['--version']);
                
                blender.on('close', (code) => {
                    resolve(code === 0);
                });

                blender.on('error', () => {
                    resolve(false);
                });
            });

            this.isAvailable = result;
            return result;
        } catch (error) {
            this.isAvailable = false;
            return false;
        }
    }
}

module.exports = BlenderClient;