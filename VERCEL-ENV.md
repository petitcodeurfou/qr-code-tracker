# Variables d'environnement pour Vercel

## À configurer dans Vercel Dashboard

Allez dans : **Vercel Dashboard > Votre Projet > Settings > Environment Variables**

### Variables à ajouter/mettre à jour :

```
DATABASE_URL=postgresql://neondb_owner:npg_kW7ahfUt8TXP@ep-rough-block-ah21gahx-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

FRONTEND_URL=https://qr-code-tracker-dusky.vercel.app

BASE_URL=https://qr-code-tracker-dusky.vercel.app

REACT_APP_API_URL=https://qr-code-tracker-dusky.vercel.app
```

## Après avoir ajouté les variables :

1. Allez dans **Deployments**
2. Trouvez le dernier déploiement
3. Cliquez sur les **3 points (...)** > **Redeploy**
4. Cochez **"Use existing Build Cache"** pour aller plus vite
5. Cliquez sur **Redeploy**

## URLs de l'application :

- **Frontend** : https://qr-code-tracker-dusky.vercel.app
- **API Create** : https://qr-code-tracker-dusky.vercel.app/api/qr/create
- **API List** : https://qr-code-tracker-dusky.vercel.app/api/qr/list
- **Tracking** : https://qr-code-tracker-dusky.vercel.app/track/:shortId

## Vérification :

Une fois redéployé, testez :
1. Créez un code QR
2. Vérifiez que l'URL de tracking utilise bien `qr-code-tracker-dusky.vercel.app`
3. Scannez le code QR avec votre téléphone
4. Vérifiez les statistiques
