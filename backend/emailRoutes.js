const express = require('express');
const nodemailer = require('nodemailer');
const { nanoid } = require('nanoid');
const UAParser = require('ua-parser-js');
const axios = require('axios');
const { pool } = require('./database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Configuration Nodemailer (à personnaliser avec vos identifiants)
// Pour Gmail: activez "Accès moins sécurisé" ou utilisez un "Mot de passe d'application"
const createTransporter = (userEmail, userPassword) => {
  return nodemailer.createTransport({
    service: 'gmail', // Peut être changé pour d'autres services
    auth: {
      user: userEmail,
      pass: userPassword
    }
  });
};

// Fonction pour obtenir l'IP du client
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress;
}

// Fonction pour ajouter le footer de tracking à l'email
function addTrackingFooter(htmlContent, campaignName) {
  const footer = `
    <br><br>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
    <div style="font-size: 11px; color: #666; padding: 10px; background: #f9f9f9; border-radius: 5px;">
      <p style="margin: 5px 0;">
        <strong>ℹ️ Informations sur le tracking</strong>
      </p>
      <p style="margin: 5px 0;">
        Cet email (campagne: "${campaignName}") utilise des technologies de tracking pour mesurer
        les ouvertures et les clics sur les liens. Ces données sont collectées et traitées par
        l'expéditeur de cet email, qui est seul responsable de leur utilisation.
      </p>
      <p style="margin: 5px 0;">
        Les informations suivantes peuvent être collectées: date/heure d'ouverture, appareil utilisé,
        localisation approximative, et clics sur les liens.
      </p>
      <p style="margin: 5px 0;">
        Conformément au RGPD, vous pouvez demander l'accès, la modification ou la suppression
        de vos données en contactant directement l'expéditeur.
      </p>
    </div>
  `;

  return htmlContent + footer;
}

// Fonction pour remplacer les liens par des liens trackés
function replaceLinksWithTracking(htmlContent, trackingId, baseUrl) {
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>(.*?)<\/a>/gi;
  let linkIndex = 0;

  return htmlContent.replace(linkRegex, (match, url, attributes, text) => {
    if (url.startsWith('http')) {
      linkIndex++;
      const trackingUrl = `${baseUrl}/api/email/click/${trackingId}/${linkIndex}?url=${encodeURIComponent(url)}`;
      return `<a href="${trackingUrl}"${attributes}>${text}</a>`;
    }
    return match;
  });
}

