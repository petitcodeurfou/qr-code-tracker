import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Auth from './Auth';
import EmailCampaign from './EmailCampaign';
import './App.css';

// Fix pour les icônes Leaflet avec Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState('create');
  const [targetUrl, setTargetUrl] = useState('');
  const [qrCodes, setQrCodes] = useState([]);
  const [currentQr, setCurrentQr] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Erreur logout:', error);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setQrCodes([]);
    setCurrentQr(null);
    setStats(null);
  };

  const createQrCode = async (e) => {
    e.preventDefault();
    if (!targetUrl) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/qr/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ targetUrl }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentQr(data);
        setTargetUrl('');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du code QR');
    } finally {
      setLoading(false);
    }
  };

  const loadQrCodes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/qr/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });
      const data = await response.json();
      setQrCodes(data.qrCodes);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (view === 'list' && user) {
      loadQrCodes();
    }
  }, [view, user, loadQrCodes]);

  const loadStats = async (shortId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/qr/${shortId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });
      const data = await response.json();
      setStats(data);
      setView('stats');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papiers!');
  };

  const downloadQrCode = () => {
    const link = document.createElement('a');
    link.href = currentQr.qrCodeImage;
    link.download = `qr-${currentQr.shortId}.png`;
    link.click();
  };

  // Si l'utilisateur n'est pas connecté, afficher la page d'authentification
  if (!user || !token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>Générateur de Codes QR avec Tracking</h1>
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button onClick={handleLogout} className="btn-logout">
              Déconnexion
            </button>
          </div>
        </div>
        <nav>
          <button
            className={view === 'create' ? 'active' : ''}
            onClick={() => { setView('create'); setCurrentQr(null); setStats(null); }}
          >
            Créer
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            Mes Codes QR
          </button>
          <button
            className={view === 'email' ? 'active' : ''}
            onClick={() => setView('email')}
          >
            📧 Emails
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'create' && (
          <div className="create-section">
            <div className="card">
              <h2>Créer un nouveau code QR</h2>
              <form onSubmit={createQrCode}>
                <div className="form-group">
                  <label>URL de destination</label>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Création...' : 'Générer le code QR'}
                </button>
              </form>
            </div>

            {currentQr && (
              <div className="card result-card">
                <h2>Code QR créé avec succès!</h2>
                <div className="qr-display">
                  <img src={currentQr.qrCodeImage} alt="QR Code" />
                </div>
                <div className="qr-info">
                  <div className="info-item">
                    <strong>URL de tracking:</strong>
                    <div className="copy-field">
                      <input type="text" value={currentQr.trackingUrl} readOnly />
                      <button onClick={() => copyToClipboard(currentQr.trackingUrl)}>
                        Copier
                      </button>
                    </div>
                  </div>
                  <div className="info-item">
                    <strong>URL de destination:</strong>
                    <span>{currentQr.targetUrl}</span>
                  </div>
                  <div className="info-item">
                    <strong>ID court:</strong>
                    <span>{currentQr.shortId}</span>
                  </div>
                </div>
                <div className="action-buttons">
                  <button onClick={downloadQrCode} className="btn-secondary">
                    Télécharger le code QR
                  </button>
                  <button onClick={() => loadStats(currentQr.shortId)} className="btn-secondary">
                    Voir les statistiques
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'list' && (
          <div className="list-section">
            <div className="card">
              <h2>Mes codes QR</h2>
              {loading ? (
                <p>Chargement...</p>
              ) : qrCodes.length === 0 ? (
                <p className="empty-state">Aucun code QR créé pour le moment</p>
              ) : (
                <div className="qr-list">
                  {qrCodes.map((qr) => (
                    <div key={qr.id} className="qr-item">
                      <div className="qr-item-info">
                        <h3>{qr.targetUrl}</h3>
                        <p>ID: {qr.shortId}</p>
                        <p>Créé le: {new Date(qr.createdAt).toLocaleDateString('fr-FR')}</p>
                        <p className="scan-count">{qr.scanCount} scan{qr.scanCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="qr-item-actions">
                        <button onClick={() => copyToClipboard(qr.trackingUrl)} className="btn-small">
                          Copier l'URL
                        </button>
                        <button onClick={() => loadStats(qr.shortId)} className="btn-small btn-primary">
                          Voir stats
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'stats' && stats && (
          <div className="stats-section">
            <button onClick={() => setView('list')} className="back-button">
              ← Retour à la liste
            </button>

            <div className="card">
              <h2>Statistiques du code QR</h2>
              <div className="stats-header">
                <div className="stat-box">
                  <h3>{stats.totalScans}</h3>
                  <p>Total de scans</p>
                </div>
                <div className="qr-details">
                  <p><strong>URL:</strong> {stats.qrCode.targetUrl}</p>
                  <p><strong>ID:</strong> {stats.qrCode.shortId}</p>
                  <p><strong>Créé le:</strong> {new Date(stats.qrCode.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div className="stats-grid">
                {stats.countryStats.length > 0 && (
                  <div className="country-stats">
                    <h3>Scans par pays</h3>
                    <div className="country-list">
                      {stats.countryStats.map((country, index) => (
                        <div key={index} className="country-item">
                          <span className="country-name">{country.country || 'Inconnu'}</span>
                          <span className="country-count">{country.count} scan{country.count !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.scans.length > 0 && (
                  <div className="device-stats">
                    <h3>Types d'appareils</h3>
                    <div className="device-list">
                      {(() => {
                        const deviceCounts = stats.scans.reduce((acc, scan) => {
                          const type = scan.device_type || 'desktop';
                          acc[type] = (acc[type] || 0) + 1;
                          return acc;
                        }, {});
                        return Object.entries(deviceCounts).map(([type, count]) => (
                          <div key={type} className="device-item">
                            <span className="device-name">
                              {type === 'mobile' && '📱 Mobile'}
                              {type === 'tablet' && '📱 Tablette'}
                              {type === 'desktop' && '💻 Ordinateur'}
                            </span>
                            <span className="device-count">{count} scan{count !== 1 ? 's' : ''}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {stats.scans.filter(scan => scan.latitude && scan.longitude).length > 0 && (
                <div className="map-section">
                  <h3>Carte des scans</h3>
                  <MapContainer
                    center={[
                      stats.scans.find(s => s.latitude && s.longitude)?.latitude || 0,
                      stats.scans.find(s => s.latitude && s.longitude)?.longitude || 0
                    ]}
                    zoom={2}
                    style={{ height: '400px', width: '100%', borderRadius: '8px' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {stats.scans
                      .filter(scan => scan.latitude && scan.longitude)
                      .map((scan) => (
                        <Marker key={scan.id} position={[scan.latitude, scan.longitude]}>
                          <Popup>
                            <div>
                              <strong>{scan.city || 'Inconnu'}, {scan.country || 'Inconnu'}</strong><br />
                              <strong>Appareil:</strong> {
                                scan.device_type === 'mobile' ? '📱 Mobile' :
                                scan.device_type === 'tablet' ? '📱 Tablette' :
                                '💻 Ordinateur'
                              }<br />
                              {scan.os_name && <><strong>OS:</strong> {scan.os_name} {scan.os_version}<br /></>}
                              {scan.browser_name && <><strong>Navigateur:</strong> {scan.browser_name}<br /></>}
                              <strong>IP:</strong> {scan.ip_address}<br />
                              {scan.isp && <><strong>ISP:</strong> {scan.isp}<br /></>}
                              {scan.is_vpn && <><strong>VPN:</strong> {scan.vpn_detection_method}<br /></>}
                              {scan.referrer && <><strong>Referrer:</strong> {new URL(scan.referrer).hostname}<br /></>}
                              <strong>Date:</strong> {new Date(scan.scanned_at).toLocaleString('fr-FR')}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                </div>
              )}

              <div className="scans-table">
                <h3>Détails des scans</h3>
                {stats.scans.length === 0 ? (
                  <p className="empty-state">Aucun scan pour le moment</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Appareil</th>
                        <th>Système</th>
                        <th>Navigateur</th>
                        <th>IP</th>
                        <th>VPN</th>
                        <th>ISP</th>
                        <th>Pays</th>
                        <th>Referrer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.scans.map((scan) => (
                        <tr key={scan.id} className={scan.is_vpn ? 'vpn-scan' : ''}>
                          <td>{new Date(scan.scanned_at).toLocaleString('fr-FR')}</td>
                          <td>
                            {scan.device_type === 'mobile' && '📱 Mobile'}
                            {scan.device_type === 'tablet' && '📱 Tablette'}
                            {scan.device_type === 'desktop' && '💻 Ordinateur'}
                            {!scan.device_type && '-'}
                          </td>
                          <td>
                            {scan.os_name ? `${scan.os_name}${scan.os_version ? ' ' + scan.os_version : ''}` : '-'}
                          </td>
                          <td>
                            {scan.browser_name ? `${scan.browser_name}${scan.browser_version ? ' ' + scan.browser_version : ''}` : '-'}
                          </td>
                          <td>{scan.ip_address}</td>
                          <td>
                            {scan.is_vpn ? (
                              <span className="vpn-badge" title={`Méthode: ${scan.vpn_detection_method}`}>
                                VPN
                              </span>
                            ) : (
                              <span className="normal-badge">Non</span>
                            )}
                          </td>
                          <td>{scan.isp || '-'}</td>
                          <td>{scan.country || '-'} {scan.city ? `(${scan.city})` : ''}</td>
                          <td>
                            {scan.referrer ? (
                              <span title={scan.referrer}>
                                {new URL(scan.referrer).hostname}
                              </span>
                            ) : (
                              <span className="direct-scan">Scan direct</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'email' && (
          <EmailCampaign
            token={token}
            onBack={() => setView('create')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
