#!/usr/bin/env node

/**
 * Script de génération d'images pour tous les boss et PNJ de Friction Ultimate
 * Utilise PollinationsClient pour créer des images horrifiques mais épiques
 */

const ImageGenerator = require('../utils/ImageGenerator');
const path = require('path');
const fs = require('fs').promises;

class FrictionBossImageGenerator {
    constructor() {
        this.imageGenerator = new ImageGenerator();
        this.outputDir = path.join(__dirname, '../assets/boss_images');
        this.npcOutputDir = path.join(__dirname, '../assets/npc_images');
        
        // Définitions des boss S+ (les plus terrifiants)
        this.sPlusBosses = [
            {
                name: 'Zephyrion_Dragon_Empereur_Cosmic',
                prompt: 'massive cosmic dragon emperor, crystalline obsidian scales reflecting starfields, multiple ethereal wings with galaxy patterns, eyes like burning black holes, floating in dimensional void, cosmic horror, dark fantasy, terrifying yet majestic, eldritch horror aesthetic'
            },
            {
                name: 'Malachar_Liche_Supreme_Eternelle',
                prompt: 'undead lich supreme eternal, ancient skeletal king, glowing purple soul flames, ornate bone crown, tattered royal robes, necromantic energy aura, floating above bone throne, horror fantasy, death incarnate, terrifyingly powerful'
            },
            {
                name: 'Azgoroth_Demon_Roi_des_Abysses',
                prompt: 'demonic king of the abyss, massive red-skinned demon lord, burning horns, molten armor, chains of souls, hellfire wings, standing in infernal portal, dark horror fantasy, absolutely terrifying yet imposing'
            }
        ];
        
        // Boss majeurs par royaume
        this.kingdomBosses = [
            {
                name: 'Gareth_Paladin_Dechu_Aegyria',
                prompt: 'fallen paladin knight, corrupted golden armor turning black, tarnished holy symbols, glowing red eyes, broken sword dripping darkness, tragic yet terrifying, dark fantasy horror'
            },
            {
                name: 'Umbra_Esprit_Ancien_Sombrenuit',
                prompt: 'ancient forest spirit wraith, twisted tree-like form, glowing blue ethereal eyes, dark mist body, ancient curse aura, moonlight filtering through ghostly form, haunting forest horror'
            },
            {
                name: 'Xerath_Sphinx_Gardien_Khelos',
                prompt: 'massive desert sphinx guardian, lion body with human head, ancient golden armor, glowing hieroglyphic markings, sand storm aura, desert ruins background, mythological horror'
            },
            {
                name: 'Leviathan_Kraken_Abrantis',
                prompt: 'colossal kraken sea monster, massive tentacles emerging from dark ocean, bioluminescent markings, crushing ship in tentacles, stormy seas, aquatic cosmic horror, terrifyingly huge'
            },
            {
                name: 'Urskan_Ours_Primordial_Varha',
                prompt: 'primordial giant bear spirit, massive size, ancient runic markings on fur, glowing amber eyes, ice and snow aura, mountain peak background, primal natural horror'
            },
            {
                name: 'Malphas_Arbre_Demon_Sylvaria',
                prompt: 'corrupted tree demon, massive twisted ancient tree, glowing red sap veins, face in bark, reaching branch arms, dark forest corruption, nature horror twisted into nightmare'
            },
            {
                name: 'Voidreaper_Seigneur_Portails_Eclypsia',
                prompt: 'dimensional portal lord, hooded figure with void for face, reality tears around body, floating magical orbs, dark energy tendrils, cosmic horror mage, terrifying dimensional entity'
            },
            {
                name: 'Rex_Atomicus_Roi_Mutants_Terre_Desolee',
                prompt: 'radioactive mutant king, massive muscular form, glowing green veins, metallic cybernetic parts, wasteland armor, toxic aura, post-apocalyptic horror, nuclear nightmare'
            },
            {
                name: 'Pyrothane_Dragon_Magma_Drak_Tarr',
                prompt: 'volcanic magma dragon, molten rock scales, lava flowing from body, fire breath, volcanic eruption background, infernal heat aura, demonic fire dragon horror'
            },
            {
                name: 'Frankenstein_Ultime_Createur_Fou_Urvala',
                prompt: 'mad scientist creator ultimate, grotesque patchwork body, multiple arms with surgical tools, glowing brain visible, laboratory background, necromantic horror, science gone wrong'
            },
            {
                name: 'Warlord_Infinity_General_Eternel_Ombrefiel',
                prompt: 'eternal warlord general, spectral warrior in ancient armor, multiple phantom weapons, battle-scarred face, ghostly army behind, eternal warfare curse, military horror'
            },
            {
                name: 'Barbe_Maudit_Pirate_Fantome_Khaldar',
                prompt: 'cursed ghost pirate captain, skeletal face with flowing phantom beard, tattered pirate coat, ghostly ship in background, treasure curse aura, nautical horror'
            }
        ];
        
        // PNJ représentatifs des royaumes
        this.kingdomNPCs = [
            {
                name: 'Marcus_le_Juste_Roi_Paladin_Aegyria',
                prompt: 'noble paladin king, golden ceremonial armor with holy runes, divine aura, righteous expression, cathedral background, holy warrior, inspiring yet intimidating'
            },
            {
                name: 'Nyssa_Reine_Lune_Sombrenuit',
                prompt: 'mysterious moon queen, ethereal beauty, silver hair, lunar crown, flowing dark robes with star patterns, moonlight aura, enchanting yet unsettling'
            },
            {
                name: 'Azim_Sultan_Marchand_Khelos',
                prompt: 'desert merchant sultan, ornate robes with gold trim, curved scimitar, calculating eyes, marketplace background, wealthy trader, charismatic but cunning'
            },
            {
                name: 'Tormund_Amiral_Roi_Abrantis',
                prompt: 'sea king admiral, naval uniform with storm patterns, commanding presence, ship deck background, weathered sailor face, maritime authority'
            },
            {
                name: 'Bjorn_Jarl_Supreme_Varha',
                prompt: 'mountain jarl warrior, massive build, fur-lined armor, battle axe, ice-covered beard, snowy peaks background, primal nordic strength'
            },
            {
                name: 'Liora_Archidruide_Sylvaria',
                prompt: 'forest archdruid, nature-woven robes, staff with living wood, gentle eyes with ancient wisdom, forest glade background, harmony with nature'
            }
        ];
        
        // PNJ des ordres mystiques
        this.orderNPCs = [
            {
                name: 'Baelthuron_Seigneur_Demoniaque',
                prompt: 'demonic lord cultist, dark robes with infernal symbols, horned mask, demonic energy aura, ritual chamber background, terrifying cult leader'
            },
            {
                name: 'Mechanicus_Prime_Grand_Ingenieur',
                prompt: 'techno-mage engineer, mechanical armor with steam pipes, goggles, metallic prosthetics, workshop background, technological horror aesthetic'
            },
            {
                name: 'Ombre_Sans_Nom_Maitre_Lame',
                prompt: 'shadowy assassin master, completely shrouded in darkness, only glowing eyes visible, multiple hidden blades, mysterious and deadly'
            },
            {
                name: 'Hierophante_Aurelien_Grand_Pretre',
                prompt: 'holy priest guardian, white robes with golden trim, sacred relics, divine light aura, ancient cathedral background, protector of artifacts'
            },
            {
                name: 'Solarius_Grand_Croise_Radiant',
                prompt: 'radiant crusader paladin, shining armor with holy symbols, divine sword, righteous fury, golden light aura, sacred warrior'
            },
            {
                name: 'Oeil_Qui_Voit_Tout_Maitre_Espion',
                prompt: 'mysterious spymaster, face hidden by shadows, multiple eyes emerging from darkness, information network visualization, surveillance horror'
            },
            {
                name: 'Anarchos_Heraut_du_Chaos',
                prompt: 'chaos herald anarchist, wild appearance, explosive devices, chaotic energy aura, destructive madness, anarchist revolutionary'
            }
        ];
    }
    
