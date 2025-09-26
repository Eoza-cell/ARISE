// Données de jeu pour FRICTION ULTIMATE
// Royaumes, Ordres, Techniques, Équipements

const KINGDOMS_DATA = [
    {
        id: 'AEGYRIA',
        name: 'Aegyria',
        description: 'Royaume fondé sur l\'honneur et la chevalerie, connu pour ses écoles de paladins et de croisés.',
        geography: 'Grandes plaines fertiles bordées par des montagnes de fer, climat tempéré avec des saisons contrastées.',
        culture: 'Royaume fondé sur l\'honneur et la chevalerie, connu pour ses écoles de paladins et de croisés.',
        specialties: ['Armures lourdes gravées de runes', 'épées à deux mains', 'prières de protection'],
        particularities: 'Les forges royales produisent des armes légendaires, mais leur production est contrôlée par un conseil strict.'
    },
    {
        id: 'SOMBRENUIT',
        name: 'Sombrenuit',
        description: 'Peuple mystérieux, lié à la lune et aux esprits de la forêt.',
        geography: 'Forêts denses, brumeuses et marécageuses, presque toujours plongées dans une semi-obscurité.',
        culture: 'Peuple mystérieux, lié à la lune et aux esprits de la forêt.',
        specialties: ['Maîtres des poisons', 'dagues courbes', 'arbalètes silencieuses'],
        particularities: 'Les habitants de Sombrenuit sont réputés pour leurs pactes occultes et leur capacité à se fondre dans l\'ombre.'
    },
    {
        id: 'KHELOS',
        name: 'Khelos',
        description: 'Nomades marchands et pillards, façonnant des alliances temporaires.',
        geography: 'Déserts brûlants ponctués d\'oasis et de ruines anciennes.',
        culture: 'Nomades marchands et pillards, façonnant des alliances temporaires.',
        specialties: ['Sabres courbes', 'arcs rapides', 'caravaniers endurcis'],
        particularities: 'Convoitise pour les artefacts anciens, souvent trouvés dans les sables mouvants.'
    },
    {
        id: 'ABRANTIS',
        name: 'Abrantis',
        description: 'Peuple maritime, commerçants et navigateurs hors pair.',
        geography: 'Cités portuaires fortifiées bordant une mer agitée, falaises abruptes et îles sauvages.',
        culture: 'Peuple maritime, commerçants et navigateurs hors pair.',
        specialties: ['Harpons', 'épées courtes', 'bateaux rapides et légers'],
        particularities: 'Capitaines pirates et amiraux privés partagent le pouvoir avec les seigneurs marchands.'
    },
    {
        id: 'VARHA',
        name: 'Varha',
        description: 'Guerriers robustes, chasseurs de bêtes légendaires.',
        geography: 'Chaînes montagneuses enneigées, forêts de sapins, villages isolés.',
        culture: 'Guerriers robustes, chasseurs de bêtes légendaires.',
        specialties: ['Haches lourdes', 'boucliers renforcés', 'peaux de bêtes pour l\'armure'],
        particularities: 'Les Varhais respectent les anciens dieux et les esprits des montagnes.'
    },
    {
        id: 'SYLVARIA',
        name: 'Sylvaria',
        description: 'Druides et archers vivant en harmonie avec la nature.',
        geography: 'Vastes forêts magiques baignées de lumière, rivières cristallines.',
        culture: 'Druides et archers vivant en harmonie avec la nature.',
        specialties: ['Arcs longs', 'flèches enchantées', 'potions naturelles'],
        particularities: 'Les Sylvariens vivent souvent en communautés fermées et protègent férocement leurs forêts.'
    },
    {
        id: 'ECLYPSIA',
        name: 'Eclypsia',
        description: 'Mages et cultistes qui manipulent la lumière et l\'obscurité.',
        geography: 'Terres sombres sous un ciel souvent voilé d\'éclipses lunaires.',
        culture: 'Mages et cultistes qui manipulent la lumière et l\'obscurité.',
        specialties: ['Magie de l\'ombre', 'orbes ténébreuses', 'masques rituels'],
        particularities: 'Les portails entre les mondes sont fréquents dans ce royaume, attirant les voyageurs… et les démons.'
    },
    {
        id: 'TERRE_DESOLE',
        name: 'Terre Désolée',
        description: 'Survivants endurcis, guerriers des sables, tribus hostiles.',
        geography: 'Vastes étendues désertiques et rocheuses, parfois radioactives ou corrompues.',
        culture: 'Survivants endurcis, guerriers des sables, tribus hostiles.',
        specialties: ['Fusils artisanaux', 'armures de bric et de broc', 'attaques éclair'],
        particularities: 'Les raids et les pillages sont monnaie courante, la loi du plus fort règne en maître.'
    },
    {
        id: 'DRAK_TARR',
        name: 'Drak\'Tarr',
        description: 'Forgerons démoniaques, cultistes de dragons, alchimistes pyromanes.',
        geography: 'Pics volcaniques, cavernes souterraines et lacs de lave.',
        culture: 'Forgerons démoniaques, cultistes de dragons, alchimistes pyromanes.',
        specialties: ['Lames noires', 'canons à feu', 'grenades alchimiques'],
        particularities: 'Les Drak\'tarriens vouent un culte au feu et aux créatures draconiques.'
    },
    {
        id: 'URVALA',
        name: 'Urvala',
        description: 'Alchimistes et nécromanciens, expérimentant sur le corps et l\'âme.',
        geography: 'Collines brumeuses, marais fétides, ruines englouties.',
        culture: 'Alchimistes et nécromanciens, expérimentant sur le corps et l\'âme.',
        specialties: ['Sceaux', 'golems', 'cadavres animés'],
        particularities: 'Les Urvaliens vendent leurs services aux plus offerts, mais à quel prix ?'
    },
    {
        id: 'OMBREFIEL',
        name: 'Ombrefiel',
        description: 'Mercenaires, soldats de fortune et exilés.',
        geography: 'Plaines balayées par le vent, grandes citadelles fortifiées et villages-fantômes.',
        culture: 'Mercenaires, soldats de fortune et exilés.',
        specialties: ['Épées bâtardes', 'arbalètes lourdes', 'tactiques de siège'],
        particularities: 'Ce royaume est un refuge pour les parias et les traîtres.'
    },
    {
        id: 'KHALDAR',
        name: 'Khaldar',
        description: 'Aventuriers, chasseurs de trésors et pirates.',
        geography: 'Archipels tropicaux et jungles étouffantes infestées de créatures mortelles.',
        culture: 'Aventuriers, chasseurs de trésors et pirates.',
        specialties: ['Coutelas', 'sarbacanes empoisonnées', 'pièges artisanaux'],
        particularities: 'Les jungles de Khaldar sont réputées pour leurs plantes médicinales… et leurs poisons mortels.'
    }
];

