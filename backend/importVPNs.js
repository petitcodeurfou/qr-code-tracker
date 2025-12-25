// Script pour importer des IP VPN dans la base de données
const VPNDetector = require('./vpnDetector');
const { knownVPNIPs, individualVPNIPs } = require('./vpnLists');
const { initDatabase } = require('./database');
require('dotenv').config();

async function importVPNs() {
  console.log('🔄 Importation des IP VPN et plages CIDR...\n');

  // Initialiser la base de données d'abord
  console.log('Initialisation de la base de données...');
  await initDatabase();
  console.log('✓ Base de données initialisée\n');

  const detector = new VPNDetector();
  let totalImported = 0;

  try {
    // Importer les plages CIDR par provider
    for (const [provider, ranges] of Object.entries(knownVPNIPs)) {
      console.log(`\n📋 Importation de ${ranges.length} plages CIDR pour ${provider}...`);
      const imported = await detector.importCIDRList(ranges, provider, 'known_vpn_list');
      totalImported += imported;
    }

    // Importer les IP individuelles
    console.log(`\n📋 Importation de ${individualVPNIPs.length} IP individuelles...`);

    for (const { ip, provider, source } of individualVPNIPs) {
      await detector.addToBlacklist(ip, provider, source);
      totalImported++;
    }

    console.log('\n✅ Importation terminée !');
    console.log(`✅ Total: ${totalImported} entrées VPN importées`);
    console.log('\nVous pouvez ajouter plus de plages CIDR dans backend/vpnLists.js');

  } catch (error) {
    console.error('❌ Erreur lors de l\'importation:', error);
  }

  process.exit(0);
}

importVPNs();
