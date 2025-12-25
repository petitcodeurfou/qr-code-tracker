# Générateur de Codes QR avec Tracking

Application complète permettant de générer des codes QR avec tracking avancé des scans (IP, localisation, user agent).

## Fonctionnalités

- **Génération de codes QR** : Créez des codes QR pour n'importe quelle URL
- **Tracking complet** : Chaque scan enregistre :
  - L'adresse IP du visiteur
  - La localisation approximative (pays, ville)
  - Le user agent (navigateur/appareil)
  - La date et l'heure du scan
- **Dashboard analytics** : Visualisez les statistiques de vos codes QR
- **Redirection automatique** : Après l'enregistrement, redirection vers l'URL cible

## Structure du Projet

```
qr code generator/
├── backend/           # Serveur Node.js + Express
│   ├── server.js      # Point d'entrée du serveur
│   ├── database.js    # Configuration PostgreSQL
│   ├── package.json
│   └── .env          # Variables d'environnement
├── frontend/         # Application React
│   ├── src/
│   │   ├── App.js    # Composant principal
│   │   ├── App.css   # Styles
│   │   └── index.js
│   └── package.json
└── README.md
```

## Technologies Utilisées

### Backend
- Node.js + Express
- PostgreSQL (hébergé sur Neon)
- Libraries :
  - `qrcode` : Génération de codes QR
  - `nanoid` : Génération d'IDs uniques
  - `geoip-lite` : Géolocalisation par IP
  - `pg` : Client PostgreSQL

### Frontend
- React 19
- Fetch API pour les requêtes
- CSS moderne avec gradients

## Installation

### Prérequis
- Node.js (v14 ou supérieur)
- npm ou yarn

### Étape 1 : Cloner le projet
Le projet est déjà créé dans le dossier actuel.

### Étape 2 : Configuration du Backend

```bash
cd backend
```

Les dépendances sont déjà installées. Le fichier `.env` contient déjà la configuration de la base de données Neon PostgreSQL.

### Étape 3 : Configuration du Frontend

```bash
cd ../frontend
npm install
```

## Démarrage

### 1. Démarrer le Backend

Ouvrez un terminal et exécutez :

```bash
cd backend
npm start
```

Le serveur démarre sur `http://localhost:3001`

Au démarrage, les tables PostgreSQL seront automatiquement créées si elles n'existent pas :
- `qr_codes` : Stocke les codes QR créés
- `scans` : Stocke tous les scans avec leurs données

### 2. Démarrer le Frontend

Ouvrez un second terminal et exécutez :

```bash
cd frontend
npm start
```

L'application React démarre sur `http://localhost:3000` et s'ouvre automatiquement dans votre navigateur.

## Utilisation

### Créer un Code QR

1. Accédez à `http://localhost:3000`
2. Entrez l'URL de destination (ex: `https://google.com`)
3. Cliquez sur "Générer le code QR"
4. Téléchargez le code QR ou copiez l'URL de tracking

### Utiliser le Code QR

L'URL de tracking générée ressemble à :
```
http://localhost:3001/track/abc12345
```

Quand quelqu'un scanne le code QR :
1. Il est redirigé vers cette URL de tracking
2. Le serveur enregistre les informations (IP, localisation, user agent)
3. L'utilisateur est immédiatement redirigé vers l'URL cible

### Voir les Statistiques

1. Cliquez sur "Mes Codes QR" dans la navigation
2. Cliquez sur "Voir stats" pour n'importe quel code QR
3. Consultez :
   - Le nombre total de scans
   - Les scans par pays
   - Les détails complets de chaque scan (date, IP, localisation, user agent)

## API Endpoints

### POST /api/qr/create
Crée un nouveau code QR.

**Body :**
```json
{
  "targetUrl": "https://example.com"
}
```

**Response :**
```json
{
  "success": true,
  "shortId": "abc12345",
  "trackingUrl": "http://localhost:3001/track/abc12345",
  "targetUrl": "https://example.com",
  "qrCodeImage": "data:image/png;base64,...",
  "qrCodeId": 1
}
```

### GET /track/:shortId
Enregistre un scan et redirige vers l'URL cible.

### GET /api/qr/:shortId/stats
Récupère les statistiques d'un code QR.

### GET /api/qr/list
Liste tous les codes QR créés avec leur nombre de scans.

## Base de Données

### Table `qr_codes`
- `id` : ID auto-incrémenté
- `short_id` : ID unique court (ex: "abc12345")
- `target_url` : URL de destination
- `created_at` : Date de création
- `creator_ip` : IP du créateur

### Table `scans`
- `id` : ID auto-incrémenté
- `qr_code_id` : Référence au code QR
- `ip_address` : IP du visiteur
- `user_agent` : Navigateur/appareil
- `country` : Pays
- `city` : Ville
- `latitude` : Latitude
- `longitude` : Longitude
- `scanned_at` : Date et heure du scan

## Configuration pour la Production

Pour déployer en production :

1. **Backend** :
   - Modifiez `BASE_URL` dans `.env` avec votre domaine
   - Déployez sur un service comme Heroku, Railway, ou Render
   - La base de données Neon est déjà configurée

2. **Frontend** :
   - Modifiez `API_URL` dans `src/App.js` avec l'URL de votre backend
   - Créez le build : `npm run build`
   - Déployez sur Vercel, Netlify, ou un autre service

## Sécurité et Confidentialité

Cette application collecte des données personnelles (adresses IP). Assurez-vous de :
- Informer les utilisateurs de la collecte de données
- Respecter le RGPD si vous opérez en Europe
- Sécuriser l'accès aux statistiques (ajouter une authentification)
- Ne pas partager les adresses IP publiquement

## Développement

### Mode Développement Backend
```bash
cd backend
npm run dev  # Utilise nodemon pour le rechargement automatique
```

### Scripts Disponibles

Backend :
- `npm start` : Démarre le serveur
- `npm run dev` : Démarre avec nodemon (rechargement auto)

Frontend :
- `npm start` : Démarre le serveur de développement
- `npm run build` : Crée le build de production
- `npm test` : Lance les tests

## Dépannage

### Erreur de connexion à la base de données
- Vérifiez que l'URL PostgreSQL dans `.env` est correcte
- Assurez-vous d'avoir une connexion internet (Neon est hébergé en ligne)

### CORS errors
- Vérifiez que le backend tourne sur le port 3001
- Vérifiez que le frontend tourne sur le port 3000
- La configuration CORS est déjà en place dans `server.js`

### Le QR code ne fonctionne pas
- Assurez-vous que `BASE_URL` dans `.env` est accessible depuis l'appareil qui scanne
- Pour tester avec un smartphone, utilisez ngrok ou exposez votre serveur local

## Améliorations Futures

- Authentification utilisateur
- Éditeur de codes QR (couleurs, logo)
- Export des statistiques en CSV/PDF
- Graphiques temporels des scans
- Gestion des campagnes marketing
- Support des codes QR dynamiques (changement d'URL sans régénération)

## Licence

Ce projet est libre d'utilisation.

## Support

Pour toute question ou problème, créez une issue dans le repository.
