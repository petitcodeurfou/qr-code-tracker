# Guide de Déploiement sur Vercel

Ce guide explique comment déployer votre application de génération de codes QR sur Vercel.

## Prérequis

- Compte GitHub
- Compte Vercel (gratuit)
- Base de données PostgreSQL (déjà configurée sur Neon)

## Étape 1 : Pousser vers GitHub

Le code est déjà prêt à être poussé vers GitHub. Les commandes seront exécutées pour vous.

## Étape 2 : Déployer sur Vercel

### Option A : Déploiement via l'interface Vercel (Recommandé)

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur "New Project"
4. Importez votre repository GitHub
5. Configurez les variables d'environnement (voir ci-dessous)
6. Cliquez sur "Deploy"

### Option B : Déploiement via CLI

```bash
npm i -g vercel
vercel login
vercel
```

## Étape 3 : Configuration des Variables d'Environnement sur Vercel

Dans les paramètres de votre projet Vercel, ajoutez ces variables d'environnement :

### Variables Backend :
- `DATABASE_URL` : `postgresql://neondb_owner:npg_kW7ahfUt8TXP@ep-rough-block-ah21gahx-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- `FRONTEND_URL` : `https://votre-app.vercel.app` (sera fourni après le premier déploiement)
- `BASE_URL` : `https://votre-app.vercel.app`

### Variables Frontend :
- `REACT_APP_API_URL` : `https://votre-app.vercel.app`

## Étape 4 : Configuration du Build

Vercel détectera automatiquement :
- Le frontend React dans le dossier `frontend/`
- Le backend Node.js dans le dossier `backend/`

Configuration automatique :
```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build"
    },
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ]
}
```

## Étape 5 : Mise à jour après le déploiement

Après le premier déploiement, vous recevrez une URL (ex: `https://qr-tracker-abc123.vercel.app`).

Mettez à jour les variables d'environnement :
1. Remplacez `https://votre-app.vercel.app` par votre vraie URL
2. Dans Vercel Dashboard > Settings > Environment Variables
3. Redéployez le projet

## Structure des URLs en Production

- **Frontend** : `https://votre-app.vercel.app`
- **API** : `https://votre-app.vercel.app/api/*`
- **Tracking** : `https://votre-app.vercel.app/track/:shortId`

## Tester l'Application en Production

1. Accédez à votre URL Vercel
2. Créez un code QR
3. Scannez-le avec votre téléphone
4. Vérifiez les statistiques

## Problèmes Courants

### CORS Errors
- Assurez-vous que `FRONTEND_URL` est correctement configuré dans les variables d'environnement

### Base de données non accessible
- Vérifiez que `DATABASE_URL` est correct
- Assurez-vous que Neon autorise les connexions depuis n'importe quelle IP

### Routes ne fonctionnent pas
- Vérifiez le fichier `vercel.json` à la racine du projet

## Mises à jour

Pour mettre à jour l'application :
1. Faites vos modifications localement
2. Committez et poussez vers GitHub
3. Vercel redéploiera automatiquement

## Domaine Personnalisé (Optionnel)

Pour utiliser votre propre domaine :
1. Allez dans Vercel Dashboard > Settings > Domains
2. Ajoutez votre domaine
3. Mettez à jour les DNS selon les instructions
4. Mettez à jour les variables d'environnement avec le nouveau domaine

## Surveillance et Analytics

Vercel fournit :
- Analytics de performance
- Logs en temps réel
- Monitoring des erreurs

Accédez-y via le Dashboard Vercel.

## Support

Pour toute question :
- Documentation Vercel : https://vercel.com/docs
- Support Vercel : https://vercel.com/support
