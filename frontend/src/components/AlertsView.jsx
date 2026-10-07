import React, { useState, useEffect } from 'react';

export default function AlertsView({ state, district, t }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/alerts?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [state, district]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Card */}
      <div className="card" style={{ background: '#FFF' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: '0 0 0.4rem 0', fontSize: '1.4rem', fontWeight: '700' }}>
          🔔 Regional Supply Risk Alerts & AI Advisory
        </h2>
        <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
          Real-time price trend alerts, oversupply warnings, and optimal sowing window recommendations for <strong>{district}, {state}</strong>.
        </p>
      </div>

      {/* Risk Level Color Legend */}
      <div className="card" style={{ background: '#FFF', padding: '1rem' }}>
        <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.9rem', color: '#555' }}>Supply Risk Level Classification Legend:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
          
          <span style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', color: '#1B5E20', padding: '0.3rem 0.7rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🟢 Low Supply Risk (Supply &lt; 70% Demand)
          </span>

          <span style={{ background: '#E1F5FE', border: '1px solid #81D4FA', color: '#0288D1', padding: '0.3rem 0.7rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🔵 Balanced Supply (70% - 110% Demand)
          </span>

          <span style={{ background: '#FFF3E0', border: '1px solid #FFE0B2', color: '#E65100', padding: '0.3rem 0.7rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🟠 High Supply (110% - 130% Demand)
          </span>

          <span style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '0.3rem 0.7rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🔴 Oversupply Risk (&gt; 130% Demand)
          </span>

        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loader" style={{ margin: '0 auto 1rem auto' }}></div>
          <p>Fetching active regional alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#666' }}>
          <p>No high-risk supply alerts active for {district}. Regional market supply is currently balanced.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.map((alert, aIdx) => {
            const isOversupply = alert.type === 'oversupply' || alert.risk_level === 'High' || alert.risk_level === 'Severe';
            const alertColor = isOversupply ? '#D32F2F' : alert.type === 'price_trend' ? '#E65100' : '#2E7D32';
            const alertBg = isOversupply ? '#FFEBEE' : alert.type === 'price_trend' ? '#FFF3E0' : '#E8F5E9';
            const alertBorder = isOversupply ? '#FFCDD2' : alert.type === 'price_trend' ? '#FFE0B2' : '#A5D6A7';

            return (
              <div key={aIdx} className="card" style={{
                background: alertBg,
                borderLeft: `6px solid ${alertColor}`,
                borderTop: `1px solid ${alertBorder}`,
                borderRight: `1px solid ${alertBorder}`,
                borderBottom: `1px solid ${alertBorder}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>
                      {isOversupply ? '⚠️' : alert.type === 'price_trend' ? '📈' : '🌱'}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: alertColor }}>
                      {alert.title}
                    </h3>
                  </div>

                  <span style={{
                    background: '#FFF',
                    color: alertColor,
                    border: `1px solid ${alertBorder}`,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    Risk Level: {alert.risk_level}
                  </span>
                </div>

                <p style={{ color: '#333', fontSize: '0.95rem', lineHeight: '1.5', margin: '0.4rem 0' }}>
                  {alert.message}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#666', marginTop: '0.8rem', borderTop: `1px solid ${alertBorder}`, paddingTop: '0.4rem' }}>
                  <span>Target Crop: <strong>{alert.crop_name || 'All Regional Crops'}</strong></span>
                  <span>Issued: {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : 'Active'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
