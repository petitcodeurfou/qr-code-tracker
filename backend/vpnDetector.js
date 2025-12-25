const { pool } = require('./database');
const dns = require('dns').promises;

class VPNDetector {
  constructor() {
    this.DAILY_SCAN_LIMIT = 100; // Si une IP scanne 100+ fois par jour = VPN
  }

  // Vérifier si l'IP est dans la liste noire
  async isBlacklisted(ip) {
    try {
      const result = await pool.query(
        'SELECT id, provider FROM vpn_ips WHERE ip_address = $1',
        [ip]
      );

      if (result.rows.length > 0) {
        // Mettre à jour last_seen
        await pool.query(
          'UPDATE vpn_ips SET last_seen = CURRENT_TIMESTAMP WHERE ip_address = $1',
          [ip]
        );
        return { isVPN: true, provider: result.rows[0].provider, method: 'blacklist' };
      }

      return { isVPN: false };
    } catch (error) {
      console.error('Erreur isBlacklisted:', error);
      return { isVPN: false };
    }
  }

  // Vérifier si l'IP a scanné trop de fois aujourd'hui
  async checkDailyLimit(ip) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count
         FROM scans
         WHERE ip_address = $1
         AND scanned_at >= CURRENT_DATE`,
        [ip]
      );

      const todayScans = parseInt(result.rows[0].count);

      if (todayScans >= this.DAILY_SCAN_LIMIT) {
        // Ajouter à la liste suspecte
        await this.addSuspiciousIP(ip, todayScans, 'high_frequency');
        return { isVPN: true, scans: todayScans, method: 'high_frequency' };
      }

      return { isVPN: false, scans: todayScans };
    } catch (error) {
      console.error('Erreur checkDailyLimit:', error);
      return { isVPN: false };
    }
  }

  // Vérifier le hostname DNS (reverse lookup)
  async checkHostname(ip) {
    try {
      const hostnames = await dns.reverse(ip);
      if (hostnames.length === 0) return { isVPN: false };

      const hostname = hostnames[0].toLowerCase();
      const vpnKeywords = [
        'vpn', 'proxy', 'tor', 'tunnel', 'relay',
        'exit', 'node', 'anonymous', 'nordvpn',
        'expressvpn', 'surfshark', 'protonvpn',
        'mullvad', 'privateinternetaccess', 'pia'
      ];

      for (const keyword of vpnKeywords) {
        if (hostname.includes(keyword)) {
          return { isVPN: true, hostname, method: 'hostname' };
        }
      }

      return { isVPN: false, hostname };
    } catch (error) {
      // Erreur DNS normale, pas forcément un VPN
      return { isVPN: false };
    }
  }

  // Vérifier si l'IP est dans la liste suspecte
  async checkSuspicious(ip) {
    try {
      const result = await pool.query(
        'SELECT is_flagged_vpn, detection_reason FROM suspicious_ips WHERE ip_address = $1',
        [ip]
      );

      if (result.rows.length > 0 && result.rows[0].is_flagged_vpn) {
        return {
          isVPN: true,
          reason: result.rows[0].detection_reason,
          method: 'suspicious_list'
        };
      }

      return { isVPN: false };
    } catch (error) {
      console.error('Erreur checkSuspicious:', error);
      return { isVPN: false };
    }
  }

  // Détecter si une IP est un VPN
  async detect(ip) {
    try {
      // Ne pas checker les IP locales
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { isVPN: false, method: null };
      }

      // 1. Vérifier la liste noire (priorité max)
      const blacklistCheck = await this.isBlacklisted(ip);
      if (blacklistCheck.isVPN) {
        return blacklistCheck;
      }

      // 2. Vérifier la liste suspecte
      const suspiciousCheck = await this.checkSuspicious(ip);
      if (suspiciousCheck.isVPN) {
        return suspiciousCheck;
      }

      // 3. Vérifier la fréquence (100+ scans/jour)
      const dailyCheck = await this.checkDailyLimit(ip);
      if (dailyCheck.isVPN) {
        return dailyCheck;
      }

      // 4. Vérifier le hostname (en arrière-plan, pas bloquant)
      // On lance ça mais on ne bloque pas dessus car c'est lent
      this.checkHostname(ip).then(hostnameCheck => {
        if (hostnameCheck.isVPN) {
          this.addToBlacklist(ip, 'Detected via hostname', 'auto_hostname');
        }
      }).catch(() => {});

      // Mettre à jour les stats de l'IP
      await this.updateIPStats(ip);

      return { isVPN: false, method: null };
    } catch (error) {
      console.error('Erreur VPN detect:', error);
      return { isVPN: false, method: null };
    }
  }

  // Ajouter une IP à la liste noire
  async addToBlacklist(ip, provider = 'Unknown', source = 'manual') {
    try {
      await pool.query(
        `INSERT INTO vpn_ips (ip_address, provider, source)
         VALUES ($1, $2, $3)
         ON CONFLICT (ip_address)
         DO UPDATE SET last_seen = CURRENT_TIMESTAMP, provider = $2, source = $3`,
        [ip, provider, source]
      );
      console.log(`✓ IP ${ip} ajoutée à la liste noire (${provider})`);
    } catch (error) {
      console.error('Erreur addToBlacklist:', error);
    }
  }

  // Ajouter une IP à la liste suspecte
  async addSuspiciousIP(ip, scanCount, reason) {
    try {
      await pool.query(
        `INSERT INTO suspicious_ips (ip_address, scan_count, detection_reason, is_flagged_vpn)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (ip_address)
         DO UPDATE SET
           scan_count = $2,
           last_seen = CURRENT_TIMESTAMP,
           is_flagged_vpn = TRUE,
           detection_reason = $3`,
        [ip, scanCount, reason]
      );

      // Aussi ajouter à la liste noire
      await this.addToBlacklist(ip, 'Auto-detected', reason);
    } catch (error) {
      console.error('Erreur addSuspiciousIP:', error);
    }
  }

  // Mettre à jour les statistiques d'une IP
  async updateIPStats(ip) {
    try {
      await pool.query(
        `INSERT INTO suspicious_ips (ip_address, scan_count)
         VALUES ($1, 1)
         ON CONFLICT (ip_address)
         DO UPDATE SET
           scan_count = suspicious_ips.scan_count + 1,
           last_seen = CURRENT_TIMESTAMP`,
        [ip]
      );
    } catch (error) {
      console.error('Erreur updateIPStats:', error);
    }
  }

  // Importer des IP VPN depuis une liste
  async importVPNList(ips, provider, source) {
    let imported = 0;
    for (const ip of ips) {
      try {
        await this.addToBlacklist(ip, provider, source);
        imported++;
      } catch (error) {
        console.error(`Erreur import IP ${ip}:`, error);
      }
    }
    console.log(`✓ ${imported}/${ips.length} IP VPN importées`);
    return imported;
  }
}

module.exports = VPNDetector;
