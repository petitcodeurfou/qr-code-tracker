# Système de Détection VPN

Votre application intègre maintenant un système complet de détection VPN !

## Fonctionnalités

### 1. Détection Automatique VPN

Le système détecte automatiquement les VPN par :

- **Liste noire** : Base de données d'IP VPN connues
- **Fréquence d'utilisation** : IP qui scannent 100+ fois par jour
- **Hostname DNS** : Détection via reverse lookup
- **IP suspectes** : Tracking automatique

### 2. Tables de Base de Données

**`vpn_ips`** - Liste noire d'IP VPN
- ip_address : L'adresse IP
- provider : Fournisseur VPN (NordVPN, ExpressVPN, etc.)
- source : Source de détection (manual, auto, etc.)
- added_at : Date d'ajout
- last_seen : Dernière utilisation

**`suspicious_ips`** - IP suspectes trackées
- ip_address : L'adresse IP
- scan_count : Nombre de scans
- is_flagged_vpn : Marqué comme VPN
- detection_reason : Raison de détection

**`scans`** - Colonne ajoutée
- is_vpn : Boolean (vrai si VPN détecté)
- vpn_detection_method : Méthode de détection

### 3. Affichage dans le Dashboard

Dans les statistiques des QR codes :
- **Badge rouge "VPN"** pour les scans VPN
- **Badge vert "Non"** pour les scans normaux
- Lignes surlignées en jaune pour les VPN
- Info-bulle avec la méthode de détection

## Utilisation

### Importer des IP VPN

```bash
cd backend
npm run import-vpns
```

Cela charge les IP VPN depuis `backend/vpnLists.js`.

### Ajouter des IP VPN manuellement

Vous pouvez ajouter vos propres IP VPN dans `backend/vpnLists.js` :

```javascript
const individualVPNIPs = [
  { ip: '123.456.789.0', provider: 'NomDuVPN', source: 'manual' },
  // Ajoutez plus d'IP ici
];
```

Puis relancez `npm run import-vpns`.

### Via API (protégé par authentification)

```bash
# Ajouter une IP VPN
POST /api/admin/vpn-ips/add
Body: { "ip": "123.456.789.0", "provider": "NomVPN", "source": "manual" }

# Voir toutes les IP VPN
GET /api/admin/vpn-ips

# Voir les IP suspectes
GET /api/admin/suspicious-ips

# Statistiques VPN
GET /api/admin/vpn-stats

# Supprimer une IP VPN
DELETE /api/admin/vpn-ips/123.456.789.0
```

## Sources de Listes VPN Gratuites

Vous pouvez télécharger des listes d'IP VPN sur :

### 1. FireHOL IP Lists
- **URL** : https://github.com/firehol/blocklist-ipsets
- **Fichiers** : `firehol_proxies.netset`, `firehol_webserver.netset`
- Gratuit, mise à jour quotidienne

### 2. IPsum
- **URL** : https://github.com/stamparm/ipsum
- Listes d'IP malveillantes incluant VPN/Proxy

### 3. Tor Exit Nodes
- **URL** : https://check.torproject.org/torbulkexitlist
- Liste officielle des nœuds de sortie Tor

### 4. ProxyCheck.io (Gratuit limité)
- **URL** : https://proxycheck.io
- API : 1000 vérifications/jour gratuites

### 5. Listes communautaires
- **GitHub** : Recherchez "VPN IP list" ou "proxy IP list"
- Plusieurs repositories maintiennent des listes à jour

## Comment télécharger et importer

### Méthode 1 : Téléchargement manuel

```bash
# Télécharger une liste
wget https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_proxies.netset

# Ajouter les IP dans vpnLists.js
# Relancer l'import
npm run import-vpns
```

### Méthode 2 : Script automatique (à créer)

Créez `backend/downloadVPNLists.js` :

```javascript
const https = require('https');
const fs = require('fs');

const lists = [
  'https://check.torproject.org/torbulkexitlist',
  'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_proxies.netset'
];

// Téléchargez et parsez les listes
// Importez dans la base de données
```

## Détection par Fréquence

**Automatique** : Si une IP scanne 100+ fois en 24h, elle est :
1. Ajoutée à `suspicious_ips`
2. Marquée comme VPN
3. Ajoutée à la liste noire `vpn_ips`

Pour changer la limite :

```javascript
// Dans backend/vpnDetector.js
this.DAILY_SCAN_LIMIT = 100; // Changez cette valeur
```

## Statistiques VPN

Consultez les stats via l'API :

```bash
GET /api/admin/vpn-stats
```

Retourne :
- Nombre total d'IP VPN dans la liste noire
- Nombre d'IP suspectes
- Nombre total de scans VPN
- Scans VPN dans les dernières 24h

## Maintenance

### Mise à jour régulière

Les listes VPN changent constamment. Recommandations :

1. **Hebdomadaire** : Télécharger de nouvelles listes
2. **Mensuel** : Nettoyer les anciennes IP
3. **Quotidien** : Vérifier les IP suspectes

### Nettoyage automatique

Créez une tâche CRON pour nettoyer les vieilles IP :

```sql
-- Supprimer les IP non vues depuis 90 jours
DELETE FROM vpn_ips
WHERE last_seen < NOW() - INTERVAL '90 days';
```

## Notes Importantes

### Faux Positifs

Le système peut détecter comme VPN :
- Entreprises avec IP partagée
- Utilisateurs derrière proxy d'entreprise
- Réseaux universitaires

**Solution** : Whitelist manuelle d'IP légitimes

### Performance

- Recherche instantanée (index sur IP)
- Pas de ralentissement sur les scans
- DNS lookup asynchrone (pas bloquant)

### Vie Privée

- Les IP sont stockées (RGPD : informer les utilisateurs)
- Les utilisateurs devraient pouvoir demander suppression
- Ajoutez une politique de confidentialité

## Exemples d'Utilisation

### Bloquer l'accès VPN

Modifiez `backend/server.js` :

```javascript
if (isVPN) {
  return res.status(403).send('VPN détecté - Accès refusé');
}
```

### Alertes Email

Quand un VPN est détecté :

```javascript
if (isVPN) {
  sendEmail({
    to: 'admin@votresite.com',
    subject: 'VPN détecté !',
    body: `IP ${ip} a scanné avec un VPN`
  });
}
```

### Statistiques avancées

Créez des graphiques de scans VPN vs normaux dans le dashboard.

## Support

Le système est opérationnel et fonctionne automatiquement.

Testez en :
1. Scannant un QR code
2. Consultant les statistiques
3. Vérifiant la colonne VPN dans le tableau
