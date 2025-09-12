
# 🔥 OGUN MONTGOMERY - GUIDE FRICTION ULTIMATE

## Description
Ogun Montgomery, personnage de Fire Force, est maintenant le guide officiel de Friction Ultimate. Il aide les joueurs avec des réponses énergiques et envoie des stickers WhatsApp à chaque interaction.

## Fonctionnalités

### 🎯 Déclenchement automatique
- Détecte les questions (mots-clés : comment, pourquoi, aide, guide, ?, etc.)
- Répond automatiquement avec sa personnalité Fire Force
- Envoie un sticker aléatoire d'Ogun à chaque réponse

### ⚔️ Commandes dédiées
- `/guide` - Menu d'aide complet
- `/aide` - Menu d'aide complet  
- `/help` - Menu d'aide complet
- `/ogun` - Menu d'aide complet

### 🤖 IA Intégrée
- Utilise Groq pour générer des réponses personnalisées
- Fallback sur réponses prédéfinies si IA indisponible
- Reste toujours dans le personnage d'Ogun

### 📱 Stickers WhatsApp
- Collection de 5 images d'Ogun Montgomery
- Envoi automatique d'un sticker à chaque réponse
- Images sourced du web (Pinterest/fan art)

## Utilisation

```javascript
// Le guide se déclenche automatiquement pour les questions
"Comment créer un personnage ?" → Réponse d'Ogun + sticker

// Ou via commandes directes
/guide → Menu complet + sticker
```

## Configuration
Modifiable dans `/characters/OgunGuide.js` :
- Ajouter des stickers dans `this.stickers[]`
- Modifier les réponses dans `this.responses[]`
- Ajuster la personnalité dans les prompts Groq
