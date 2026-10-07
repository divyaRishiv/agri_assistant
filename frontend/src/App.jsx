import { useState, useEffect, useRef } from 'react';
import './index.css';
import { translations } from './translations';

import CropRecommendationsView from './components/CropRecommendationsView';
import RegionalSupplyTrackerView from './components/RegionalSupplyTrackerView';
import PriceTrendsView from './components/PriceTrendsView';
import WhatIfSimulatorView from './components/WhatIfSimulatorView';
import CropPlannerView from './components/CropPlannerView';
import AlertsView from './components/AlertsView';

const statesAndDistricts = {
  "Andhra Pradesh": ["Guntur", "Anantapur", "Kurnool", "Chittoor", "East Godavari", "Krishna", "Prakasam", "Visakhapatnam", "West Godavari"],
  "Maharashtra": ["Nashik", "Pune", "Nagpur", "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Jalgaon", "Kolhapur", "Latur", "Solapur"],
  "Punjab": ["Ludhiana", "Bathinda", "Amritsar", "Barnala", "Faridkot", "Gurdaspur", "Jalandhar", "Patiala", "Sangrur"],
  "Uttar Pradesh": ["Agra", "Varanasi", "Aligarh", "Prayagraj", "Lucknow", "Kanpur", "Gorakhpur", "Meerut"],
  "Tamil Nadu": ["Coimbatore", "Chennai", "Madurai", "Tiruchirappalli", "Salem", "Erode"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Ballari", "Davangere"],
  "Gujarat": ["Rajkot", "Ahmedabad", "Surat", "Vadodara", "Bhavnagar", "Jamnagar"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur", "Ujjain"]
};

function App() {
  const [lang, setLang] = useState('en');
  const t = translations[lang] || translations.en;

  // Active Tab View: 'recommendation' | 'supply' | 'price_forecast' | 'what_if' | 'planner' | 'alerts' | 'mandi' | 'chatbot'
  const [activeTab, setActiveTab] = useState('recommendation');

  // Shared Global Form State for Region & Farm
  const [formData, setFormData] = useState({
    email: 'farmer@example.com',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    mandal: 'Tenali',
    village: 'Angalakuduru',
    soil_type: 'Black Soil',
    season: 'Kharif',
    water_availability: 'Medium',
    farm_size: '3.5',
    harvest_month: '6'
  });

  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  // Chatbot State Variables
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: "Welcome to Kisan Mitra AI Assistant. Upload a crop leaf image to detect possible diseases or ask agriculture questions."
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedPreview, setAttachedPreview] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMemory, setChatMemory] = useState(null);

  // Mandi Prices State Variables
  const [mandiPrices, setMandiPrices] = useState([]);
  const [mandiLoading, setMandiLoading] = useState(false);
  const [mandiSearch, setMandiSearch] = useState('');
  const [selectedMandiState, setSelectedMandiState] = useState('Andhra Pradesh');

  const messagesEndRef = useRef(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/v2/crop-recommendations?state=${encodeURIComponent(formData.state)}&district=${encodeURIComponent(formData.district)}&mandal=${encodeURIComponent(formData.mandal)}&village=${encodeURIComponent(formData.village)}&soil_type=${encodeURIComponent(formData.soil_type)}&water_availability=${encodeURIComponent(formData.water_availability)}&farm_size=${formData.farm_size || 2}&season=${encodeURIComponent(formData.season)}&harvest_month=${formData.harvest_month || 6}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch crop recommendations");
      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [formData.state, formData.district]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'state') {
      const firstDist = statesAndDistricts[value] ? statesAndDistricts[value][0] : '';
      setFormData({ ...formData, state: value, district: firstDist });
      setSelectedMandiState(value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    fetchRecommendations();
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
    const localUserMsg = { role: 'user', content: textToSend, image_url: attachedPreview };

    setChatMessages(prev => [...prev, localUserMsg]);
    setChatInput('');

    const formDataPayload = new FormData();
    if (textToSend.trim()) formDataPayload.append('message', textToSend);
    if (attachedFile) formDataPayload.append('image', attachedFile);
    if (formData.email) formDataPayload.append('email', formData.email);
    if (formData.state) formDataPayload.append('state', formData.state);
    if (formData.district) formDataPayload.append('district', formData.district);
    if (formData.farm_size) formDataPayload.append('farm_size', formData.farm_size);

    setAttachedFile(null);
    setAttachedPreview(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formDataPayload
      });
      if (!response.ok) throw new Error('Failed to communicate with AI Assistant');
      const data = await response.json();
      
      const localAiMsg = {
        role: 'assistant',
        content: data.final_answer,
        image_url: data.image_url,
        react_steps: data.react_steps || []
      };

      setChatMessages(prev => [...prev, localAiMsg]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const availableDistricts = formData.state ? statesAndDistricts[formData.state] || [] : [];

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Main Navigation Header */}
      <header className="main-app-header" style={{
        background: '#FFF',
        borderRadius: '16px',
        padding: '1.2rem 2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            fontSize: '2rem',
            background: 'linear-gradient(135deg, #2E7D32, #81C784)',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(46,125,50,0.2)'
          }}>
            🌾
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: 'var(--primary-color)' }}>
              {t.title}
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#666', margin: '0.1rem 0 0 0' }}>
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Right side Language + Region Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F5F5F5', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#555' }}>🌐 {t.select_language}:</span>
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: '700', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.2rem' }}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Global Region Selector Bar */}
      <div className="card global-region-bar" style={{
        background: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
        color: '#FFF',
        marginBottom: '1.5rem',
        padding: '1.2rem 1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
          <span style={{ fontSize: '1.2rem' }}>📍</span>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#FFF' }}>
            Selected Geographic Region & Location
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>State</label>
            <select 
              name="state" 
              value={formData.state} 
              onChange={handleChange}
              style={{ background: 'rgba(255,255,255,0.95)', color: '#000', padding: '0.6rem', fontWeight: '600' }}
            >
              {Object.keys(statesAndDistricts).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>District</label>
            <select 
              name="district" 
              value={formData.district} 
              onChange={handleChange}
              style={{ background: 'rgba(255,255,255,0.95)', color: '#000', padding: '0.6rem', fontWeight: '600' }}
            >
              {availableDistricts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Mandal / Tehsil</label>
            <input 
              type="text" 
              name="mandal" 
              value={formData.mandal} 
              onChange={handleChange}
              placeholder="e.g. Tenali"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#000', padding: '0.6rem' }}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Village</label>
            <input 
              type="text" 
              name="village" 
              value={formData.village} 
              onChange={handleChange}
              placeholder="e.g. Angalakuduru"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#000', padding: '0.6rem' }}
            />
          </div>
        </div>
      </div>

      {/* Dashboard Navigation Tabs */}
      <div className="dashboard-tab-bar" style={{
        display: 'flex',
        gap: '0.6rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <button 
          className={`tab-pill ${activeTab === 'recommendation' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendation')}
          style={{
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'recommendation' ? 'var(--primary-color)' : '#FFF',
            color: activeTab === 'recommendation' ? '#FFF' : '#333',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          🌾 {t.tab_recommendations}
        </button>

        <button 
          className={`tab-pill ${activeTab === 'supply' ? 'active' : ''}`}
          onClick={() => setActiveTab('supply')}
          style={{
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'supply' ? 'var(--primary-color)' : '#FFF',
            color: activeTab === 'supply' ? '#FFF' : '#333',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          📊 {t.tab_supply}
        </button>

        <button 
          className={`tab-pill ${activeTab === 'price_forecast' ? 'active' : ''}`}
          onClick={() => setActiveTab('price_forecast')}
          style={{
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'price_forecast' ? 'var(--primary-color)' : '#FFF',
            color: activeTab === 'price_forecast' ? '#FFF' : '#333',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          📈 {t.tab_price_forecast}
        </button>

        <button 
          className={`tab-pill ${activeTab === 'what_if' ? 'active' : ''}`}
          onClick={() => setActiveTab('what_if')}
          style={{
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'what_if' ? 'var(--primary-color)' : '#FFF',
            color: activeTab === 'what_if' ? '#FFF' : '#333',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          💡 {t.tab_what_if}
        </button>

        <button 
          className={`tab-pill ${activeTab === 'planner' ? 'active' : ''}`}
          onClick={() => setActiveTab('planner')}
          style={{
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'planner' ? 'var(--primary-color)' : '#FFF',
            color: activeTab === 'planner' ? '#FFF' : '#333',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          📝 {t.tab_planner}
        </button>

        <button 
          className={`tab-pill ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
          style={{
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'alerts' ? 'var(--primary-color)' : '#FFF',
            color: activeTab === 'alerts' ? '#FFF' : '#333',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          🔔 {t.tab_alerts}
        </button>

        <button 
          className={`tab-pill ${activeTab === 'mandi' ? 'active' : ''}`}
          onClick={() => setActiveTab('mandi')}
          style={{
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'mandi' ? 'var(--primary-color)' : '#FFF',
            color: activeTab === 'mandi' ? '#FFF' : '#333',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          🏪 {t.tab_mandi}
        </button>
      </div>

      {/* Main Tab Content Display */}
      <main style={{ flex: 1 }}>
        {activeTab === 'recommendation' && (
          <CropRecommendationsView 
            recommendations={recommendations}
            loading={loading}
            error={error}
            formData={formData}
            onFormChange={handleChange}
            onSubmit={handleFormSubmit}
            t={t}
          />
        )}

        {activeTab === 'supply' && (
          <RegionalSupplyTrackerView 
            state={formData.state}
            district={formData.district}
            mandal={formData.mandal}
            village={formData.village}
            t={t}
          />
        )}

        {activeTab === 'price_forecast' && (
          <PriceTrendsView 
            state={formData.state}
            district={formData.district}
            t={t}
          />
        )}

        {activeTab === 'what_if' && (
          <WhatIfSimulatorView 
            state={formData.state}
            district={formData.district}
            mandal={formData.mandal}
            t={t}
          />
        )}

        {activeTab === 'planner' && (
          <CropPlannerView 
            email={formData.email}
            state={formData.state}
            district={formData.district}
            mandal={formData.mandal}
            village={formData.village}
            t={t}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView 
            state={formData.state}
            district={formData.district}
            t={t}
          />
        )}

        {activeTab === 'mandi' && (
          <div className="card mandi-card" style={{ background: '#FFF' }}>
            <div className="mandi-header">
              <div>
                <h2 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                  🌾 Live Mandi Market Prices
                </h2>
                <p style={{ color: '#666', margin: '0.2rem 0 0 0', fontSize: '0.95rem' }}>
                  Real-time government market rates across Indian states
                </p>
              </div>
              <button 
                type="button"
                className={`btn-refresh ${mandiLoading ? 'spinning' : ''}`}
                onClick={() => fetchMandiPrices(selectedMandiState)}
                disabled={mandiLoading}
              >
                🔄
              </button>
            </div>

            <div className="mandi-filters">
              <div className="filter-group">
                <label className="filter-label">Filter State</label>
                <select 
                  value={selectedMandiState} 
                  onChange={(e) => setSelectedMandiState(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All India</option>
                  {Object.keys(statesAndDistricts).map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Search Mandi or Crop</label>
                <input 
                  type="text"
                  value={mandiSearch}
                  onChange={(e) => setMandiSearch(e.target.value)}
                  placeholder="e.g. Tomato, Pune, Guntur..."
                  className="filter-input"
                />
              </div>
            </div>

            {mandiLoading ? (
              <div className="loader-container" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="loader" style={{ margin: '0 auto' }}></div>
                <p>Fetching latest mandi rates...</p>
              </div>
            ) : (
              <div className="mandi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {mandiPrices
                  .filter(item => 
                    item.crop.toLowerCase().includes(mandiSearch.toLowerCase()) || 
                    item.mandi.toLowerCase().includes(mandiSearch.toLowerCase())
                  )
                  .map((item, index) => (
                    <div key={index} className="mandi-item-card" style={{ border: '1px solid #E0E0E0', padding: '1rem', borderRadius: '10px', background: '#FAFAFA' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <strong style={{ fontSize: '1.1rem', color: '#1B5E20' }}>{item.crop}</strong>
                        <span style={{ fontSize: '0.85rem', color: item.trend === 'up' ? '#2E7D32' : '#D32F2F', fontWeight: '700' }}>
                          {item.trend === 'up' ? '📈 +' : '📉 '}{item.change_percent}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{item.mandi} Mandi, {item.state}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary-color)', margin: '0.4rem 0' }}>
                        ₹{item.modal_price.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: '400' }}>/ {item.unit}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#888' }}>Min: ₹{item.min_price} | Max: ₹{item.max_price}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chatbot' && (
          <div className="card chatbot-card" style={{ background: '#FFF' }}>
            <div className="chatbot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #EEE', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ fontSize: '1.8rem' }}>🤖</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary-color)' }}>Agri AI Leaf & Disease Advisor</h2>
                  <span style={{ fontSize: '0.8rem', color: '#2E7D32' }}>🟢 Online & Ready</span>
                </div>
              </div>
            </div>

            <div className="chat-messages" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
              {chatMessages.map((msg, index) => (
                <div key={index} className={`message-row ${msg.role === 'user' ? 'user' : 'ai'}`} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div className="message-bubble" style={{
                    maxWidth: '85%',
                    padding: '0.8rem 1.2rem',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? 'var(--primary-color)' : '#F1F8E9',
                    color: msg.role === 'user' ? '#FFF' : '#1B5E20',
                    lineHeight: '1.5'
                  }}>
                    {msg.image_url && (
                      <img src={msg.image_url} alt="Uploaded crop" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: '0.5rem' }} />
                    )}
                    <div>{msg.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ color: '#666', fontSize: '0.9rem', fontStyle: 'italic' }}>AI is analyzing crop leaf diagnosis...</div>
              )}
            </div>

            <form className="chat-input-form" onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
              <label className="chat-file-upload" style={{ cursor: 'pointer', background: '#E8F5E9', padding: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📷
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>

              <input 
                type="text" 
                className="chat-input-field" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder="Ask Agri AI disease advisor or upload leaf image..."
                disabled={chatLoading}
                style={{ flex: 1 }}
              />

              <button type="submit" className="btn-send" disabled={chatLoading || (!chatInput.trim() && !attachedFile)} style={{ padding: '0.8rem 1.2rem', background: 'var(--primary-color)', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                Send
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Floating Chatbot Launcher button when not in chatbot tab */}
      {activeTab !== 'chatbot' && (
        <div 
          className="chatbot-launcher" 
          onClick={() => setActiveTab('chatbot')} 
          title="Open Leaf Disease AI Advisor"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2E7D32, #81C784)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            zIndex: 1000,
            transition: 'transform 0.2s ease'
          }}
        >
          🤖
        </div>
      )}

    </div>
  );
}

export default App;
