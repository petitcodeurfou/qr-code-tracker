// Liste d'IP VPN connues (échantillon - vous pouvez en ajouter plus)
// Sources : listes publiques de VPN commerciaux populaires

const knownVPNIPs = {
  // NordVPN (exemples)
  nordvpn: [
    '185.112.148.0/24',
    '185.191.127.0/24',
    '89.187.160.0/24'
  ],

  // ExpressVPN (exemples)
  expressvpn: [
    '185.159.156.0/24',
    '217.138.193.0/24'
  ],

  // Surfshark (exemples)
  surfshark: [
    '45.83.223.0/24',
    '193.42.98.0/24'
  ],

  // ProtonVPN (exemples)
  protonvpn: [
    '185.159.158.0/24',
    '5.255.99.0/24'
  ],

  // CyberGhost (exemples)
  cyberghost: [
    '89.45.89.0/24',
    '195.181.170.0/24'
  ],

  // IP communes de serveurs proxy publics
  publicProxies: [
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18'
  ]
};

// Fonction pour convertir CIDR en liste d'IP (simplifié - prend les premières IP)
function cidrToIPs(cidr) {
  const [base, mask] = cidr.split('/');
  const baseParts = base.split('.').map(Number);

  // Pour simplifier, on retourne juste la base
  // Dans une vraie application, il faudrait générer toutes les IP du range
  return [base];
}

// Convertir toutes les listes en IP individuelles
function getAllVPNIPs() {
  const allIPs = [];

  for (const [provider, ranges] of Object.entries(knownVPNIPs)) {
    for (const range of ranges) {
      const ips = cidrToIPs(range);
      for (const ip of ips) {
        allIPs.push({
          ip,
          provider: provider.charAt(0).toUpperCase() + provider.slice(1),
          source: 'known_vpn_list'
        });
      }
    }
  }

  return allIPs;
}

// Liste additionnelle d'IP VPN individuelles trouvées sur le web
const individualVPNIPs = [
  // Ces IP sont des exemples - vous devrez les mettre à jour régulièrement
  { ip: '185.220.101.1', provider: 'Tor Exit Node', source: 'tor_list' },
  { ip: '185.220.101.2', provider: 'Tor Exit Node', source: 'tor_list' },
  { ip: '45.142.182.1', provider: 'Unknown VPN', source: 'community' },
  { ip: '193.29.57.1', provider: 'Unknown VPN', source: 'community' },
];

module.exports = {
  knownVPNIPs,
  getAllVPNIPs,
  individualVPNIPs
};
