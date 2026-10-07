import React, { useState, useEffect } from 'react';

export default function RegionalSupplyTrackerView({ state, district, mandal, village, t }) {
  const [supplyData, setSupplyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHarvestMonth, setSelectedHarvestMonth] = useState(6); // June default
  const [mandalFilter, setMandalFilter] = useState(mandal || '');

  const fetchSupplyData = async () => {
    setLoading(true);
    try {
      let url = `/api/v2/regional-supply?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&harvest_month=${selectedHarvestMonth}`;
      if (mandalFilter) {
        url += `&mandal=${encodeURIComponent(mandalFilter)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSupplyData(data.supply_aggregates || []);
      }
    } catch (err) {
      console.error("Failed to fetch regional supply data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplyData();
  }, [state, district, selectedHarvestMonth, mandalFilter]);

  // Find max acreage for scale in SVG chart
  const maxAcreage = Math.max(...supplyData.map(d => d.total_planned_acreage), 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Controls & Privacy Notice */}
      <div className="card" style={{ background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
          <div>
            <h2 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>
              📊 Regional Crop Supply Tracker
            </h2>
            <p style={{ color: '#666', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
              Aggregated farmer crop plans and estimated harvest volume in <strong>{district}</strong>
            </p>
          </div>

          <div style={{
            background: '#E8F5E9',
            border: '1px solid #A5D6A7',
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            fontSize: '0.82rem',
            color: '#1B5E20',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: '600'
          }}>
            🔒 Privacy Shield Active: Individual farmer details hidden. Group size threshold &ge; 5.
          </div>
        </div>

        {/* Filter Row */}
        <div className="form-row">
          <div className="form-group">
            <label>Filter Harvest Month</label>
            <select value={selectedHarvestMonth} onChange={(e) => setSelectedHarvestMonth(Number(e.target.value))}>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          <div className="form-group">
            <label>Filter Mandal (Optional)</label>
            <input 
              type="text" 
              value={mandalFilter} 
              onChange={(e) => setMandalFilter(e.target.value)} 
              placeholder="e.g. Tenali, Niphad..."
            />
          </div>
        </div>
      </div>

      {/* Visual Chart Card */}
      <div className="card" style={{ background: '#FFF' }}>
        <h3 style={{ color: 'var(--primary-color)', fontSize: '1.1rem', marginBottom: '1.2rem' }}>
          📈 Planned Acreage Distribution by Crop ({district})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loader" style={{ margin: '0 auto 1rem auto' }}></div>
            <p>Loading regional supply metrics...</p>
          </div>
        ) : supplyData.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No registered crop plans found for this filter.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {supplyData.map((item, idx) => {
              const barWidthPct = Math.min(100, Math.round((item.total_planned_acreage / maxAcreage) * 100));
              const thresholdWidthPct = Math.min(100, Math.round((item.target_acreage_threshold / maxAcreage) * 100));

              const isOversupplied = item.risk_level === 'Oversupply Risk';
              const barColor = isOversupplied ? '#D32F2F' : item.risk_level === 'High Supply' ? '#F57C00' : '#2E7D32';

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.92rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ color: '#1B5E20' }}>{item.crop_name}</strong>
                      <span style={{
                        background: isOversupplied ? '#FFEBEE' : '#E8F5E9',
                        color: barColor,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {item.risk_level} ({item.supply_ratio}x Demand)
                      </span>
                    </div>
                    <span style={{ color: '#555', fontSize: '0.85rem' }}>
                      {item.display_farmer_count} Farmers | <strong>{item.total_planned_acreage} Acres</strong> | ~{item.estimated_harvest_quintals.toLocaleString()} Quintals
                    </span>
                  </div>

                  {/* SVG Bar Representation */}
                  <div style={{ position: 'relative', height: '24px', background: '#F0F0F0', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${barWidthPct}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${barColor} 0%, ${barColor}CC 100%)`,
                      borderRadius: '12px',
                      transition: 'width 0.6s ease'
                    }}></div>

                    {/* Target absorption marker line */}
                    <div style={{
                      position: 'absolute',
                      left: `${thresholdWidthPct}%`,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: '#000',
                      zIndex: 2
                    }} title={`District Target Absorption Limit: ${item.target_acreage_threshold} Acres`}>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
        {supplyData.map((item, idx) => (
          <div key={idx} className="card" style={{ background: '#FFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1B5E20' }}>{item.crop_name}</h4>
                <span className={`badge ${item.risk_class || 'risk-balanced'}`}>
                  {item.risk_level}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#555', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Registered Farmers:</span>
                  <strong>{item.display_farmer_count}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Planned Acreage:</span>
                  <strong>{item.total_planned_acreage} Acres</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Est. Harvest Output:</span>
                  <strong>~{item.estimated_harvest_quintals.toLocaleString()} Quintals</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>District Absorption Target:</span>
                  <span>{item.target_acreage_threshold} Acres</span>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '1rem',
              paddingTop: '0.8rem',
              borderTop: '1px solid #EEE',
              fontSize: '0.78rem',
              color: item.is_privacy_protected ? '#D32F2F' : '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <span>ℹ️ {item.privacy_note}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
