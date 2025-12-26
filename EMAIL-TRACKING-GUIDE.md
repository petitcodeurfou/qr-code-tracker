# 📧 Guide: Envoi d'Emails avec Tracking

## 🎯 Fonctionnalités

Le système permet d'envoyer des emails avec tracking complet:

- ✅ **Tracking d'ouverture** - Savoir qui a ouvert, quand, avec quel appareil
- ✅ **Tracking de clics** - Savoir quels liens ont été cliqués
- ✅ **Statistiques détaillées** - Taux d'ouverture, taux de clics, géolocalisation
- ✅ **Footer automatique** - Information RGPD ajoutée automatiquement
- ✅ **Popup de responsabilité** - Consentement explicite avant l'envoi

## ⚖️ Responsabilité Légale (RGPD)

**IMPORTANT:** Vous êtes **entièrement responsable** du tracking des données:

- 🔴 Vous devez avoir le **consentement** des destinataires
- 🔴 Vous devez **respecter le RGPD** et les lois sur la protection des données
- 🔴 Vous devez permettre aux destinataires d'**accéder/supprimer** leurs données
- 🔴 Un **footer automatique** est ajouté à chaque email pour informer du tracking

## 🔧 Configuration Gmail (Obligatoire)

### Étape 1: Activer la validation en deux étapes

1. Allez sur https://myaccount.google.com/security
2. Activez "Validation en deux étapes" si ce n'est pas déjà fait

### Étape 2: Créer un mot de passe d'application

1. Allez sur https://myaccount.google.com/apppasswords
2. Sélectionnez "Mail" comme application
3. Sélectionnez "Autre" comme appareil
4. Entrez "QR Tracker" comme nom
5. Cliquez sur "Générer"
6. **Copiez le mot de passe** (16 caractères sans espaces)

### Étape 3: Utiliser le mot de passe

Dans l'interface d'envoi d'email:
- **Email (expéditeur):** votre.email@gmail.com
- **Mot de passe d'application:** le mot de passe à 16 caractères généré

⚠️ **Important:** N'utilisez **JAMAIS** votre mot de passe Gmail normal!

## 📊 Comment ça fonctionne

### Tracking d'ouverture (Pixel invisible)

Un pixel transparent (1x1) est ajouté à chaque email:
```html
<img src="https://votre-site.com/api/email/open/TRACKING_ID" width="1" height="1">
```

Quand l'email est ouvert, le pixel est chargé → nous enregistrons:
- Date et heure d'ouverture
- Appareil (Mobile/Desktop)
- Système d'exploitation
- Navigateur
- Localisation (pays, ville)
- Adresse IP

### Tracking de clics (Liens de redirection)

Tous les liens dans l'email sont remplacés:

**Avant:**
```html
<a href="https://example.com">Voir le site</a>
```

**Après:**
```html
<a href="https://votre-site.com/api/email/click/TRACKING_ID/1?url=https://example.com">Voir le site</a>
```

Quand on clique → nous enregistrons le clic → redirection vers le vrai lien.

### Footer automatique RGPD

Un footer est ajouté à chaque email pour informer les destinataires:

```
ℹ️ Informations sur le tracking
Cet email utilise des technologies de tracking pour mesurer
les ouvertures et les clics sur les liens. Ces données sont
collectées et traitées par l'expéditeur de cet email, qui est
seul responsable de leur utilisation.

Les informations suivantes peuvent être collectées: date/heure
d'ouverture, appareil utilisé, localisation approximative, et
clics sur les liens.

Conformément au RGPD, vous pouvez demander l'accès, la
modification ou la suppression de vos données en contactant
directement l'expéditeur.
```

## 🚀 Utilisation

### 1. Créer une campagne

1. Cliquez sur "📧 Emails" dans la navigation
2. Remplissez le formulaire:
   - **Nom de la campagne:** Ex: "Newsletter Janvier 2025"
   - **Sujet:** Ex: "Nos nouveautés ce mois-ci!"
   - **Votre email:** votre.email@gmail.com
   - **Nom de l'expéditeur:** Votre Nom ou Entreprise
   - **Mot de passe d'application:** Le mot de passe à 16 caractères
   - **Destinataires:** Un email par ligne
   - **Contenu HTML:** Le contenu de votre email

### 2. Confirmer et envoyer

1. Cliquez sur "📤 Envoyer la campagne"
2. **Lisez attentivement** le popup de responsabilité
3. **Cochez la case** pour accepter la responsabilité
4. Cliquez sur "✅ Confirmer et envoyer"

### 3. Voir les statistiques

Les statistiques seront disponibles bientôt dans une section dédiée.

## 📋 Exemple de contenu HTML

```html
<h1>Bonjour !</h1>

<p>Voici notre newsletter du mois de janvier 2025.</p>

<h2>Nos nouveautés</h2>
<ul>
  <li>Nouvelle fonctionnalité A</li>
  <li>Nouvelle fonctionnalité B</li>
</ul>

<a href="https://example.com/promo">Voir nos promotions</a>

<p>Cordialement,<br>Votre équipe</p>
```

## ⚠️ Limitations

### Tracking d'ouverture

- ❌ Certains clients email bloquent les images (Gmail mobile par défaut)
- ❌ Mode "Protéger ma vie privée" d'Apple Mail fausse les stats
- ➡️ Le taux d'ouverture peut être sous-estimé de ~20-30%

### Autres limitations

- Gmail limite à **500 emails par jour** avec un compte gratuit
- Les emails peuvent finir dans les spams si mal configurés
- Respectez les lois anti-spam (CAN-SPAM, RGPD, etc.)

## 🔒 Sécurité et Bonnes Pratiques

✅ **À FAIRE:**
- Avoir le consentement explicite des destinataires
- Respecter le RGPD
- Inclure un lien de désinscription
- Être transparent sur le tracking
- Protéger le mot de passe d'application

❌ **NE PAS FAIRE:**
- Envoyer du spam
- Tracker sans consentement
- Partager le mot de passe d'application
- Utiliser pour du phishing ou activités illégales

## 🆘 Dépannage

### "Erreur d'authentification Gmail"
- Vérifiez que vous utilisez un **mot de passe d'application** (pas votre mot de passe Gmail)
- Vérifiez que la validation en deux étapes est activée
- Régénérez un nouveau mot de passe d'application

### "Les emails arrivent dans les spams"
- Vérifiez votre réputation d'expéditeur
- Ajoutez un lien de désinscription
- Ne spammez pas
- Utilisez un domaine personnalisé (au lieu de Gmail)

### "Le tracking d'ouverture ne fonctionne pas"
- C'est normal, certains clients email bloquent les images
- Apple Mail en mode "Protéger ma vie privée" fausse les stats
- Le taux d'ouverture réel est généralement plus élevé que mesuré

## 📞 Support

Pour toute question, consultez la documentation ou ouvrez une issue sur GitHub.

---

**Rappel:** Vous êtes entièrement responsable de l'utilisation de cette fonctionnalité. Utilisez-la de manière éthique et légale.
