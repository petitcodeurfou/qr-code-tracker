# Configuration GitHub et Déploiement

Votre application est prête à être poussée vers GitHub et déployée sur Vercel !

## Git est déjà configuré

✓ Repository Git initialisé
✓ Tous les fichiers sont committés
✓ Premier commit créé avec succès

## Étapes pour créer le dépôt GitHub

### Option 1 : Via l'interface GitHub (Plus simple)

1. **Allez sur GitHub** : https://github.com/new

2. **Créez un nouveau repository** :
   - Repository name: `qr-code-tracker` (ou le nom de votre choix)
   - Description: `Application de génération et tracking de codes QR avec analytics avancés`
   - Visibilité: Public ou Private
   - **NE COCHEZ PAS** "Initialize this repository with a README"
   - Cliquez sur "Create repository"

3. **Connectez votre dépôt local** :

   Copiez les commandes fournies par GitHub (section "…or push an existing repository from the command line") et exécutez-les :

   ```bash
   cd "C:\Users\maxim\projects\qr code generator"
   git remote add origin https://github.com/petitcodeurfou/qr-code-tracker.git
   git branch -M main
   git push -u origin main
   ```

### Option 2 : Via GitHub CLI (Si installé)

```bash
cd "C:\Users\maxim\projects\qr code generator"
gh repo create qr-code-tracker --public --source=. --description="Application de génération et tracking de codes QR" --push
```

## Après avoir poussé vers GitHub

Votre code sera disponible sur GitHub et vous pourrez :

### 1. Déployer sur Vercel

**Via l'interface Vercel (Recommandé)** :

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur "New Project"
3. Importez votre repository GitHub `qr-code-tracker`
4. Vercel détectera automatiquement la configuration
5. **Ajoutez les variables d'environnement** :

   **Environment Variables à configurer** :
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_kW7ahfUt8TXP@ep-rough-block-ah21gahx-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   FRONTEND_URL=https://votre-app.vercel.app
   BASE_URL=https://votre-app.vercel.app
   REACT_APP_API_URL=https://votre-app.vercel.app
   ```

   **Note** : Remplacez `https://votre-app.vercel.app` par l'URL que Vercel vous donnera après le premier déploiement, puis redéployez.

6. Cliquez sur "Deploy"

**Via Vercel CLI** :

```bash
npm i -g vercel
vercel login
cd "C:\Users\maxim\projects\qr code generator"
vercel
```

### 2. Configuration Post-Déploiement

Après le premier déploiement, Vercel vous donnera une URL (ex: `https://qr-code-tracker-abc123.vercel.app`).

**Mise à jour des variables d'environnement** :
1. Allez dans Vercel Dashboard > Votre Projet > Settings > Environment Variables
2. Mettez à jour :
   - `FRONTEND_URL` → Votre URL Vercel
   - `BASE_URL` → Votre URL Vercel
   - `REACT_APP_API_URL` → Votre URL Vercel
3. Redéployez : Settings > Deployments > ... > Redeploy

### 3. Tester l'Application en Production

Une fois déployée :
1. Accédez à votre URL Vercel
2. Créez un code QR de test
3. Scannez-le avec votre téléphone
4. Vérifiez que le tracking fonctionne
5. Consultez les statistiques

## Structure du Projet

```
qr-code-tracker/
├── backend/              # API Node.js + Express
│   ├── server.js         # Serveur principal
│   ├── database.js       # Configuration PostgreSQL
│   └── .env.example      # Template des variables
├── frontend/             # Application React
│   ├── src/
│   │   ├── App.js        # Composant principal
│   │   └── App.css       # Styles
│   └── public/
├── vercel.json           # Configuration Vercel
├── .gitignore            # Fichiers à ignorer
├── README.md             # Documentation
└── DEPLOY.md             # Guide de déploiement

```

## URLs en Production

Une fois déployé :
- **Frontend** : `https://votre-app.vercel.app`
- **API Create QR** : `https://votre-app.vercel.app/api/qr/create`
- **API List QR** : `https://votre-app.vercel.app/api/qr/list`
- **API Stats** : `https://votre-app.vercel.app/api/qr/:shortId/stats`
- **Tracking** : `https://votre-app.vercel.app/track/:shortId`

## Mises à jour futures

Pour mettre à jour l'application :

```bash
# Faites vos modifications
git add .
git commit -m "Description des changements"
git push
```

Vercel redéploiera automatiquement à chaque push sur la branche main !

## Domaine personnalisé (Optionnel)

1. Allez dans Vercel Dashboard > Settings > Domains
2. Ajoutez votre domaine (ex: qr-tracker.com)
3. Configurez les DNS selon les instructions
4. Mettez à jour les variables d'environnement avec le nouveau domaine

## Support

- **Vercel Docs** : https://vercel.com/docs
- **Neon Docs** : https://neon.tech/docs
- **GitHub Docs** : https://docs.github.com

## Félicitations !

Votre application est maintenant prête pour GitHub et Vercel. Suivez les étapes ci-dessus pour la mettre en ligne !
