// Script pour importer des IP VPN dans la base de données
const VPNDetector = require('./vpnDetector');
const { getAllVPNIPs, individualVPNIPs } = require('./vpnLists');
require('dotenv').config();

async function importVPNs() {
  console.log('🔄 Importation des IP VPN...\n');

  const detector = new VPNDetector();

  try {
    // Importer les IP depuis les listes CIDR
    const vpnIPs = getAllVPNIPs();
    console.log(`📋 ${vpnIPs.length} IP trouvées dans les listes CIDR`);

    for (const { ip, provider, source } of vpnIPs) {
      await detector.addToBlacklist(ip, provider, source);
    }

    // Importer les IP individuelles
    console.log(`\n📋 ${individualVPNIPs.length} IP individuelles`);

    for (const { ip, provider, source } of individualVPNIPs) {
      await detector.addToBlacklist(ip, provider, source);
    }

    console.log('\n✅ Importation terminée !');
    console.log('\nVous pouvez ajouter plus d\'IP VPN dans backend/vpnLists.js');

  } catch (error) {
    console.error('❌ Erreur lors de l\'importation:', error);
  }

  process.exit(0);
}

importVPNs();
