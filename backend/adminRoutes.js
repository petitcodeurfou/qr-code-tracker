// Routes d'administration pour gérer les IP VPN
const express = require('express');
const { pool } = require('./database');
const VPNDetector = require('./vpnDetector');
const { authenticateToken } = require('./auth');

const router = express.Router();
const vpnDetector = new VPNDetector();

// Lister toutes les IP VPN dans la liste noire
router.get('/vpn-ips', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vpn_ips ORDER BY last_seen DESC LIMIT 1000'
    );
    res.json({ vpnIPs: result.rows });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Lister toutes les IP suspectes
router.get('/suspicious-ips', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM suspicious_ips ORDER BY scan_count DESC LIMIT 1000'
    );
    res.json({ suspiciousIPs: result.rows });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter manuellement une IP à la liste noire
router.post('/vpn-ips/add', authenticateToken, async (req, res) => {
  try {
    const { ip, provider, source } = req.body;

    if (!ip) {
      return res.status(400).json({ error: 'IP requise' });
    }

    await vpnDetector.addToBlacklist(
      ip,
      provider || 'Manual Entry',
      source || 'user_added'
    );

    res.json({ success: true, message: `IP ${ip} ajoutée à la liste noire` });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une IP de la liste noire
router.delete('/vpn-ips/:ip', authenticateToken, async (req, res) => {
  try {
    const { ip } = req.params;

    await pool.query('DELETE FROM vpn_ips WHERE ip_address = $1', [ip]);

    res.json({ success: true, message: `IP ${ip} supprimée de la liste noire` });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques VPN
router.get('/vpn-stats', authenticateToken, async (req, res) => {
  try {
    const totalVPNIPs = await pool.query('SELECT COUNT(*) FROM vpn_ips');
    const totalSuspicious = await pool.query('SELECT COUNT(*) FROM suspicious_ips');
    const totalVPNScans = await pool.query('SELECT COUNT(*) FROM scans WHERE is_vpn = TRUE');
    const recentVPNScans = await pool.query(
      'SELECT COUNT(*) FROM scans WHERE is_vpn = TRUE AND scanned_at >= NOW() - INTERVAL \'24 hours\''
    );

    res.json({
      totalVPNIPsInBlacklist: parseInt(totalVPNIPs.rows[0].count),
      totalSuspiciousIPs: parseInt(totalSuspicious.rows[0].count),
      totalVPNScans: parseInt(totalVPNScans.rows[0].count),
      vpnScansLast24h: parseInt(recentVPNScans.rows[0].count)
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
