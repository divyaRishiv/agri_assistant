import { useState } from 'react';
import './index.css';

const statesAndDistricts = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "SAS Nagar", "SBS Nagar", "Tarn Taran"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Prayagraj", "Varanasi", "Lucknow", "Kanpur", "Gorakhpur", "Meerut"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Davangere", "Ballari"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Alwar"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Rewa"]
};

const soilTypes = ["Alluvial Soil", "Black Soil", "Red Soil", "Laterite Soil", "Desert Soil", "Mountain Soil"];
const seasons = ["Kharif", "Rabi", "Zaid"];

function App() {
  const [formData, setFormData] = useState({
    state: '',
    district: '',
    soil_type: '',
    season: '',
    irrigation: 'Medium',
    water_source: '3',
    farm_size: '',
    previous_crop: ''
  });

  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(null);

  const availableDistricts = formData.state ? statesAndDistricts[formData.state] || [] : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'state') {
      setFormData({ ...formData, state: value, district: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRecommendation(null);

    // Map the water source scale to text
    const waterSourceScale = {
      "1": "Very Low",
      "2": "Low",
      "3": "Medium",
      "4": "High",
      "5": "Very High"
    };

    const payload = {
      ...formData,
      water_source: waterSourceScale[formData.water_source]
    };

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendation(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header>
        <h1>Kisan Mitra AI</h1>
        <p>Smart Agriculture Assistant for Indian Farmers</p>
      </header>

      <div className="container">
        <form className="card" onSubmit={handleSubmit}>
          
          <div className="form-row">
            <div className="form-group">
              <label>State</label>
              <select name="state" value={formData.state} onChange={handleChange} required>
                <option value="">Select State</option>
                {Object.keys(statesAndDistricts).map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>District</label>
              <select name="district" value={formData.district} onChange={handleChange} required disabled={!formData.state}>
                <option value="">Select District</option>
                {availableDistricts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Soil Type</label>
              <select name="soil_type" value={formData.soil_type} onChange={handleChange} required>
                <option value="">Select Soil Type</option>
                {soilTypes.map(soil => (
                  <option key={soil} value={soil}>{soil}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cropping Season</label>
              <select name="season" value={formData.season} onChange={handleChange} required>
                <option value="">Select Season</option>
                {seasons.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Irrigation Availability Level</label>
            <select name="irrigation" value={formData.irrigation} onChange={handleChange} required>
              <option value="Rain-fed">Rain-fed</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-group">
            <label>Water Source Availability (Low to High)</label>
            <input 
              type="range" 
              name="water_source" 
              min="1" max="5" 
              value={formData.water_source} 
              onChange={handleChange} 
            />
            <div className="range-labels">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Farm Land Size (Acres) - Optional</label>
              <input 
                type="number" 
                name="farm_size" 
                value={formData.farm_size} 
                onChange={handleChange} 
                placeholder="e.g. 5"
              />
            </div>

            <div className="form-group">
              <label>Previous Crop - Optional</label>
              <input 
                type="text" 
                name="previous_crop" 
                value={formData.previous_crop} 
                onChange={handleChange} 
                placeholder="e.g. Wheat"
              />
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Analyzing...' : 'Get Recommendations'}
          </button>
        </form>

        <div className="results-card" style={{ justifyContent: recommendation ? 'flex-start' : 'center' }}>
          {loading ? (
            <div>
              <div className="loader"></div>
              <p style={{ textAlign: 'center' }}>Our AI is analyzing the best crops for your farm...</p>
            </div>
          ) : recommendation ? (
            <div className="recommendations-container">
              <div className="section-title">
                <h2>Seasonal Suitability</h2>
                <div className="suitability-badge-overall" style={{
                  backgroundColor: (recommendation.seasonal_analysis?.suitability_score || 0) >= 80 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 179, 0, 0.2)',
                  color: (recommendation.seasonal_analysis?.suitability_score || 0) >= 80 ? '#81C784' : '#FFB300',
                  border: `1px solid ${(recommendation.seasonal_analysis?.suitability_score || 0) >= 80 ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 179, 0, 0.3)'}`
                }}>
                  Score: {recommendation.seasonal_analysis?.suitability_score || 'N/A'}%
                </div>
              </div>
              <p className="summary-text">{recommendation.seasonal_analysis?.summary}</p>
              
              {recommendation.seasonal_analysis?.general_advice && (
                <div className="advice-box">
                  <strong>General Advice:</strong> {recommendation.seasonal_analysis.general_advice}
                </div>
              )}

              {recommendation.critical_warnings && recommendation.critical_warnings.length > 0 && (
                <div className="warnings-section">
                  <h3>⚠️ Critical Alerts</h3>
                  <ul>
                    {recommendation.critical_warnings.map((warning, index) => (
                      <li key={index} className="warning-item">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="section-title" style={{ marginTop: '1rem' }}>
                <h2>Recommended Crops</h2>
              </div>
              <div className="crops-grid">
                {recommendation.recommended_crops?.map((crop, index) => (
                  <div key={index} className="crop-card">
                    <div className="crop-card-header">
                      <h3>{crop.name}</h3>
                      <div className="crop-score" style={{
                        borderColor: (crop.suitability_score || 0) >= 80 ? '#81C784' : '#FFB300'
                      }}>
                        {crop.suitability_score}%
                      </div>
                    </div>
                    
                    <div className="crop-badges">
                      <span className={`badge water-${crop.water_need_category?.toLowerCase() || 'medium'}`}>
                        💧 {crop.water_need_category || 'Medium'} Water
                      </span>
                      <span className={`badge demand-${crop.market_demand?.toLowerCase() || 'medium'}`}>
                        📈 {crop.market_demand || 'Medium'} Demand
                      </span>
                      {crop.growing_period && (
                        <span className="badge period">
                          📅 {crop.growing_period}
                        </span>
                      )}
                    </div>

                    <div className="crop-details">
                      {crop.why_recommended && <p><strong>Why Recommended:</strong> {crop.why_recommended}</p>}
                      {crop.water_suitability_explanation && <p><strong>Water Management:</strong> {crop.water_suitability_explanation}</p>}
                      {crop.fertilizer_recommendation && <p><strong>Fertilizer Plan:</strong> {crop.fertilizer_recommendation}</p>}
                      {crop.expected_yield && <p><strong>Expected Yield:</strong> <span className="yield-highlight">{crop.expected_yield}</span></p>}
                    </div>
                  </div>
                ))}
              </div>

              {recommendation.unsuitable_crops && recommendation.unsuitable_crops.length > 0 && (
                <div className="unsuitable-section">
                  <h2>❌ High Risk / Unsuitable Crops</h2>
                  <div className="unsuitable-grid">
                    {recommendation.unsuitable_crops.map((crop, index) => (
                      <div key={index} className="unsuitable-card">
                        <h4>{crop.name}</h4>
                        <p>{crop.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
            <div style={{ color: '#FFCDD2', textAlign: 'center' }}>
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          ) : (
            <div className="results-placeholder">
              <p>Enter your farm details on the left to receive AI-powered crop recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
