import { useState, useEffect, useRef } from 'react';
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
    email: '',
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

  // Chatbot State Variables
  const [currentView, setCurrentView] = useState('recommendation'); // 'recommendation' | 'chatbot'
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: "Welcome to Agri AI Assistant. Upload a crop image to detect possible diseases."
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedPreview, setAttachedPreview] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Mandi Prices State Variables
  const [mandiPrices, setMandiPrices] = useState([]);
  const [mandiLoading, setMandiLoading] = useState(false);
  const [mandiSearch, setMandiSearch] = useState('');
  const [selectedMandiState, setSelectedMandiState] = useState('');

  const messagesEndRef = useRef(null);

  const fetchMandiPrices = async (stateName) => {
    setMandiLoading(true);
    try {
      const url = stateName ? `/api/market-prices?state=${encodeURIComponent(stateName)}` : '/api/market-prices';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMandiPrices(data.prices || []);
      }
    } catch (err) {
      console.error("Error fetching mandi prices:", err);
    } finally {
      setMandiLoading(false);
    }
  };

  useEffect(() => {
    fetchMandiPrices(selectedMandiState);
  }, [selectedMandiState]);

  useEffect(() => {
    if (formData.state) {
      setSelectedMandiState(formData.state);
    }
  }, [formData.state]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentView === 'chatbot') {
      scrollToBottom();
    }
  }, [chatMessages, chatLoading, currentView]);

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

  // Chat handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
      setAttachedPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
  };

  const handleSendChat = async (e, customText = null) => {
    if (e) e.preventDefault();
    
    const textToSend = customText !== null ? customText : chatInput;
    if (!textToSend.trim() && !attachedFile) return;

    setChatLoading(true);
    
    // Optimistically add user message to history
    const localUserMsg = {
      role: 'user',
      content: textToSend,
      image_url: attachedPreview
    };

    setChatMessages(prev => [...prev, localUserMsg]);
    setChatInput('');
    
    const formDataPayload = new FormData();
    if (textToSend.trim()) {
      formDataPayload.append('message', textToSend);
    }
    if (attachedFile) {
      formDataPayload.append('image', attachedFile);
    }

    // Exclude first welcome message for context history
    const historyList = chatMessages
      .filter((_, idx) => idx > 0)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    formDataPayload.append('history', JSON.stringify(historyList));

    setAttachedFile(null);
    setAttachedPreview(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formDataPayload
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with Agri AI Chatbot');
      }

      const data = await response.json();
      
      const localAiMsg = {
        role: 'assistant',
        content: data.final_answer,
        image_url: data.image_url,
        react_steps: data.react_steps || []
      };

      setChatMessages(prev => [...prev, localAiMsg]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Please try again.`
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div>
      {currentView === 'recommendation' ? (
        <>
          <header>
            <h1>Kisan Mitra AI</h1>
            <p>Smart Agriculture Assistant for Indian Farmers</p>
          </header>

          <div className="container">
            <form className="card" onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="farmer@example.com"
                  required
                />
              </div>

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
                  {recommendation.pdf_url && (
                    <div className="pdf-delivery-banner" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontWeight: '600', color: '#FFF' }}>📧 Report Sent Successfully!</span>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>A PDF copy has been sent to <strong>{formData.email}</strong>.</span>
                      </div>
                      <a 
                        href={recommendation.pdf_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-download-pdf"
                        style={{
                          background: 'var(--accent-color)',
                          color: '#000',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        📥 Download PDF
                      </a>
                    </div>
                  )}
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

            {/* Live Mandi Market Prices Box */}
            <div className="card mandi-card" style={{ gridColumn: '1 / -1' }}>
              <div className="mandi-header">
                <div className="mandi-title-container">
                  <span className="mandi-icon">🌾</span>
                  <div>
                    <h2 className="mandi-title" style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.6rem', fontWeight: '700' }}>Live Mandi Market Prices</h2>
                    <p className="mandi-subtitle" style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', fontSize: '0.95rem' }}>Real-time government market rates across Indian states</p>
                  </div>
                </div>
                <button 
                  type="button"
                  className={`btn-refresh ${mandiLoading ? 'spinning' : ''}`}
                  onClick={() => fetchMandiPrices(selectedMandiState)}
                  disabled={mandiLoading}
                  title="Refresh live prices"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                </button>
              </div>

              <div className="mandi-filters">
                <div className="filter-group">
                  <label className="filter-label">Filter by State</label>
                  <select 
                    value={selectedMandiState} 
                    onChange={(e) => setSelectedMandiState(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All India (Popular Mandis)</option>
                    {Object.keys(statesAndDistricts).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Search Crop or Mandi</label>
                  <input 
                    type="text"
                    value={mandiSearch}
                    onChange={(e) => setMandiSearch(e.target.value)}
                    placeholder="e.g. Wheat, Cotton, Pune..."
                    className="filter-input"
                  />
                </div>
              </div>

              {mandiLoading ? (
                <div className="mandi-loader-container">
                  <div className="loader" style={{ borderColor: 'rgba(46, 125, 50, 0.2)', borderTopColor: 'var(--primary-color)' }}></div>
                  <p style={{ textAlign: 'center', color: 'var(--primary-color)', fontWeight: '500' }}>Fetching latest mandi rates...</p>
                </div>
              ) : (
                <div className="mandi-grid">
                  {mandiPrices
                    .filter(item => {
                      const matchesSearch = item.crop.toLowerCase().includes(mandiSearch.toLowerCase()) || 
                                           item.mandi.toLowerCase().includes(mandiSearch.toLowerCase());
                      return matchesSearch;
                    })
                    .map((item, index) => {
                      const rangeSpan = item.max_price - item.min_price || 1;
                      const percentage = Math.round(((item.modal_price - item.min_price) / rangeSpan) * 100);
                      
                      return (
                        <div key={index} className="mandi-item-card">
                          <div className="mandi-item-header">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="mandi-crop-name">{item.crop}</span>
                              <span className="mandi-location-badge">{item.mandi} Mandi, {item.state}</span>
                            </div>
                            <span className={`mandi-trend-badge ${item.trend}`}>
                              {item.trend === 'up' ? '📈 +' : item.trend === 'down' ? '📉 ' : '➡️ '} 
                              {item.change_percent}%
                            </span>
                          </div>
                          
                          <div className="mandi-price-details">
                            <div className="mandi-price-main">
                              <span className="mandi-price-val">₹{item.modal_price.toLocaleString()}</span>
                              <span className="mandi-price-unit">/ {item.unit}</span>
                            </div>
                            
                            <div className="mandi-range-bar">
                              <div className="mandi-range-track">
                                <div 
                                  className="mandi-range-fill"
                                  style={{
                                    left: '0%',
                                    width: `${percentage}%`
                                  }}
                                ></div>
                                <div className="mandi-range-pointer" style={{ left: `${percentage}%` }}></div>
                              </div>
                              <div className="mandi-range-labels">
                                <span>Min: ₹{item.min_price}</span>
                                <span>Max: ₹{item.max_price}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mandi-card-footer">
                            <span>Updated: {item.updated_at}</span>
                          </div>
                        </div>
                      );
                    })
                  }
                  {mandiPrices.filter(item => 
                    item.crop.toLowerCase().includes(mandiSearch.toLowerCase()) || 
                    item.mandi.toLowerCase().includes(mandiSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="mandi-empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      <p>No mandi records found for your search filters.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Floating Chatbot Launcher Button */}
          <div 
            className="chatbot-launcher" 
            onClick={() => setCurrentView('chatbot')} 
            title="Open Agri Disease Chatbot"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
        </>
      ) : (
        /* Chatbot Page View */
        <div className="chatbot-card">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🤖</div>
              <div className="chatbot-title">
                <h2>Agri AI Assistant</h2>
                <div className="chatbot-status">
                  <span className="status-dot"></span>
                  <span>Online & Ready</span>
                </div>
              </div>
            </div>
            <button className="btn-back" onClick={() => setCurrentView('recommendation')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              Back to Advisor
            </button>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <div className="message-bubble">
                  {/* Renders image inside user/ai bubble if uploaded */}
                  {msg.image_url && (
                    <img 
                      src={msg.image_url} 
                      alt="Uploaded crop leaf" 
                      className="message-image" 
                    />
                  )}

                  {/* Render ReAct reasoning terminal logs if present */}
                  {msg.react_steps && msg.react_steps.length > 0 && (
                    <div className="react-terminal">
                      <div className="react-terminal-header">
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#EF4444', borderRadius: '50%', marginRight: '4px' }}></span>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F59E0B', borderRadius: '50%', marginRight: '4px' }}></span>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '6px' }}></span>
                        <span>AI ReAct Reasoning Agent Console</span>
                      </div>
                      <div className="react-terminal-body">
                        {msg.react_steps.map((step, sIdx) => (
                          <div key={sIdx} className={`react-step ${step.type}`}>
                            {step.type === 'thought' && '💭 '}
                            {step.type === 'tool_call' && '🔧 '}
                            {step.type === 'observation' && '👁️ '}
                            {step.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Text answer */}
                  <div style={{ marginTop: msg.react_steps?.length > 0 ? '0.5rem' : '0' }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="message-row ai">
                <div className="message-bubble" style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                  <span className="thinking-text">AI Agent is reasoning...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies list */}
          <div className="quick-replies-container">
            <button className="quick-reply-pill" onClick={(e) => handleSendChat(e, "Are there organic treatments?")}>
              🌱 Organic Solutions?
            </button>
            <button className="quick-reply-pill" onClick={(e) => handleSendChat(e, "Will this disease spread to other plants?")}>
              ⚠️ Will this spread?
            </button>
            <button className="quick-reply-pill" onClick={(e) => handleSendChat(e, "How does it affect the crop yield?")}>
              📈 Yield Impact?
            </button>
            <button className="quick-reply-pill" onClick={(e) => handleSendChat(e, "How can I prevent this next season?")}>
              🔄 Prevent next season?
            </button>
          </div>

          {/* Upload attachment preview bar */}
          {attachedPreview && (
            <div className="attachment-preview-bar">
              <div className="attachment-preview">
                <img src={attachedPreview} alt="Thumbnail preview" />
                <span className="attachment-preview-name">{attachedFile?.name}</span>
                <button className="btn-remove-attachment" onClick={handleRemoveAttachment}>×</button>
              </div>
            </div>
          )}

          <div className="chatbot-footer">
            <form className="chat-input-form" onSubmit={handleSendChat}>
              <label className="chat-file-upload" title="Upload Leaf Image">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </label>

              <input 
                type="text" 
                className="chat-input-field" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder="Ask Agri AI or upload crop leaf image..."
                disabled={chatLoading}
              />

              <button 
                type="submit" 
                className="btn-send"
                disabled={chatLoading || (!chatInput.trim() && !attachedFile)}
                title="Send Message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

}

export default App;
