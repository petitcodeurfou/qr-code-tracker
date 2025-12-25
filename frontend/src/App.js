import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [view, setView] = useState('create');
  const [targetUrl, setTargetUrl] = useState('');
  const [qrCodes, setQrCodes] = useState([]);
  const [currentQr, setCurrentQr] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view === 'list') {
      loadQrCodes();
    }
  }, [view]);

  const createQrCode = async (e) => {
    e.preventDefault();
    if (!targetUrl) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/qr/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const loadQrCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/qr/list`);
      const data = await response.json();
      setQrCodes(data.qrCodes);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (shortId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/qr/${shortId}/stats`);
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

  return (
    <div className="App">
      <header className="app-header">
        <h1>Générateur de Codes QR avec Tracking</h1>
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

              <div className="scans-table">
                <h3>Détails des scans</h3>
                {stats.scans.length === 0 ? (
                  <p className="empty-state">Aucun scan pour le moment</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>IP</th>
                        <th>Pays</th>
                        <th>Ville</th>
                        <th>User Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.scans.map((scan) => (
                        <tr key={scan.id}>
                          <td>{new Date(scan.scanned_at).toLocaleString('fr-FR')}</td>
                          <td>{scan.ip_address}</td>
                          <td>{scan.country || '-'}</td>
                          <td>{scan.city || '-'}</td>
                          <td className="user-agent">{scan.user_agent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
