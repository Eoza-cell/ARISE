#!/usr/bin/env node

/**
 * Script pour générer les images IA manquantes des PNJ des ordres mystiques
 */

const PollinationsClient = require('../pollinations/PollinationsClient');
const path = require('path');
const fs = require('fs').promises;

async function generateMissingImages() {
    const pollinationsClient = new PollinationsClient();
    const npcOutputDir = path.join(__dirname, '../assets/npc_images');
    
    // PNJ des ordres mystiques manquants
    const missingNPCs = [
        {
            name: 'Baelthuron_Seigneur_Demoniaque',
            prompt: 'demonic lord cultist, dark crimson robes with infernal symbols, horned skull mask, glowing red eyes, demonic energy aura swirling around, ritual chamber background with pentagram, terrifying cult leader, dark fantasy horror art, intimidating presence, masterpiece quality, dramatic lighting'
        },
        {
            name: 'Mechanicus_Prime_Grand_Ingenieur',
            prompt: 'steampunk techno-mage engineer, mechanical steam-powered armor with copper pipes, brass goggles with glowing lenses, metallic prosthetic arms, gears and cogs integrated into body, workshop background with machinery, technological horror aesthetic, masterpiece quality, industrial lighting'
        },
        {
            name: 'Ombre_Sans_Nom_Maitre_Lame',
            prompt: 'mysterious shadow assassin master, completely shrouded in black hooded cloak, only glowing purple eyes visible in darkness, multiple hidden blades gleaming, shadowy mist emanating from figure, dark alley background, mysterious and deadly presence, noir fantasy art'
        },
        {
            name: 'Hierophante_Aurelien_Grand_Pretre',
            prompt: 'holy priest guardian, pristine white robes with golden religious trim, ornate staff with sacred crystal, divine light aura surrounding figure, ancient sacred relics floating around, cathedral background with stained glass, benevolent yet powerful presence, divine fantasy art'
        },
        {
            name: 'Solarius_Grand_Croise_Radiant',
            prompt: 'radiant crusader paladin, shining golden plate armor with holy symbols, blazing divine sword, righteous fury expression, golden divine light emanating from armor, sacred battlefield background, holy warrior of justice, epic fantasy art, dramatic lighting'
        },
        {
            name: 'Oeil_Qui_Voit_Tout_Maitre_Espion',
            prompt: 'mysterious spymaster, face partially hidden by shadows, multiple glowing eyes emerging from darkness, information network visualization with glowing threads, surveillance equipment, dark intelligence office background, surveillance horror aesthetic, masterpiece quality'
        },
        {
            name: 'Anarchos_Heraut_du_Chaos',
            prompt: 'chaos herald anarchist, wild disheveled appearance, explosive devices strapped to body, chaotic multicolored energy aura, destructive madness in eyes, burning city background, anarchist revolutionary, chaos fantasy art, dynamic explosive lighting'
        },
        {
            name: 'Liora_Archidruide_Sylvaria',
            prompt: 'forest archdruid, flowing nature-woven robes made of leaves and vines, living wooden staff with growing branches, gentle wise eyes, harmony with forest animals around, magical forest glade background, nature magic aura, serene yet powerful presence, fantasy art'
        }
    ];
    
    console.log('🎨 Génération des images IA manquantes...\n');
    
    let successCount = 0;
    let totalCount = missingNPCs.length;
    
    for (const npc of missingNPCs) {
        try {
            const outputPath = path.join(npcOutputDir, `${npc.name}.png`);
            
            console.log(`🖼️ Génération IA de ${npc.name}...`);
            
            // Optimiser le prompt pour l'esthétique dark fantasy steampunk
            const optimizedPrompt = `${npc.prompt}, dark fantasy steampunk aesthetic, 3D rendered character, unreal engine quality, photorealistic, detailed steampunk fantasy, horror fantasy art, intimidating presence, masterpiece quality, 8k resolution, dramatic cinematic lighting`;
            
            await pollinationsClient.generateImage(
                optimizedPrompt,
                outputPath,
                { style: '3d', perspective: 'third_person', nudity: false }
            );
            
            console.log(`✅ ${npc.name} généré avec succès !\n`);
            successCount++;
            
            // Pause pour éviter rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Erreur génération ${npc.name}:`, error.message);
        }
    }
    
    console.log(`🎉 Génération terminée: ${successCount}/${totalCount} images créées`);
    console.log(`📁 Images sauvées dans: ${npcOutputDir}`);
}

// Exécuter la génération
generateMissingImages().catch(console.error);