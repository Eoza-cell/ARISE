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
        powerLevel: 'G',
        frictionLevel: 'G',
        currentLocation: getStartingLocation(kingdom),
        position: { x: 0, y: 0, z: 0 },
        equipment: {},
        learnedTechniques: [],
        coins: 100,
        inventory: []
    };
}

module.exports = {
    KINGDOMS_DATA,
    ORDERS_DATA,
    STARTING_LOCATIONS,
    initializeGameData,
    getStartingLocation,
    getDefaultCharacterData
};
// Données de jeu pour Friction Ultimate

const KINGDOMS_DATA = [
    {
        id: 'AEGYRIA',
        name: 'Aegyria',
        description: 'Royaume des chevaliers honorables',
        geography: 'Plaines fertiles et collines verdoyantes',
        culture: 'Honneur, chevalerie et justice',
        specialties: ['Combat à l\'épée', 'Magie de lumière', 'Artisanat d\'armures'],
        particularities: 'Code d\'honneur strict et traditions chevaleresques'
    },
    {
        id: 'SOMBRENUIT',
        name: 'Sombrenuit',
        description: 'Royaume des maîtres des ombres',
        geography: 'Forêts sombres et marécages mystérieux',
        culture: 'Mystère, magie noire et secrets',
        specialties: ['Magie des ombres', 'Assassinat', 'Alchimie noire'],
        particularities: 'Maîtres de la discrétion et des arts occultes'
    },
    {
        id: 'KHELOS',
        name: 'Khelos',
        description: 'Royaume des nomades du désert',
        geography: 'Vastes déserts et oasis cachées',
        culture: 'Nomadisme, commerce et survie',
        specialties: ['Combat au cimeterre', 'Magie du sable', 'Commerce'],
        particularities: 'Excellents navigateurs et marchands'
    },
    {
        id: 'ABRANTIS',
        name: 'Abrantis',
        description: 'Royaume des marins intrépides',
        geography: 'Côtes rocheuses et îles dispersées',
        culture: 'Navigation, exploration et liberté',
        specialties: ['Combat naval', 'Magie de l\'eau', 'Cartographie'],
        particularities: 'Maîtres des océans et explorateurs'
    },
    {
        id: 'VARHA',
        name: 'Varha',
        description: 'Royaume des chasseurs montagnards',
        geography: 'Montagnes enneigées et vallées glaciales',
        culture: 'Chasse, survie et harmonie avec la nature',
        specialties: ['Tir à l\'arc', 'Dressage d\'animaux', 'Herboristerie'],
        particularities: 'Excellents traqueurs et survivants'
    },
    {
        id: 'SYLVARIA',
        name: 'Sylvaria',
        description: 'Royaume des gardiens de la forêt',
        geography: 'Forêts ancestrales et arbres géants',
        culture: 'Communion avec la nature et protection de l\'environnement',
        specialties: ['Magie naturelle', 'Combat à distance', 'Guérison'],
        particularities: 'Gardiens de l\'équilibre naturel'
    },
    {
        id: 'ECLYPSIA',
        name: 'Eclypsia',
        description: 'Royaume des seigneurs des éclipses',
        geography: 'Terres crépusculaires et phénomènes astronomiques',
        culture: 'Astrologie, prophéties et magie cosmique',
        specialties: ['Magie stellaire', 'Divination', 'Manipulation temporelle'],
        particularities: 'Maîtres du temps et de l\'espace'
    },
    {
        id: 'TERRE_DESOLE',
        name: 'Terre Désolée',
        description: 'Royaume des survivants post-apocalyptiques',
        geography: 'Terres ravagées et ruines industrielles',
        culture: 'Survie, récupération et reconstruction',
        specialties: ['Ingénierie', 'Armes à feu', 'Technologie'],
        particularities: 'Experts en technologie et survie extrême'
    },
    {
        id: 'DRAK_TARR',
        name: 'Drak\'Tarr',
        description: 'Royaume des forgeurs draconiques',
        geography: 'Volcans actifs et cavernes de lave',
        culture: 'Forge, artisanat et respect des dragons',
        specialties: ['Forge draconique', 'Magie du feu', 'Métallurgie'],
        particularities: 'Créateurs des meilleures armes et armures'
    },
    {
        id: 'URVALA',
        name: 'Urvala',
        description: 'Royaume des alchimistes nécromants',
        geography: 'Cimetières anciens et laboratoires souterrains',
        culture: 'Alchimie, nécromancie et expérimentation',
        specialties: ['Nécromancie', 'Alchimie', 'Mutation'],
        particularities: 'Maîtres de la vie et de la mort'
    },
    {
        id: 'OMBREFIEL',
        name: 'Ombrefiel',
        description: 'Royaume des mercenaires exilés',
        geography: 'Terres neutres et villes fortifiées',
        culture: 'Mercenariat, neutralité et profit',
        specialties: ['Combat mercenaire', 'Stratégie', 'Diplomatie'],
        particularities: 'Neutres dans les conflits, loyaux au plus offrant'
    },
    {
        id: 'KHALDAR',
        name: 'Khaldar',
        description: 'Royaume des pirates des jungles',
        geography: 'Jungles tropicales et rivières serpentines',
        culture: 'Piraterie, liberté et aventure',
        specialties: ['Piraterie fluviale', 'Poisons', 'Acrobaties'],
        particularities: 'Maîtres des voies fluviales et de la guérilla'
    }
];