const ORDERS_DATA = [
    {
        id: 'ORDRE_SEIGNEUR_DEMONIAQUE',
        name: 'L\'Ordre du Seigneur Démoniaque',
        description: 'Une secte occulte exploitant la magie noire pour asservir les âmes.',
        hierarchy: [
            { rank: 1, title: 'Seigneur Démoniaque' },
            { rank: 2, title: 'Commandant Démoniaque' },
            { rank: 3, title: 'Adepte' }
        ],
        specialties: ['Invocation démoniaque', 'corruption des corps', 'rituels interdits'],
        location: 'Sanctuaire de l\'Abîme - Un ancien temple profané au sud-est des Terres Maudites',
        kingdom: null
    },
    {
        id: 'FORGE_PROGRES',
        name: 'La Forge du Progrès',
        description: 'Des ingénieurs et forgerons mêlant technologie et alchimie.',
        hierarchy: [
            { rank: 1, title: 'Grand Ingénieur' },
            { rank: 2, title: 'Maître Artisan' },
            { rank: 3, title: 'Apprenti' }
        ],
        specialties: ['Exosquelettes', 'pièges mécaniques', 'explosifs à vapeur'],
        location: 'Citadelle Fumante - Une immense forteresse-usine à l\'ouest de la Cité Fracturée',
        kingdom: null
    },
    {
        id: 'LAME_POURPRE',
        name: 'La Lame Pourpre',
        description: 'Des assassins implacables, experts dans le meurtre silencieux.',
        hierarchy: [
            { rank: 1, title: 'Maître-Lame' },
            { rank: 2, title: 'Ombre Silencieuse' },
            { rank: 3, title: 'Lame Novice' }
        ],
        specialties: ['Dagues', 'poisons', 'techniques de disparition'],
        location: 'Forteresse des Ombres - Un bastion caché au sommet d\'une falaise au nord de la Cité Fracturée',
        kingdom: null
    },
    {
        id: 'RELIQUAIRE',
        name: 'Le Reliquaire',
        description: 'Un ordre mystique protégeant les artefacts anciens.',
        hierarchy: [
            { rank: 1, title: 'Grand Prêtre' },
            { rank: 2, title: 'Gardien des Reliques' },
            { rank: 3, title: 'Initié' }
        ],
        specialties: ['Parchemins anciens', 'boucliers magiques', 'purification'],
        location: 'Basilique de la Mémoire - Une cathédrale en ruine au centre de la Vieille Ville',
        kingdom: null
    },
    {
        id: 'LAMES_JUGEMENT',
        name: 'Les Lames du Jugement',
        description: 'Un ordre chevaleresque pourfendant toute menace contre la loi divine.',
        hierarchy: [
            { rank: 1, title: 'Grand Croisé' },
            { rank: 2, title: 'Chevalier Juge' },
            { rank: 3, title: 'Écuyer' }
        ],
        specialties: ['Lames sacrées', 'armures lourdes', 'techniques de justice expéditive'],
        location: 'Forteresse de la Justice - Une forteresse imposante surplombant la Plaine des Condamnés',
        kingdom: null
    },
    {
        id: 'SYNODE_OMBRES',
        name: 'Le Synode des Ombres',
        description: 'Des espions maniant la rumeur et le chantage.',
        hierarchy: [
            { rank: 1, title: 'Maître-espion' },
            { rank: 2, title: 'Informateur' },
            { rank: 3, title: 'Messager' }
        ],
        specialties: ['Réseaux secrets', 'codes cryptés', 'corruption'],
        location: 'Les Couloirs Souterrains - Un réseau labyrinthique sous la Cité Fracturée',
        kingdom: null
    },
    {
        id: 'ENFANTS_CHAOS',
        name: 'Les Enfants du Chaos',
        description: 'Des anarchistes vouant un culte à la destruction pure.',
        hierarchy: [
            { rank: 1, title: 'Héraut du Chaos' },
            { rank: 2, title: 'Fanatique' },
            { rank: 3, title: 'Déserteur' }
        ],
        specialties: ['Explosifs', 'incendies', 'invocations chaotiques'],
        location: 'La Forge des Ruines - Un ancien quartier industriel ravagé par les flammes',
        kingdom: null
    }
];

