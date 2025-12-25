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
        vpn_detection_method VARCHAR(50)
      )
    `);

    // Ajouter colonnes VPN si elles n'existent pas
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

    console.log('✓ Tables de base de données créées avec succès');
  } catch (error) {
    console.error('Erreur lors de la création des tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