const ORDERS_DATA = [
    {
        id: 'ORDER_LIGHT',
        name: 'Ordre de la Lumière',
        description: 'Gardiens de la justice et protecteurs des innocents',
        hierarchy: [
            { rank: 'Novice', title: 'Aspirant' },
            { rank: 'Initié', title: 'Gardien' },
            { rank: 'Expert', title: 'Paladin' },
            { rank: 'Maître', title: 'Grand Paladin' }
        ],
        specialties: ['Magie de lumière', 'Guérison', 'Protection'],
        location: 'Sanctuaire de la Lumière Éternelle',
        kingdom: null
    },
    {
        id: 'ORDER_SHADOW',
        name: 'Ordre de l\'Ombre',
        description: 'Assassins et espions maîtrisant les arts sombres',
        hierarchy: [
            { rank: 'Novice', title: 'Apprenti Ombre' },
            { rank: 'Initié', title: 'Lame Silencieuse' },
            { rank: 'Expert', title: 'Maître Assassin' },
            { rank: 'Maître', title: 'Seigneur des Ombres' }
        ],
        specialties: ['Assassinat', 'Discrétion', 'Magie des ombres'],
        location: 'Forteresse des Ombres Éternelles',
        kingdom: null
    },
    {
        id: 'ORDER_FIRE',
        name: 'Ordre du Feu',
        description: 'Guerriers destructeurs maîtrisant les flammes',
        hierarchy: [
            { rank: 'Novice', title: 'Étincelle' },
            { rank: 'Initié', title: 'Brasier' },
            { rank: 'Expert', title: 'Inferno' },
            { rank: 'Maître', title: 'Seigneur des Flammes' }
        ],
        specialties: ['Magie du feu', 'Destruction', 'Combat destructeur'],
        location: 'Citadelle des Flammes Éternelles',
        kingdom: null
    },
    {
        id: 'ORDER_EARTH',
        name: 'Ordre de la Terre',
        description: 'Défenseurs inébranlables et gardiens de la stabilité',
        hierarchy: [
            { rank: 'Novice', title: 'Roc' },
            { rank: 'Initié', title: 'Montagne' },
            { rank: 'Expert', title: 'Titan' },
            { rank: 'Maître', title: 'Seigneur de la Terre' }
        ],
        specialties: ['Magie de terre', 'Défense', 'Endurance'],
        location: 'Sanctuaire de la Terre Mère',
        kingdom: null
    },
    {
        id: 'ORDER_WIND',
        name: 'Ordre du Vent',
        description: 'Guerriers rapides maîtrisant la vitesse et l\'agilité',
        hierarchy: [
            { rank: 'Novice', title: 'Brise' },
            { rank: 'Initié', title: 'Bourrasque' },
            { rank: 'Expert', title: 'Tempête' },
            { rank: 'Maître', title: 'Seigneur des Vents' }
        ],
        specialties: ['Vitesse', 'Agilité', 'Magie du vent'],
        location: 'Tour des Vents Éternels',
        kingdom: null
    },
    {
        id: 'ORDER_ICE',
        name: 'Ordre de la Glace',
        description: 'Maîtres du froid et de la conservation',
        hierarchy: [
            { rank: 'Novice', title: 'Cristal' },
            { rank: 'Initié', title: 'Glacier' },
            { rank: 'Expert', title: 'Blizzard' },
            { rank: 'Maître', title: 'Seigneur de Glace' }
        ],
        specialties: ['Magie de glace', 'Contrôle', 'Ralentissement'],
        location: 'Forteresse de Glace Éternelle',
        kingdom: null
    },
    {
        id: 'ORDER_CHAOS',
        name: 'Ordre du Chaos',
        description: 'Agents du changement et maîtres de l\'imprévisible',
        hierarchy: [
            { rank: 'Novice', title: 'Anarchiste' },
            { rank: 'Initié', title: 'Perturbateur' },
            { rank: 'Expert', title: 'Maître du Chaos' },
            { rank: 'Maître', title: 'Seigneur du Chaos' }
        ],
        specialties: ['Magie chaotique', 'Imprévisibilité', 'Mutation'],
        location: 'Sanctuaire du Chaos Primordial',
        kingdom: null
    }
];

async function initializeGameData(dbManager) {
    try {
        console.log('🎮 Initialisation des données de jeu...');

        // Vérifier si les données existent déjà
        const existingKingdoms = await dbManager.getAllKingdoms();
        if (existingKingdoms.length === 0) {
            // Insérer les royaumes
            for (const kingdom of KINGDOMS_DATA) {
                await dbManager.insertKingdom(kingdom);
            }
            console.log('✅ Royaumes initialisés');
        }

        const existingOrders = await dbManager.getAllOrders();
        if (existingOrders.length === 0) {
            // Insérer les ordres
            for (const order of ORDERS_DATA) {
                await dbManager.insertOrder(order);
            }
            console.log('✅ Ordres initialisés');
        }

        console.log('✅ Données de jeu initialisées');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des données:', error);
        throw error;
    }
}

module.exports = {
    initializeGameData,
    KINGDOMS_DATA,
    ORDERS_DATA
};