const STARTING_LOCATIONS = {
    'AEGYRIA': 'Grande Plaine d\'Honneur - Village de Valorhall',
    'SOMBRENUIT': 'Forêt des Murmures - Clairière de Lunelame',
    'KHELOS': 'Oasis du Mirage - Campement de Sablesang',
    'ABRANTIS': 'Port de Marée-Haute - Taverne du Kraken',
    'VARHA': 'Pic des Loups - Village de Glacierre',
    'SYLVARIA': 'Bosquet Éternel - Cercle des Anciens',
    'ECLYPSIA': 'Terre d\'Ombre - Temple de l\'Éclipse',
    'TERRE_DESOLE': 'Wasteland Central - Campement des Survivants',
    'DRAK_TARR': 'Cratère de Feu - Forge Volcanique',
    'URVALA': 'Marais Maudit - Laboratoire des Morts',
    'OMBREFIEL': 'Plaine Grise - Citadelle des Exilés',
    'KHALDAR': 'Jungle Tropicale - Village sur Pilotis'
};

async function initializeGameData(dbManager) {
    try {
        console.log('🏰 Initialisation des données de jeu...');
        
        // Vérifier si les données existent déjà
        const existingKingdoms = await dbManager.getAllKingdoms();
        
        if (existingKingdoms.length === 0) {
            console.log('📊 Insertion des royaumes...');
            for (const kingdom of KINGDOMS_DATA) {
                await dbManager.insertKingdom(kingdom);
            }
            console.log('✅ 12 royaumes insérés');
        }

        const existingOrders = await dbManager.getAllOrders();
        
        if (existingOrders.length === 0) {
            console.log('⚔️ Insertion des ordres...');
            for (const order of ORDERS_DATA) {
                await dbManager.insertOrder(order);
            }
            console.log('✅ 7 ordres insérés');
        }

        console.log('✅ Données de jeu initialisées');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des données:', error);
        throw error;
    }
}

function getStartingLocation(kingdom) {
    return STARTING_LOCATIONS[kingdom] || 'Lieu Inconnu';
}

function getDefaultCharacterData(playerData, kingdom, gender) {
    return {
        playerId: playerData.id,
        name: `${gender === 'male' ? 'Guerrier' : 'Guerrière'}_${playerData.whatsappNumber.slice(-4)}`,
        gender: gender,
        kingdom: kingdom,
        order: null,
        level: 1,
        experience: 0,
        currentLife: 100,
        maxLife: 100,
        currentEnergy: 100,
        maxEnergy: 100,
        maxAura: 100,
        currentAura: 100,
        maxMagic: 100,
        currentMagic: 100,
        powerLevel: 'G',
        frictionLevel: 'G',
        currentLocation: getStartingLocation(kingdom),
        position: { x: 0, y: 0, z: 0 },
        equipment: {},
        learnedTechniques: [],
        coins: 100,
        inventory: [],
        bossKills: [] // Pour suivre les boss tués pour accès au rang Monarque
    };
}

// Nouveaux rangs avec MONARQUE
const POWER_LEVELS = ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S', 'S+', 'SS', 'SSS', 'MONARQUE'];

// Boss de rang S+ pour débloquer MONARQUE
const S_PLUS_BOSSES = [
    {
        name: 'Dragon Empereur Cosmic',
        rank: 'S+',
        location: 'Sanctuaire Dimensionnel',
        reward: 'Accès au rang MONARQUE'
    },
    {
        name: 'Liche Suprême Éternelle',
        rank: 'S+',
        location: 'Nécropole Ultime',
        reward: 'Accès au rang MONARQUE'
    },
    {
        name: 'Démon Roi des Abysses',
        rank: 'S+',
        location: 'Portal Infernal',
        reward: 'Accès au rang MONARQUE'
    }
];

module.exports = {
    KINGDOMS_DATA,
    ORDERS_DATA,
    STARTING_LOCATIONS,
    initializeGameData,
    getStartingLocation,
    getDefaultCharacterData
};
