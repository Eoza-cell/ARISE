const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const Asset3DManager = require('../utils/Asset3DManager');

class BlenderClient {
    constructor() {
        this.blenderPath = '/nix/store/z0kq8gpxrydf4zg7pyh0rmgifscdnm73-blender-4.4.3/bin/blender';
        this.scriptsPath = path.join(__dirname, 'scripts');
        this.outputPath = path.join(__dirname, '..', 'temp');
        this.isAvailable = true;
        
        // Initialiser le gestionnaire d'assets 3D
        this.assetManager = new Asset3DManager();
        this.assetsReady = false;
        
        console.log('🎨 BlenderClient initialisé pour personnalisation 3D');
        console.log('🎨 BlenderClient initialisé - Vérification en cours...');
        
        // Initialiser les assets de façon asynchrone
        this.initializeAssets();
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

# Importer le modèle humain de base réaliste
${this.generateHumanModelImport(customization)}
character_obj = bpy.context.active_object
if character_obj:
    character_obj.name = "${character.name}_model"
else:
    # Fallback si pas de modèle 3D disponible
    bpy.ops.mesh.primitive_monkey_add(location=(0, 0, 0))
    character_obj = bpy.context.active_object
    character_obj.name = "${character.name}_fallback"

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

# Ajouter équipements 3D réalistes
${this.generateEquipmentCode(customization.equipment || {})}

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
     * Initialiser les assets 3D
     */
    async initializeAssets() {
        try {
            console.log('🎨 BlenderClient - Initialisation des assets 3D...');
            
            const initSuccess = await this.assetManager.initialize();
            if (initSuccess) {
                // Vérifier si on a des modèles
                const stats = await this.assetManager.checkExistingAssets();
                const totalModels = stats.humanModels.male + stats.humanModels.female + 
                                  stats.equipment.weapons + stats.equipment.armor;
                
                if (totalModels === 0) {
                    console.log('📥 Aucun asset 3D trouvé - Téléchargement automatique...');
                    await this.downloadRealistic3DAssets();
                } else {
                    console.log(`✅ ${totalModels} assets 3D disponibles`);
                }
                
                this.assetsReady = true;
                console.log('✅ BlenderClient disponible - Personnalisation 3D prête');
            } else {
                console.log('⚠️ Échec initialisation assets - Mode fallback activé');
                this.assetsReady = false;
            }
            
        } catch (error) {
            console.error('❌ Erreur initialisation assets 3D:', error);
            this.assetsReady = false;
        }
    }
    
    /**
     * Télécharge les assets 3D réalistes
     */
    async downloadRealistic3DAssets() {
        console.log('🚀 Téléchargement des modèles 3D réalistes...');
        
        try {
            const results = await this.assetManager.downloadAllAssets();
            
            if (results.humans || results.equipment) {
                console.log('✅ Assets 3D téléchargés avec succès');
            } else {
                console.log('⚠️ Téléchargement partiel - Génération d\'assets par défaut');
            }
            
        } catch (error) {
            console.error('❌ Erreur téléchargement assets:', error);
        }
    }
    
    /**
     * Génère le code d'import de modèle humain réaliste
     */
    generateHumanModelImport(customization) {
        const gender = customization.gender || 'male';
        
        // Utilise un modèle 3D réaliste si disponible
        return `
# Importer modèle humain réaliste (${gender})
import_path = None

# Essayer de charger un modèle FBX/GLB réaliste
try:
    import_path = "${this.getHumanModelPath(gender)}"
    if import_path and os.path.exists(import_path):
        if import_path.endswith('.fbx'):
            bpy.ops.import_scene.fbx(filepath=import_path)
        elif import_path.endswith('.glb') or import_path.endswith('.gltf'):
            bpy.ops.import_scene.gltf(filepath=import_path)
        
        # Sélectionner le modèle importé
        imported_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
        if imported_objects:
            character_obj = imported_objects[0]  # Premier mesh trouvé
            bpy.context.view_layer.objects.active = character_obj
        else:
            character_obj = None
    else:
        character_obj = None
        
except Exception as e:
    print(f"⚠️ Erreur import modèle 3D: {e}")
    character_obj = None
`;
    }
    
    /**
     * Récupère le chemin d'un modèle humain
     */
    getHumanModelPath(gender) {
        // En production, ceci récupérera le vrai chemin depuis l'AssetManager
        const basePath = path.join(__dirname, '..', 'assets', '3d', 'humans', gender);
        
        // Modèles préférés par ordre de priorité
        const preferredModels = [
            'Realistic_Male_Base.fbx',
            'Realistic_Female_Base.fbx', 
            'Casual_Male_Rigged.fbx',
            'Casual_Female_Rigged.fbx',
            'RPM_Male_Base.glb',
            'RPM_Female_Base.glb'
        ];
        
        // Retourner le premier modèle qui correspond au genre
        for (const model of preferredModels) {
            if ((gender === 'male' && model.includes('Male')) || 
                (gender === 'female' && model.includes('Female'))) {
                return path.join(basePath, model);
            }
        }
        
        // Fallback
        return null;
    }
    
    /**
     * Génère le code d'équipement 3D
     */
    generateEquipmentCode(equipment) {
        if (!equipment || !this.assetsReady) {
            return '# Pas d\'équipement spécifique';
        }
        
        let equipCode = '';
        
        // Ajouter armes
        if (equipment.weapon) {
            equipCode += `
# Ajouter arme: ${equipment.weapon}
try:
    weapon_path = "${this.getEquipmentPath('weapons', equipment.weapon)}"
    if weapon_path and os.path.exists(weapon_path):
        if weapon_path.endswith('.fbx'):
            bpy.ops.import_scene.fbx(filepath=weapon_path)
        elif weapon_path.endswith('.glb'):
            bpy.ops.import_scene.gltf(filepath=weapon_path)
        
        # Positionner l'arme
        weapon_objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']
        if weapon_objects:
            weapon = weapon_objects[0]
            weapon.location = (1.2, 0, 0.8)  # À droite du personnage
            weapon.name = "weapon_${equipment.weapon}"
except Exception as e:
    print(f"⚠️ Erreur import arme: {e}")
`;
        }
        
        // Ajouter armure
        if (equipment.armor) {
            equipCode += `
# Ajouter armure: ${equipment.armor}
try:
    armor_path = "${this.getEquipmentPath('armor', equipment.armor)}"
    if armor_path and os.path.exists(armor_path):
        if armor_path.endswith('.fbx'):
            bpy.ops.import_scene.fbx(filepath=armor_path)
        elif armor_path.endswith('.glb'):
            bpy.ops.import_scene.gltf(filepath=armor_path)
        
        # Adapter l'armure au personnage
        armor_objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']
        if armor_objects:
            armor = armor_objects[0]
            armor.parent = character_obj
            armor.name = "armor_${equipment.armor}"
except Exception as e:
    print(f"⚠️ Erreur import armure: {e}")
`;
        }
        
        return equipCode;
    }
    
    /**
     * Récupère le chemin d'un équipement
     */
    getEquipmentPath(category, itemName) {
        const basePath = path.join(__dirname, '..', 'assets', '3d', 'equipment', category);
        
        // Formats supportés par priorité
        const extensions = ['.fbx', '.glb', '.gltf'];
        
        for (const ext of extensions) {
            const fullPath = path.join(basePath, itemName + ext);
            return fullPath; // Retourne le chemin (sera vérifié par Blender)
        }
        
        return null;
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