    async createDirectories() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.mkdir(this.npcOutputDir, { recursive: true });
            console.log('📁 Dossiers d\'images créés');
        } catch (error) {
            console.error('❌ Erreur création dossiers:', error);
        }
    }
    
    async generateBossImage(boss, category = 'boss') {
        try {
            const outputPath = path.join(
                category === 'boss' ? this.outputDir : this.npcOutputDir, 
                `${boss.name}.png`
            );
            
            console.log(`🎨 Génération de ${boss.name}...`);
            
            // Ajouter des éléments horror spécifiques au prompt
            const horrorPrompt = `${boss.prompt}, horror fantasy art, dark atmosphere, intimidating presence, masterpiece quality, 8k resolution, dramatic lighting, epic boss character`;
            
            // Utiliser PollinationsClient directement
            if (this.imageGenerator.pollinationsClient && this.imageGenerator.hasPollinations) {
                await this.imageGenerator.pollinationsClient.generateImage(
                    horrorPrompt, 
                    outputPath, 
                    { style: '3d', perspective: 'third_person', nudity: false }
                );
                console.log(`✅ ${boss.name} généré avec succès !`);
                return true;
            } else {
                console.log(`⚠️ PollinationsClient non disponible pour ${boss.name}`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Erreur génération ${boss.name}:`, error.message);
            return false;
        }
    }
    
    async generateAllImages() {
        console.log('🚀 Début de la génération des images Friction Ultimate...\n');
        
        await this.createDirectories();
        
        let successCount = 0;
        let totalCount = 0;
        
        // Générer les boss S+ (les plus importants)
        console.log('👹 === GÉNÉRATION DES BOSS S+ LÉGENDAIRES ===');
        for (const boss of this.sPlusBosses) {
            totalCount++;
            const success = await this.generateBossImage(boss, 'boss');
            if (success) successCount++;
            
            // Pause entre générations pour éviter rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Générer les boss majeurs des royaumes
        console.log('\n⚔️ === GÉNÉRATION DES BOSS MAJEURS DES ROYAUMES ===');
        for (const boss of this.kingdomBosses) {
            totalCount++;
            const success = await this.generateBossImage(boss, 'boss');
            if (success) successCount++;
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Générer les PNJ des royaumes
        console.log('\n👑 === GÉNÉRATION DES PNJ DES ROYAUMES ===');
        for (const npc of this.kingdomNPCs) {
            totalCount++;
            const success = await this.generateBossImage(npc, 'npc');
            if (success) successCount++;
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Générer les PNJ des ordres
        console.log('\n🔮 === GÉNÉRATION DES PNJ DES ORDRES MYSTIQUES ===');
        for (const npc of this.orderNPCs) {
            totalCount++;
            const success = await this.generateBossImage(npc, 'npc');
            if (success) successCount++;
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`\n🎉 === GÉNÉRATION TERMINÉE ===`);
        console.log(`✅ ${successCount}/${totalCount} images générées avec succès`);
        console.log(`📁 Images boss sauvées dans: ${this.outputDir}`);
        console.log(`📁 Images PNJ sauvées dans: ${this.npcOutputDir}`);
    }
}

// Exécution du script
async function main() {
    try {
        const generator = new FrictionBossImageGenerator();
        await generator.generateAllImages();
    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    }
}

// Exécuter uniquement si appelé directement
if (require.main === module) {
    main();
}

module.exports = FrictionBossImageGenerator;