// Route pour créer et envoyer une campagne email
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const {
      campaignName,
      subject,
      fromEmail,
      fromName,
      recipients, // Array d'emails
      htmlContent,
      smtpPassword, // Mot de passe fourni par l'utilisateur
      userAcceptsResponsibility // Consentement de l'utilisateur
    } = req.body;

    // Vérifier le consentement
    if (!userAcceptsResponsibility) {
      return res.status(400).json({
        error: 'Vous devez accepter la responsabilité du tracking avant d\'envoyer des emails'
      });
    }

    // Validation
    if (!campaignName || !subject || !fromEmail || !recipients || !htmlContent || !smtpPassword) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'La liste de destinataires est vide' });
    }

    // Créer la campagne dans la DB
    const campaignResult = await pool.query(
      `INSERT INTO email_campaigns (user_id, name, subject, from_email, from_name, html_content, total_recipients)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [req.userId, campaignName, subject, fromEmail, fromName, htmlContent, recipients.length]
    );

    const campaignId = campaignResult.rows[0].id;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

    // Créer le transporteur email
    const transporter = createTransporter(fromEmail, smtpPassword);

    let sentCount = 0;
    const sendPromises = [];

    // Envoyer à chaque destinataire
    for (const recipientEmail of recipients) {
      const trackingId = nanoid(16);

      // Ajouter le pixel de tracking et remplacer les liens
      const pixelUrl = `${baseUrl}/api/email/open/${trackingId}`;
      const trackingPixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="">`;

      let finalHtml = replaceLinksWithTracking(htmlContent, trackingId, baseUrl);
      finalHtml = addTrackingFooter(finalHtml, campaignName);
      finalHtml += trackingPixel;

      // Enregistrer dans la DB
      await pool.query(
        `INSERT INTO email_sends (campaign_id, recipient_email, tracking_id)
         VALUES ($1, $2, $3)`,
        [campaignId, recipientEmail, trackingId]
      );

      // Envoyer l'email
      const sendPromise = transporter.sendMail({
        from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
        to: recipientEmail,
        subject: subject,
        html: finalHtml
      })
      .then(() => {
        sentCount++;
        console.log(`✓ Email envoyé à ${recipientEmail} (tracking: ${trackingId})`);
      })
      .catch((error) => {
        console.error(`✗ Erreur envoi à ${recipientEmail}:`, error.message);
      });

      sendPromises.push(sendPromise);
    }

    // Attendre que tous les emails soient envoyés
    await Promise.all(sendPromises);

    // Mettre à jour la campagne
    await pool.query(
      `UPDATE email_campaigns
       SET total_sent = $1, sent_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [sentCount, campaignId]
    );

    res.json({
      success: true,
      campaignId,
      totalRecipients: recipients.length,
      totalSent: sentCount,
      message: `${sentCount}/${recipients.length} emails envoyés avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi des emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour tracker l'ouverture d'un email (pixel invisible)
router.get('/open/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Parser le User Agent
    const parser = new UAParser(userAgent);
    const deviceInfo = parser.getResult();
    const deviceType = deviceInfo.device.type || 'desktop';
    const osName = deviceInfo.os.name || null;
    const browserName = deviceInfo.browser.name || null;

    // Obtenir la géolocalisation
    let country = null;
    let city = null;

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,city`);
      if (response.data && response.data.status === 'success') {
        country = response.data.country;
        city = response.data.city;
      }
    } catch (error) {
      // Ignorer les erreurs de géolocalisation
    }

    // Trouver l'email
    const emailResult = await pool.query(
      'SELECT id, first_opened_at FROM email_sends WHERE tracking_id = $1',
      [trackingId]
    );

    if (emailResult.rows.length > 0) {
      const emailSend = emailResult.rows[0];

      // Enregistrer l'ouverture
      await pool.query(
        `INSERT INTO email_opens (email_send_id, ip_address, user_agent, device_type, os_name, browser_name, country, city)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [emailSend.id, ip, userAgent, deviceType, osName, browserName, country, city]
      );

      // Mettre à jour les compteurs
      await pool.query(
        `UPDATE email_sends
         SET open_count = open_count + 1,
             first_opened_at = COALESCE(first_opened_at, CURRENT_TIMESTAMP),
             last_activity_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [emailSend.id]
      );

      // Mettre à jour les stats de la campagne
      await pool.query(
        `UPDATE email_campaigns
         SET total_opened = (
           SELECT COUNT(DISTINCT email_send_id)
           FROM email_opens
           WHERE email_send_id IN (
             SELECT id FROM email_sends WHERE campaign_id = (
               SELECT campaign_id FROM email_sends WHERE id = $1
             )
           )
         )
         WHERE id = (SELECT campaign_id FROM email_sends WHERE id = $1)`,
        [emailSend.id]
      );

      console.log(`✓ Ouverture trackée pour ${trackingId} depuis ${ip} (${country || 'Unknown'})`);
    }

    // Renvoyer une image transparente 1x1
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    });
    res.end(pixel);

  } catch (error) {
    console.error('Erreur tracking ouverture:', error);
    // Toujours renvoyer une image même en cas d'erreur
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length
    });
    res.end(pixel);
  }
});

// Route pour tracker les clics sur les liens
router.get('/click/:trackingId/:linkIndex', async (req, res) => {
  try {
    const { trackingId, linkIndex } = req.params;
    const { url } = req.query;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Parser le User Agent
    const parser = new UAParser(userAgent);
    const deviceInfo = parser.getResult();
    const deviceType = deviceInfo.device.type || 'desktop';

    // Obtenir le pays
    let country = null;
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country`);
      if (response.data && response.data.status === 'success') {
        country = response.data.country;
      }
    } catch (error) {
      // Ignorer
    }

    // Trouver l'email
    const emailResult = await pool.query(
      'SELECT id FROM email_sends WHERE tracking_id = $1',
      [trackingId]
    );

    if (emailResult.rows.length > 0) {
      const emailSend = emailResult.rows[0];

      // Enregistrer le clic
      await pool.query(
        `INSERT INTO email_clicks (email_send_id, link_url, link_label, ip_address, user_agent, device_type, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [emailSend.id, url, `Lien ${linkIndex}`, ip, userAgent, deviceType, country]
      );

      // Mettre à jour les compteurs
      await pool.query(
        `UPDATE email_sends
         SET click_count = click_count + 1,
             last_activity_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [emailSend.id]
      );

      // Mettre à jour les stats de la campagne
      await pool.query(
        `UPDATE email_campaigns
         SET total_clicked = (
           SELECT COUNT(DISTINCT email_send_id)
           FROM email_clicks
           WHERE email_send_id IN (
             SELECT id FROM email_sends WHERE campaign_id = (
               SELECT campaign_id FROM email_sends WHERE id = $1
             )
           )
         )
         WHERE id = (SELECT campaign_id FROM email_sends WHERE id = $1)`,
        [emailSend.id]
      );

      console.log(`✓ Clic tracké pour ${trackingId} vers ${url}`);
    }

    // Rediriger vers l'URL cible
    res.redirect(url || 'https://google.com');

  } catch (error) {
    console.error('Erreur tracking clic:', error);
    res.redirect(req.query.url || 'https://google.com');
  }
});

// Route pour obtenir les statistiques d'une campagne
router.get('/campaign/:campaignId/stats', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Vérifier que la campagne appartient à l'utilisateur
    const campaignResult = await pool.query(
      'SELECT * FROM email_campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, req.userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    const campaign = campaignResult.rows[0];

    // Obtenir les détails de chaque email envoyé
    const sendsResult = await pool.query(
      `SELECT
        es.*,
        (SELECT COUNT(*) FROM email_opens WHERE email_send_id = es.id) as total_opens,
        (SELECT COUNT(*) FROM email_clicks WHERE email_send_id = es.id) as total_clicks
       FROM email_sends es
       WHERE campaign_id = $1
       ORDER BY sent_at DESC`,
      [campaignId]
    );

    // Stats d'ouverture
    const opensResult = await pool.query(
      `SELECT eo.*
       FROM email_opens eo
       JOIN email_sends es ON eo.email_send_id = es.id
       WHERE es.campaign_id = $1
       ORDER BY eo.opened_at DESC`,
      [campaignId]
    );

    // Stats de clics
    const clicksResult = await pool.query(
      `SELECT ec.*
       FROM email_clicks ec
       JOIN email_sends es ON ec.email_send_id = es.id
       WHERE es.campaign_id = $1
       ORDER BY ec.clicked_at DESC`,
      [campaignId]
    );

    res.json({
      campaign,
      sends: sendsResult.rows,
      opens: opensResult.rows,
      clicks: clicksResult.rows
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour lister toutes les campagnes de l'utilisateur
router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM email_campaigns
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );

    res.json({ campaigns: result.rows });

  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
