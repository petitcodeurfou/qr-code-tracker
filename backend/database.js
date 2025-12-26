const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    // Table des utilisateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des codes QR
    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        short_id VARCHAR(20) UNIQUE NOT NULL,
        target_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        creator_ip VARCHAR(45),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Ajouter la colonne user_id si elle n'existe pas (migration)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='qr_codes' AND column_name='user_id'
        ) THEN
          ALTER TABLE qr_codes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Table des scans
    await client.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id SERIAL PRIMARY KEY,
        qr_code_id INTEGER REFERENCES qr_codes(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        country VARCHAR(100),
        city VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_vpn BOOLEAN DEFAULT FALSE,
        vpn_detection_method VARCHAR(50),
        isp VARCHAR(255),
        referrer TEXT,
        device_type VARCHAR(50),
        os_name VARCHAR(100),
        os_version VARCHAR(50),
        browser_name VARCHAR(100),
        browser_version VARCHAR(50)
      )
    `);

    // Ajouter colonnes VPN, ISP, Referrer et Device info si elles n'existent pas
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='is_vpn'
        ) THEN
          ALTER TABLE scans ADD COLUMN is_vpn BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='vpn_detection_method'
        ) THEN
          ALTER TABLE scans ADD COLUMN vpn_detection_method VARCHAR(50);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='isp'
        ) THEN
          ALTER TABLE scans ADD COLUMN isp VARCHAR(255);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='referrer'
        ) THEN
          ALTER TABLE scans ADD COLUMN referrer TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='device_type'
        ) THEN
          ALTER TABLE scans ADD COLUMN device_type VARCHAR(50);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='os_name'
        ) THEN
          ALTER TABLE scans ADD COLUMN os_name VARCHAR(100);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='os_version'
        ) THEN
          ALTER TABLE scans ADD COLUMN os_version VARCHAR(50);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='browser_name'
        ) THEN
          ALTER TABLE scans ADD COLUMN browser_name VARCHAR(100);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scans' AND column_name='browser_version'
        ) THEN
          ALTER TABLE scans ADD COLUMN browser_version VARCHAR(50);
        END IF;
      END $$;
    `);

    // Table des IP VPN connues (liste noire)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vpn_ips (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        provider VARCHAR(100),
        source VARCHAR(100),
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index pour recherche rapide
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vpn_ips_address ON vpn_ips(ip_address)
    `);

    // Table des IP suspectes (détection automatique)
    await client.query(`
      CREATE TABLE IF NOT EXISTS suspicious_ips (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        scan_count INTEGER DEFAULT 1,
        first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_flagged_vpn BOOLEAN DEFAULT FALSE,
        detection_reason VARCHAR(200)
      )
    `);

    // Index pour recherche rapide
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_suspicious_ips_address ON suspicious_ips(ip_address)
    `);

    // Table des plages CIDR VPN (pour détection par ranges)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vpn_cidr_ranges (
        id SERIAL PRIMARY KEY,
        cidr_range CIDR NOT NULL,
        provider VARCHAR(100),
        source VARCHAR(100),
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_matched TIMESTAMP
      )
    `);

    // Index GIST pour recherche rapide de containment
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vpn_cidr_ranges ON vpn_cidr_ranges USING GIST(cidr_range inet_ops)
    `);

    // Table des campagnes email
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255),
        html_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        total_recipients INTEGER DEFAULT 0,
        total_sent INTEGER DEFAULT 0,
        total_opened INTEGER DEFAULT 0,
        total_clicked INTEGER DEFAULT 0
      )
    `);

    // Table des emails envoyés
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_sends (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255) NOT NULL,
        tracking_id VARCHAR(100) UNIQUE NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        first_opened_at TIMESTAMP,
        open_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        last_activity_at TIMESTAMP
      )
    `);

    // Index pour recherche rapide
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_sends_tracking ON email_sends(tracking_id)
    `);

    // Table des ouvertures d'emails
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_opens (
        id SERIAL PRIMARY KEY,
        email_send_id INTEGER REFERENCES email_sends(id) ON DELETE CASCADE,
        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_type VARCHAR(50),
        os_name VARCHAR(100),
        browser_name VARCHAR(100),
        country VARCHAR(100),
        city VARCHAR(100)
      )
    `);

    // Table des clics d'emails
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_clicks (
        id SERIAL PRIMARY KEY,
        email_send_id INTEGER REFERENCES email_sends(id) ON DELETE CASCADE,
        link_url TEXT NOT NULL,
        link_label VARCHAR(255),
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_type VARCHAR(50),
        country VARCHAR(100)
      )
    `);

    console.log('✓ Tables de base de données créées avec succès');
  } catch (error) {
    console.error('Erreur lors de la création des tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
