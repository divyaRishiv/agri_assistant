import React from 'react';

export default function CropRecommendationsView({
  recommendations,
  loading,
  error,
  formData,
  onFormChange,
  onSubmit,
  t
}) {
  return (
    <div className="recommendations-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Search / Filter Control Form */}
      <form className="card recommendation-filter-card" onSubmit={onSubmit} style={{ background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <h2 style={{ color: 'var(--primary-color)', fontSize: '1.4rem', fontWeight: '700' }}>
              🎯 AI Crop Selection Parameters
            </h2>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Input your farm conditions to analyze profitability, regional supply, and risk.
            </p>
          </div>
          <span className="demo-badge" style={{
            background: 'rgba(255, 179, 0, 0.15)',
            color: '#B78103',
            padding: '0.3rem 0.8rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            border: '1px solid rgba(255, 179, 0, 0.3)'
          }}>
            ⚡ AI Engine Active
          </span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.soil_type}</label>
            <select name="soil_type" value={formData.soil_type} onChange={onFormChange} required>
              <option value="Black Soil">Black Soil</option>
              <option value="Alluvial Soil">Alluvial Soil</option>
              <option value="Red Soil">Red Soil</option>
              <option value="Laterite Soil">Laterite Soil</option>
              <option value="Desert Soil">Desert Soil</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t.water_availability}</label>
            <select name="water_availability" value={formData.water_availability} onChange={onFormChange} required>
              <option value="Low">Low (Rain-fed)</option>
              <option value="Medium">Medium (Borewell/Canal)</option>
              <option value="High">High (Perennial Source)</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.select_season}</label>
            <select name="season" value={formData.season} onChange={onFormChange} required>
              <option value="Kharif">Kharif (Monsoon)</option>
              <option value="Rabi">Rabi (Winter)</option>
              <option value="Zaid">Zaid (Summer)</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t.select_harvest_month}</label>
            <select name="harvest_month" value={formData.harvest_month} onChange={onFormChange} required>
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

        <div className="form-row">
          <div className="form-group">
            <label>{t.farm_size}</label>
            <input 
              type="number" 
              name="farm_size" 
              value={formData.farm_size} 
              onChange={onFormChange} 
              placeholder="e.g. 5"
              step="0.5"
              min="0.5"
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn-submit" disabled={loading} style={{ width: '100%', marginTop: 0 }}>
              {loading ? 'Analyzing Market & Regional Data...' : '🔍 Analyze & Recommend Crops'}
            </button>
          </div>
        </div>
      </form>

      {/* AI Insights & Warning Banner if present */}
      {recommendations && recommendations.ai_insights && recommendations.ai_insights.length > 0 && (
        <div className="ai-insight-banner" style={{
          background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)',
          borderLeft: '6px solid #F57C00',
          padding: '1.2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ color: '#E65100', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            💡 AI Market Supply Insight ({formData.district})
          </h3>
          {recommendations.ai_insights.map((insight, idx) => (
            <p key={idx} style={{ color: '#4E342E', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
              {insight}
            </p>
          ))}
        </div>
      )}

      {/* Recommendations Output Container */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loader" style={{ margin: '0 auto 1rem auto' }}></div>
          <h3 style={{ color: 'var(--primary-color)' }}>Running Multi-Factor Recommendation Algorithm...</h3>
          <p style={{ color: '#666' }}>Analyzing historical market prices, regional planned acreage, harvest month demand, and cultivation costs.</p>
        </div>
      ) : recommendations ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '700' }}>
              🏆 Top 5 Recommended Crops for {formData.district}
            </h2>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>
              Evaluated {recommendations.total_crops_evaluated} crops across suitability & profitability
            </span>
          </div>

          {/* Grid of Top Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {recommendations.top_recommendations.map((crop, index) => {
              const riskColor = 
                crop.supply_risk_level === 'Oversupply Risk' ? '#D32F2F' :
                crop.supply_risk_level === 'High Supply' ? '#E65100' :
                crop.supply_risk_level === 'Balanced Supply' ? '#2E7D32' : '#0288D1';
              
              const riskBg = 
                crop.supply_risk_level === 'Oversupply Risk' ? '#FFEBEE' :
                crop.supply_risk_level === 'High Supply' ? '#FFF3E0' :
                crop.supply_risk_level === 'Balanced Supply' ? '#E8F5E9' : '#E1F5FE';

              return (
                <div key={index} className="card crop-recommendation-card" style={{
                  borderTop: `6px solid ${riskColor}`,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  background: '#FFF'
                }}>
                  <div>
                    {/* Header: Rank + Crop Name + Score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{
                          background: 'var(--primary-color)',
                          color: '#FFF',
                          fontWeight: '700',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem'
                        }}>
                          #{index + 1}
                        </span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1B5E20' }}>{crop.name}</h3>
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>{crop.category} • {crop.growing_period}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: '800',
                          color: crop.suitability_score >= 85 ? '#2E7D32' : '#F57C00'
                        }}>
                          {crop.suitability_score}%
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#777' }}>Suitability</span>
                      </div>
                    </div>

                    {/* Badges: Risk Level + Demand Outlook + Farmers Count */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                      <span style={{
                        background: riskBg,
                        color: riskColor,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        {crop.supply_risk_level === 'Oversupply Risk' ? '⚠️' : '🛡️'} {crop.supply_risk_level}
                      </span>

                      <span style={{
                        background: '#F5F5F5',
                        color: '#333',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        👨‍🌾 {crop.farmers_growing_count} Farmers ({crop.regional_planned_acreage} Acres)
                      </span>

                      <span style={{
                        background: '#E8EAF6',
                        color: '#3F51B5',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        💧 {crop.water_need_category} Water
                      </span>
                    </div>

                    {/* Financial Metrics Summary Box */}
                    <div style={{
                      background: 'linear-gradient(135deg, #F1F8E9, #E8F5E9)',
                      padding: '1rem',
                      borderRadius: '10px',
                      marginBottom: '1rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.8rem'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#555', display: 'block' }}>Expected Harvest Price</span>
                        <strong style={{ fontSize: '1rem', color: '#2E7D32' }}>{crop.forecast_price_range}</strong>
                        {crop.price_drop_warning && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#D32F2F', marginTop: '0.1rem' }}>
                            {crop.price_drop_warning}
                          </span>
                        )}
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#555', display: 'block' }}>Est. Net Profit / Acre</span>
                        <strong style={{ fontSize: '1.1rem', color: crop.estimated_profit_per_acre > 0 ? '#1B5E20' : '#D32F2F' }}>
                          ₹{crop.estimated_profit_per_acre.toLocaleString()}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#555', display: 'block' }}>Expected Yield / Acre</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>{crop.expected_yield}</span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#555', display: 'block' }}>Est. Cultivation Cost</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#666' }}>
                          ₹{crop.cultivation_cost_per_acre.toLocaleString()} / acre
                        </span>
                      </div>
                    </div>

                    {/* Scientific Rationale Explanation */}
                    <div style={{ fontSize: '0.88rem', color: '#444', lineHeight: '1.5' }}>
                      <strong>AI Recommendation Rationale:</strong>
                      <p style={{ margin: '0.3rem 0 0 0', color: '#555' }}>{crop.recommendation_explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unsuitable / High Risk Crops Section */}
          {recommendations.unsuitable_crops && recommendations.unsuitable_crops.length > 0 && (
            <div className="card" style={{ background: '#FFF5F5', border: '1px solid #FFCDD2', marginTop: '1rem' }}>
              <h3 style={{ color: '#C62828', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                ❌ High Risk / Unsuitable Crops for Current Parameters
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {recommendations.unsuitable_crops.map((uCrop, uIdx) => (
                  <div key={uIdx} style={{ background: '#FFF', padding: '0.8rem 1rem', borderRadius: '8px', borderLeft: '4px solid #D32F2F' }}>
                    <strong style={{ color: '#D32F2F', display: 'block', marginBottom: '0.2rem' }}>{uCrop.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#555' }}>{uCrop.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : error ? (
        <div className="card" style={{ background: '#FFEBEE', color: '#C62828', textAlign: 'center', padding: '2rem' }}>
          <h3>Recommendation Error</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p>Configure your state, district, soil type, and sowing season above to calculate AI crop recommendations.</p>
        </div>
      )}

    </div>
  );
}
