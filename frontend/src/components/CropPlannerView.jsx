import React, { useState, useEffect } from 'react';

export default function CropPlannerView({ email, state, district, mandal, village, t }) {
  const [farmerEmail, setFarmerEmail] = useState(email || 'farmer@example.com');
  const [farmerName, setFarmerName] = useState('Ramesh Kumar');
  const [phone, setPhone] = useState('9876543210');
  const [cropName, setCropName] = useState('Chilli');
  const [acreage, setAcreage] = useState('3.5');
  const [sowingDate, setSowingDate] = useState('2026-03-15');
  const [harvestDate, setHarvestDate] = useState('2026-07-15');
  const [notes, setNotes] = useState('');

  const [activePlans, setActivePlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchPlans = async () => {
    if (!farmerEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/crop-plans?email=${encodeURIComponent(farmerEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setActivePlans(data.crop_plans || []);
      }
    } catch (err) {
      console.error("Failed to fetch crop plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [farmerEmail]);

  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    const payload = {
      email: farmerEmail,
      farmer_name: farmerName,
      phone,
      state: state || 'Andhra Pradesh',
      district: district || 'Guntur',
      mandal: mandal || 'Tenali',
      village: village || 'Angalakuduru',
      crop_name: cropName,
      acreage: Number(acreage),
      sowing_date: sowingDate,
      expected_harvest_date: harvestDate,
      status: 'Planned',
      notes
    };

    try {
      const res = await fetch('/api/v2/crop-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setMsg({ type: 'success', text: data.message || 'Crop plan registered successfully!' });
        fetchPlans();
      } else {
        setMsg({ type: 'error', text: 'Failed to register crop plan.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (planId, newStatus) => {
    try {
      const res = await fetch(`/api/v2/crop-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleCancelPlan = async (planId) => {
    if (!window.confirm("Are you sure you want to cancel this crop plan?")) return;
    try {
      const res = await fetch(`/api/v2/crop-plans/${planId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch (err) {
      console.error("Failed to cancel plan:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Registration Form Card */}
      <form className="card" onSubmit={handleSubmitPlan} style={{ background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <h2 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>
              📝 Register Your Planned Crop
            </h2>
            <p style={{ color: '#666', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
              Register your sowing intentions to help calculate accurate regional supply and prevent market oversupply.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', background: '#E8F5E9', color: '#1B5E20', padding: '0.3rem 0.6rem', borderRadius: '12px', fontWeight: '600' }}>
            🔒 Privacy Shield Active
          </span>
        </div>

        {msg && (
          <div style={{
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            background: msg.type === 'success' ? '#E8F5E9' : '#FFEBEE',
            color: msg.type === 'success' ? '#1B5E20' : '#C62828',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>
            {msg.text}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Farmer Email</label>
            <input 
              type="email" 
              value={farmerEmail} 
              onChange={(e) => setFarmerEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Farmer Name</label>
            <input 
              type="text" 
              value={farmerName} 
              onChange={(e) => setFarmerName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Crop Selection</label>
            <select value={cropName} onChange={(e) => setCropName(e.target.value)} required>
              <option value="Chilli">Chilli</option>
              <option value="Tomato">Tomato</option>
              <option value="Onion">Onion</option>
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
            <label>Planned Acreage</label>
            <input 
              type="number" 
              value={acreage} 
              onChange={(e) => setAcreage(e.target.value)} 
              step="0.5"
              min="0.5"
              required 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Sowing Date</label>
            <input 
              type="date" 
              value={sowingDate} 
              onChange={(e) => setSowingDate(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Expected Harvest Date</label>
            <input 
              type="date" 
              value={harvestDate} 
              onChange={(e) => setHarvestDate(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Optional Notes / Variety</label>
          <input 
            type="text" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="e.g. Guntur Teja Chilli variety, drip irrigated"
          />
        </div>

        <button type="submit" className="btn-submit" disabled={submitting}>
          {submitting ? 'Registering Plan...' : '🌱 Register Crop Plan'}
        </button>
      </form>

      {/* Active Crop Plans List */}
      <div className="card" style={{ background: '#FFF' }}>
        <h3 style={{ color: 'var(--primary-color)', fontSize: '1.2rem', marginBottom: '1rem' }}>
          📋 Your Registered Crop Plans ({farmerEmail})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loader" style={{ margin: '0 auto 1rem auto' }}></div>
            <p>Fetching your crop plans...</p>
          </div>
        ) : activePlans.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No registered crop plans found for this email address.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activePlans.map((plan, pIdx) => (
              <div key={pIdx} style={{
                border: '1px solid #E0E0E0',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                background: '#FAFAFA'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <strong style={{ fontSize: '1.2rem', color: '#1B5E20' }}>{plan.crop_name}</strong>
                    <span style={{
                      background: plan.status === 'Confirmed' ? '#E8F5E9' : plan.status === 'Harvested' ? '#E3F2FD' : '#FFF3E0',
                      color: plan.status === 'Confirmed' ? '#2E7D32' : plan.status === 'Harvested' ? '#1565C0' : '#E65100',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}>
                      {plan.status === 'Planned' ? '📝 Planned' : plan.status === 'Confirmed' ? '✅ Confirmed Sown' : '🌾 Harvested'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#555', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>Acreage: <strong>{plan.acreage} Acres</strong></span>
                    <span>Region: <strong>{plan.village}, {plan.mandal}, {plan.district}</strong></span>
                    <span>Sowing: <strong>{plan.sowing_date}</strong></span>
                    <span>Harvest: <strong>{plan.expected_harvest_date}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {plan.status === 'Planned' && (
                    <button 
                      onClick={() => handleUpdateStatus(plan.plan_id, 'Confirmed')}
                      style={{ background: '#2E7D32', color: '#FFF', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                    >
                      Confirm Sown
                    </button>
                  )}
                  {plan.status === 'Confirmed' && (
                    <button 
                      onClick={() => handleUpdateStatus(plan.plan_id, 'Harvested')}
                      style={{ background: '#1976D2', color: '#FFF', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                    >
                      Mark Harvested
                    </button>
                  )}
                  <button 
                    onClick={() => handleCancelPlan(plan.plan_id)}
                    style={{ background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                  >
                    Cancel Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
