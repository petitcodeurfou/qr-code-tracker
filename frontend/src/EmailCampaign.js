import React, { useState } from 'react';
import './EmailCampaign.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function EmailCampaign({ token, onBack }) {
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [recipients, setRecipients] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userAcceptsResponsibility, setUserAcceptsResponsibility] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Afficher la popup de confirmation
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!userAcceptsResponsibility) {
      alert('Vous devez accepter la responsabilité du tracking pour continuer.');
      return;
    }

    setLoading(true);
    setShowConfirmModal(false);

    try {
      // Convertir les destinataires en array
      const recipientArray = recipients
        .split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const response = await fetch(`${API_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          campaignName,
          subject,
          fromEmail,
          fromName,
          recipients: recipientArray,
          htmlContent,
          smtpPassword,
          userAcceptsResponsibility
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        // Réinitialiser le formulaire
        setCampaignName('');
        setSubject('');
        setRecipients('');
        setHtmlContent('');
        setSmtpPassword('');
        setUserAcceptsResponsibility(false);
      } else {
        alert(`❌ Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'envoi des emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-campaign">
      <button onClick={onBack} className="back-button">
        ← Retour
      </button>

      <div className="card">
        <h2>📧 Envoyer une campagne email avec tracking</h2>

        <div className="info-box">
          <h3>ℹ️ Comment ça fonctionne</h3>
          <ul>
            <li>✅ Tracking des <strong>ouvertures</strong> (qui a ouvert, quand, avec quel appareil)</li>
            <li>✅ Tracking des <strong>clics</strong> sur les liens</li>
            <li>✅ Statistiques détaillées par destinataire</li>
            <li>⚠️ Un footer sera automatiquement ajouté pour informer du tracking</li>
            <li>⚠️ Vous êtes <strong>responsable</strong> des données collectées (RGPD)</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nom de la campagne *</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Newsletter Janvier 2025"
                required
              />
            </div>

            <div className="form-group">
              <label>Sujet de l'email *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Nos nouveautés ce mois-ci!"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Votre email (expéditeur) *</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="votre.email@gmail.com"
                required
              />
              <small>Utilisez un email Gmail (ou configurez votre SMTP)</small>
            </div>

            <div className="form-group">
              <label>Nom de l'expéditeur</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Votre Nom ou Entreprise"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mot de passe d'application Gmail *</label>
            <input
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder="Mot de passe d'application (16 caractères)"
              required
            />
            <small>
              <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer">
                Comment créer un mot de passe d'application Gmail?
              </a>
            </small>
          </div>

          <div className="form-group">
            <label>Destinataires (un par ligne) *</label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="destinataire1@example.com&#10;destinataire2@example.com&#10;destinataire3@example.com"
              rows="6"
              required
            />
            <small>{recipients.split('\n').filter(e => e.trim()).length} destinataire(s)</small>
          </div>

          <div className="form-group">
            <label>Contenu HTML de l'email *</label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<h1>Bonjour!</h1><p>Voici notre newsletter...</p><a href='https://example.com'>Visitez notre site</a>"
              rows="10"
              required
            />
            <small>Vous pouvez utiliser du HTML. Les liens seront automatiquement trackés.</small>
          </div>

          <button type="submit" className="btn-primary btn-large" disabled={loading}>
            {loading ? 'Envoi en cours...' : '📤 Envoyer la campagne'}
          </button>
        </form>
      </div>

      {/* Modal de confirmation et responsabilité */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Confirmation et Responsabilité</h2>

            <div className="warning-box">
              <h3>🔒 Responsabilité du tracking</h3>
              <p>
                Vous êtes sur le point d'envoyer <strong>{recipients.split('\n').filter(e => e.trim()).length} email(s)</strong> avec tracking intégré.
              </p>

              <h4>📊 Ce qui sera tracké automatiquement:</h4>
              <ul>
                <li>✅ Ouvertures d'emails (date, heure, appareil, localisation)</li>
                <li>✅ Clics sur les liens (quel lien, quand, depuis où)</li>
                <li>✅ Adresse IP et informations techniques</li>
              </ul>

              <h4>⚖️ Vos responsabilités légales (RGPD):</h4>
              <ul>
                <li>🔴 <strong>VOUS êtes responsable</strong> de la collecte et du traitement de ces données</li>
                <li>🔴 <strong>VOUS devez</strong> avoir le consentement des destinataires</li>
                <li>🔴 <strong>VOUS devez</strong> respecter le RGPD et les lois sur la protection des données</li>
                <li>🔴 <strong>VOUS devez</strong> permettre aux destinataires d'accéder/supprimer leurs données</li>
              </ul>

              <h4>📝 Footer automatique:</h4>
              <p>
                Un footer sera automatiquement ajouté à chaque email pour informer les destinataires
                du tracking et de leurs droits RGPD. Ce footer indique clairement que <strong>VOUS
                (l'expéditeur) êtes responsable</strong> de la collecte et du traitement des données.
              </p>

              <div className="consent-checkbox">
                <input
                  type="checkbox"
                  id="acceptResponsibility"
                  checked={userAcceptsResponsibility}
                  onChange={(e) => setUserAcceptsResponsibility(e.target.checked)}
                />
                <label htmlFor="acceptResponsibility">
                  <strong>Je comprends et j'accepte d'être entièrement responsable du tracking
                  des données des destinataires. Je m'engage à respecter le RGPD et toutes
                  les lois applicables en matière de protection des données.</strong>
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmSend}
                className="btn-primary"
                disabled={!userAcceptsResponsibility}
              >
                {userAcceptsResponsibility ? '✅ Confirmer et envoyer' : '❌ Veuillez accepter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailCampaign;
