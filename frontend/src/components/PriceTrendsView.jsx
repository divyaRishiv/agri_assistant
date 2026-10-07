import React, { useState, useEffect } from 'react';

export default function PriceTrendsView({ state, district, t }) {
  const [cropName, setCropName] = useState('Tomato');
  const [targetMonth, setTargetMonth] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/price-forecast?crop_name=${encodeURIComponent(cropName)}&state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&target_month=${targetMonth}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch price forecast:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [cropName, state, district, targetMonth]);

  const historical = data?.historical_prices || [];
  const forecast = data?.forecast;

  // Max price for SVG scaling
  const maxPrice = Math.max(...historical.map(h => h.max_price), forecast?.forecast_max_price || 3000);
  const minPrice = Math.min(...historical.map(h => h.min_price), forecast?.forecast_min_price || 1000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Header Card */}
      <div className="card" style={{ background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
          <div>
            <h2 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>
              📈 Seasonal Price Trends & AI Forecast
            </h2>
            <p style={{ color: '#666', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
              Historical Mandi Trends vs Harvest Price Forecast for <strong>{cropName}</strong> in {district}
            </p>
          </div>

          {forecast && (
            <div style={{
              background: '#E1F5FE',
              color: '#0288D1',
              border: '1px solid #81D4FA',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '700'
            }}>
              🎯 Confidence Score: {forecast.confidence_level_pct}% ({forecast.confidence_label})
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="form-row">
          <div className="form-group">
            <label>Select Crop</label>
            <select value={cropName} onChange={(e) => setCropName(e.target.value)}>
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
              <option value="Mustard">Mustard</option>
            </select>
          </div>

          <div className="form-group">
            <label>Expected Harvest Month</label>
            <select value={targetMonth} onChange={(e) => setTargetMonth(Number(e.target.value))}>
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
        </div>
      </div>

      {/* Forecast & Seasonal Insight Highlight Box */}
      {forecast && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
          
          <div className="card" style={{ background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', border: '1px solid #A5D6A7' }}>
            <span style={{ fontSize: '0.85rem', color: '#2E7D32', fontWeight: '600' }}>FORECASTED SELLING PRICE RANGE</span>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1B5E20', margin: '0.4rem 0' }}>
              ₹{forecast.forecast_min_price.toLocaleString()} - ₹{forecast.forecast_max_price.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.9rem', color: '#333' }}>
              Expected Modal Price: <strong>₹{forecast.forecast_modal_price.toLocaleString()} / quintal</strong>
            </span>
          </div>

          <div className="card" style={{ background: '#FFF3E0', border: '1px solid #FFE0B2' }}>
            <span style={{ fontSize: '0.85rem', color: '#E65100', fontWeight: '600' }}>SEASONAL PATTERN INSIGHT</span>
            <p style={{ fontSize: '0.95rem', color: '#4E342E', margin: '0.4rem 0 0 0', lineHeight: '1.4' }}>
              {forecast.seasonal_insight}
            </p>
          </div>

        </div>
      )}

      {/* SVG Historical & Forecast Price Chart */}
      <div className="card" style={{ background: '#FFF' }}>
        <h3 style={{ color: 'var(--primary-color)', fontSize: '1.1rem', marginBottom: '1rem' }}>
          📊 Historical Mandi Price Trend vs Forecast Target ({cropName})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loader" style={{ margin: '0 auto' }}></div>
            <p>Loading price trend data...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
            <div style={{ minWidth: '600px', height: '220px', display: 'flex', alignItems: 'flex-end', gap: '8px', borderBottom: '2px solid #DDD', paddingBottom: '8px', position: 'relative' }}>
              
              {historical.slice(0, 12).map((item, idx) => {
                const range = maxPrice - minPrice || 1;
                const modalHeight = Math.max(20, Math.round(((item.modal_price - minPrice) / range) * 160));
                
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.7rem', color: '#444', fontWeight: '600' }}>₹{item.modal_price}</span>
                    <div 
                      style={{
                        width: '80%',
                        height: `${modalHeight}px`,
                        background: 'linear-gradient(180deg, var(--secondary-color) 0%, var(--primary-color) 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease'
                      }}
                      title={`Month ${item.month}/${item.year}: ₹${item.modal_price}/quintal`}
                    ></div>
                    <span style={{ fontSize: '0.7rem', color: '#666' }}>M{item.month}</span>
                  </div>
                );
              })}

              {/* Target Forecast Bar */}
              {forecast && (
                <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end', borderLeft: '2px dashed #F57C00', paddingLeft: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#E65100', fontWeight: '700' }}>₹{forecast.forecast_modal_price}</span>
                  <div 
                    style={{
                      width: '90%',
                      height: `${Math.max(20, Math.round(((forecast.forecast_modal_price - minPrice) / (maxPrice - minPrice || 1)) * 160))}px`,
                      background: 'linear-gradient(180deg, #FFB300 0%, #E65100 100%)',
                      borderRadius: '4px 4px 0 0',
                      boxShadow: '0 2px 8px rgba(230, 81, 0, 0.4)'
                    }}
                    title={`Forecast Target Month ${targetMonth}: ₹${forecast.forecast_modal_price}/quintal`}
                  ></div>
                  <span style={{ fontSize: '0.75rem', color: '#E65100', fontWeight: '700' }}>Forecast Target</span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Responsible Recommendation Disclaimer */}
        <div style={{ marginTop: '1.2rem', padding: '0.8rem', background: '#F5F5F5', borderRadius: '8px', fontSize: '0.82rem', color: '#666', lineHeight: '1.4' }}>
          <strong>⚠️ Price Forecast Advisory Disclaimer:</strong>
          <br />
          Price forecasts are calculated using historical mandi price trends, current registered crop plans, seasonal arrival cycles, and climate indicators. Selling prices are market-dependent and are <strong>never guaranteed</strong>. Use forecasts as advisory guidance alongside your farm financial planning.
        </div>
      </div>

    </div>
  );
}
