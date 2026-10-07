import React, { useState, useEffect } from 'react';

export default function WhatIfSimulatorView({ state, district, mandal, t }) {
  const [selectedCrop, setSelectedCrop] = useState('Tomato');
  const [additionalFarmers, setAdditionalFarmers] = useState(25);
  const [additionalAcres, setAdditionalAcres] = useState(50.0);
  const [targetHarvestMonth, setTargetHarvestMonth] = useState(6);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v2/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state,
          district,
          mandal: mandal || 'Tenali',
          selected_crop: selectedCrop,
          additional_farmers: Number(additionalFarmers),
          additional_acres: Number(additionalAcres),
          target_harvest_month: Number(targetHarvestMonth)
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSimulation(data);
      }
    } catch (err) {
      console.error("Failed to run What-If simulation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [selectedCrop, additionalFarmers, additionalAcres, targetHarvestMonth, state, district]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Simulation Controls Card */}
      <div className="card" style={{ background: '#FFF' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: '0 0 0.4rem 0', fontSize: '1.4rem', fontWeight: '700' }}>
          💡 What-If Crop Planning & Profit Calculator
        </h2>
        <p style={{ color: '#666', margin: '0 0 1.2rem 0', fontSize: '0.9rem' }}>
          Simulate how regional farmer decisions and land allocation affect market prices, oversupply risk, and your net profit.
        </p>

        <div className="form-row">
          <div className="form-group">
            <label>Crop Choice to Simulate</label>
            <select value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
              <option value="Tomato">Tomato</option>
              <option value="Onion">Onion</option>
              <option value="Chilli">Chilli</option>
              <option value="Groundnut">Groundnut</option>
              <option value="Paddy (Rice)">Paddy (Rice)</option>
              <option value="Cotton">Cotton</option>
              <option value="Wheat">Wheat</option>
              <option value="Maize (Corn)">Maize (Corn)</option>
              <option value="Soyabean">Soyabean</option>
              <option value="Potato">Potato</option>
            </select>
          </div>

          <div className="form-group">
            <label>Target Harvest Month</label>
            <select value={targetHarvestMonth} onChange={(e) => setTargetHarvestMonth(Number(e.target.value))}>
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
        </div>

        {/* Sliders for Scenario Simulation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.8rem' }}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>Additional Farmers Planning {selectedCrop} in Region:</label>
              <strong style={{ color: 'var(--primary-color)' }}>{additionalFarmers} Farmers</strong>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={additionalFarmers} 
              onChange={(e) => setAdditionalFarmers(Number(e.target.value))} 
            />
            <div className="range-labels">
              <span>0 (Baseline)</span>
              <span>50 Farmers</span>
              <span>100 Farmers</span>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>Additional Land Allocation (Acres):</label>
              <strong style={{ color: 'var(--primary-color)' }}>{additionalAcres} Acres</strong>
            </div>
            <input 
              type="range" 
              min="5" 
              max="300" 
              step="5"
              value={additionalAcres} 
              onChange={(e) => setAdditionalAcres(Number(e.target.value))} 
            />
            <div className="range-labels">
              <span>5 Acres</span>
              <span>150 Acres</span>
              <span>300 Acres</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Results Comparison */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div className="loader" style={{ margin: '0 auto 1rem auto' }}></div>
          <p>Calculating market elasticity and price compression...</p>
        </div>
      ) : simulation ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Narrative Banner */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)',
            borderLeft: '6px solid #1976D2'
          }}>
            <h3 style={{ color: '#0D47A1', margin: '0 0 0.4rem 0', fontSize: '1.15rem' }}>
              📊 Scenario Impact Summary
            </h3>
            <p style={{ color: '#1A237E', margin: 0, fontSize: '0.98rem', lineHeight: '1.5' }}>
              {simulation.impact_summary}
            </p>
          </div>

          {/* Baseline vs Simulated Comparison Table */}
          <div className="card" style={{ background: '#FFF' }}>
            <h3 style={{ color: 'var(--primary-color)', fontSize: '1.1rem', marginBottom: '1rem' }}>
              ⚖️ Baseline vs Simulated Market Impact ({simulation.simulation_parameters.region})
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
                <thead>
                  <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #DDD' }}>
                    <th style={{ padding: '0.8rem' }}>Market Metric</th>
                    <th style={{ padding: '0.8rem', color: '#555' }}>Current Baseline</th>
                    <th style={{ padding: '0.8rem', color: 'var(--primary-color)' }}>Simulated Scenario (+{additionalFarmers} Farmers)</th>
                    <th style={{ padding: '0.8rem' }}>Difference Impact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #EEE' }}>
                    <td style={{ padding: '0.8rem', fontWeight: '600' }}>Regional Planned Acreage</td>
                    <td style={{ padding: '0.8rem' }}>{simulation.baseline.planned_acreage} Acres</td>
                    <td style={{ padding: '0.8rem', fontWeight: '700' }}>{simulation.simulated.planned_acreage} Acres</td>
                    <td style={{ padding: '0.8rem', color: '#E65100', fontWeight: '600' }}>+{additionalAcres} Acres</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #EEE' }}>
                    <td style={{ padding: '0.8rem', fontWeight: '600' }}>Supply / Demand Ratio</td>
                    <td style={{ padding: '0.8rem' }}>{simulation.baseline.supply_ratio}x Target</td>
                    <td style={{ padding: '0.8rem', fontWeight: '700' }}>{simulation.simulated.supply_ratio}x Target</td>
                    <td style={{ padding: '0.8rem' }}>
                      <span className={`badge ${simulation.simulated.supply_ratio > 1.25 ? 'risk-high' : 'risk-balanced'}`}>
                        {simulation.simulated.new_risk_level}
                      </span>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #EEE' }}>
                    <td style={{ padding: '0.8rem', fontWeight: '600' }}>Projected Selling Price</td>
                    <td style={{ padding: '0.8rem' }}>₹{simulation.baseline.modal_price.toLocaleString()} / quintal</td>
                    <td style={{ padding: '0.8rem', fontWeight: '700', color: simulation.simulated.projected_price < simulation.baseline.modal_price ? '#D32F2F' : '#2E7D32' }}>
                      ₹{simulation.simulated.projected_price.toLocaleString()} / quintal
                    </td>
                    <td style={{ padding: '0.8rem', color: simulation.simulated.projected_price_compression_pct > 0 ? '#D32F2F' : '#2E7D32' }}>
                      {simulation.simulated.projected_price_compression_pct > 0 ? `-${simulation.simulated.projected_price_compression_pct}% Compression` : 'Stable'}
                    </td>
                  </tr>

                  <tr>
                    <td style={{ padding: '0.8rem', fontWeight: '600' }}>Est. Gross Profit / Acre</td>
                    <td style={{ padding: '0.8rem' }}>₹{simulation.baseline.profit_per_acre.toLocaleString()}</td>
                    <td style={{ padding: '0.8rem', fontWeight: '700', fontSize: '1rem', color: simulation.simulated.projected_profit_per_acre > 0 ? '#1B5E20' : '#D32F2F' }}>
                      ₹{simulation.simulated.projected_profit_per_acre.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.8rem', fontWeight: '700', color: simulation.simulated.profit_difference_per_acre < 0 ? '#D32F2F' : '#2E7D32' }}>
                      ₹{simulation.simulated.profit_difference_per_acre.toLocaleString()} / acre
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommended Alternatives Matrix */}
          {simulation.recommended_alternatives && simulation.recommended_alternatives.length > 0 && (
            <div className="card" style={{ background: '#FFF' }}>
              <h3 style={{ color: 'var(--primary-color)', fontSize: '1.1rem', marginBottom: '1rem' }}>
                🌟 Compare Alternative Crops for Better Profit & Lower Risk
              </h3>
              <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1rem' }}>
                Instead of oversupplied {selectedCrop}, evaluate these crops for your land allocation:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {simulation.recommended_alternatives.map((alt, aIdx) => (
                  <div key={aIdx} style={{
                    background: '#F9FBE7',
                    border: '1px solid #DCE775',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <strong style={{ fontSize: '1.1rem', color: '#1B5E20' }}>{alt.name}</strong>
                        <span style={{ fontWeight: '700', color: '#2E7D32' }}>{alt.suitability_score}% Match</span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#444', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.6rem' }}>
                        <div>Forecast Price: <strong>{alt.forecast_price_range}</strong></div>
                        <div>Est. Profit / Acre: <strong style={{ color: '#1B5E20' }}>₹{alt.estimated_profit_per_acre.toLocaleString()}</strong></div>
                        <div>Regional Supply: <span className="badge risk-balanced">{alt.supply_risk_level}</span></div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.8rem', borderTop: '1px solid #E0E0E0', paddingTop: '0.4rem' }}>
                      💡 {alt.recommendation_explanation.slice(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : null}

    </div>
  );
}
