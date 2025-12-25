const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { nanoid } = require('nanoid');
const geoip = require('geoip-lite');
const axios = require('axios');
const QRCode = require('qrcode');
const { pool, initDatabase } = require('./database');
const { authenticateToken, optionalAuth, signup, login, logout, getCurrentUser } = require('./auth');
const VPNDetector = require('./vpnDetector');
require('dotenv').config();

const vpnDetector = new VPNDetector();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Initialiser la base de données
let dbInitialized = false;
const ensureDbInit = async () => {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
};

// Middleware pour initialiser la DB avant chaque requête
app.use(async (req, res, next) => {
  try {
    await ensureDbInit();
    next();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la DB:', error);
    res.status(500).json({ error: 'Erreur de base de données' });
  }
});

// Fonction pour obtenir l'IP réelle du client
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress;
}

// === ROUTES D'AUTHENTIFICATION ===
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', authenticateToken, getCurrentUser);

// === ROUTES QR CODE ===

// Endpoint pour créer un nouveau code QR (protégé)
app.post('/api/qr/create', authenticateToken, async (req, res) => {
  try {
    const { targetUrl } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: 'URL cible requise' });
    }

    // Générer un ID unique court
    const shortId = nanoid(8);
    const creatorIp = getClientIp(req);

    // Créer l'URL de tracking
    const trackingUrl = `${process.env.BASE_URL}/track/${shortId}`;

    // Insérer dans la base de données avec user_id
    const result = await pool.query(
      'INSERT INTO qr_codes (short_id, target_url, creator_ip, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [shortId, targetUrl, creatorIp, req.userId]
    );

    // Générer le code QR
    const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl);

    res.json({
      success: true,
      shortId,
      trackingUrl,
      targetUrl,
      qrCodeImage: qrCodeDataUrl,
      qrCodeId: result.rows[0].id
    });
  } catch (error) {
    console.error('Erreur lors de la création du QR code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Endpoint de tracking et redirection
app.get('/track/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;

    // Récupérer le code QR
    const qrResult = await pool.query(
      'SELECT id, target_url FROM qr_codes WHERE short_id = $1',
      [shortId]
    );

    if (qrResult.rows.length === 0) {
      return res.status(404).send('Code QR non trouvé');
    }

    const qrCode = qrResult.rows[0];
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Détecter si c'est un VPN
    const vpnCheck = await vpnDetector.detect(ip);
    const isVPN = vpnCheck.isVPN;
    const vpnMethod = vpnCheck.method;

    // Obtenir la géolocalisation et l'ISP à partir de l'IP via ip-api.com
    let country = null;
    let city = null;
    let latitude = null;
    let longitude = null;
    let isp = null;

    try {
      // Utiliser ip-api.com pour obtenir des informations complètes incluant l'ISP
      // API gratuite avec limite de 45 requêtes/minute
      const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon,isp`);

      if (response.data && response.data.status === 'success') {
        country = response.data.country;
        city = response.data.city;
        latitude = response.data.lat;
        longitude = response.data.lon;
        isp = response.data.isp;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données IP:', error.message);

      // Fallback sur geoip-lite si l'API échoue
      const geo = geoip.lookup(ip);
      if (geo) {
        country = geo.country;
        city = geo.city;
        latitude = geo.ll[0];
        longitude = geo.ll[1];
      }
    }

    // Enregistrer le scan avec information VPN et ISP
    await pool.query(
      `INSERT INTO scans (qr_code_id, ip_address, user_agent, country, city, latitude, longitude, is_vpn, vpn_detection_method, isp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [qrCode.id, ip, userAgent, country, city, latitude, longitude, isVPN, vpnMethod, isp]
    );

    const vpnLabel = isVPN ? ` [VPN DÉTECTÉ: ${vpnMethod}]` : '';
    const ispLabel = isp ? ` - ISP: ${isp}` : '';
    console.log(`✓ Scan enregistré pour ${shortId} depuis ${ip} (${country || 'Unknown'})${ispLabel}${vpnLabel}`);

    // Rediriger vers l'URL cible
    res.redirect(qrCode.target_url);
  } catch (error) {
    console.error('Erreur lors du tracking:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Endpoint pour obtenir les statistiques d'un code QR (protégé)
app.get('/api/qr/:shortId/stats', authenticateToken, async (req, res) => {
  try {
    const { shortId } = req.params;

    // Récupérer le code QR et vérifier qu'il appartient à l'utilisateur
    const qrResult = await pool.query(
      'SELECT * FROM qr_codes WHERE short_id = $1 AND user_id = $2',
      [shortId, req.userId]
    );

    if (qrResult.rows.length === 0) {
      return res.status(404).json({ error: 'Code QR non trouvé ou accès non autorisé' });
    }

    const qrCode = qrResult.rows[0];

    // Récupérer tous les scans
    const scansResult = await pool.query(
      'SELECT * FROM scans WHERE qr_code_id = $1 ORDER BY scanned_at DESC',
      [qrCode.id]
    );

    // Statistiques par pays
    const countryStats = await pool.query(
      `SELECT country, COUNT(*) as count
       FROM scans
       WHERE qr_code_id = $1 AND country IS NOT NULL
       GROUP BY country
       ORDER BY count DESC`,
      [qrCode.id]
    );

    res.json({
      qrCode: {
        shortId: qrCode.short_id,
        targetUrl: qrCode.target_url,
        createdAt: qrCode.created_at,
        trackingUrl: `${process.env.BASE_URL}/track/${qrCode.short_id}`
      },
      totalScans: scansResult.rows.length,
      scans: scansResult.rows,
      countryStats: countryStats.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Endpoint pour lister tous les codes QR de l'utilisateur (protégé)
app.get('/api/qr/list', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        q.id,
        q.short_id,
        q.target_url,
        q.created_at,
        COUNT(s.id) as scan_count
      FROM qr_codes q
      LEFT JOIN scans s ON q.id = s.qr_code_id
      WHERE q.user_id = $1
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `, [req.userId]);

    res.json({
      qrCodes: result.rows.map(row => ({
        id: row.id,
        shortId: row.short_id,
        targetUrl: row.target_url,
        createdAt: row.created_at,
        scanCount: parseInt(row.scan_count),
        trackingUrl: `${process.env.BASE_URL}/track/${row.short_id}`
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des QR codes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === ROUTES ADMIN VPN ===
const adminRoutes = require('./adminRoutes');
app.use('/api/admin', adminRoutes);

// Pour le développement local
if (require.main === module) {
  initDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`✓ Serveur démarré sur le port ${PORT}`);
        console.log(`✓ Base de données PostgreSQL (Neon) connectée`);
        console.log(`✓ Système de détection VPN activé`);
      });
    })
    .catch(error => {
      console.error('Erreur lors de l\'initialisation:', error);
      process.exit(1);
    });
}

// Export pour Vercel
module.exports = app;
