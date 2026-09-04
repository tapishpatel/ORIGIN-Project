import React, { useState } from 'react';
import { api } from '../api/client';

export function OnboardingForm() {
  const [formData, setFormData] = useState({
    age_group: '18-40',
    conditions: [],
    occupation: 'office',
    location: {
      lat: 23.2547,
      lon: 77.4029,
      label: 'Bhopal, Madhya Pradesh',
      city: 'Bhopal',
      country: 'India'
    },
    alert_sensitivity: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.updateProfile(formData);
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert('Failed to save profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleConditionToggle = (condition) => {
    setFormData(prev => {
      const isSelected = prev.conditions.includes(condition);
      let newConditions;
      if (isSelected) {
        newConditions = prev.conditions.filter(c => c !== condition);
      } else {
        newConditions = [...prev.conditions.filter(c => c !== 'none'), condition];
      }
      if (newConditions.length === 0) newConditions = ['none'];
      return { ...prev, conditions: newConditions };
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: 'white', padding: '20px' }}>
      <form onSubmit={handleSubmit} style={{ background: '#111827', padding: '40px', borderRadius: '16px', maxWidth: '500px', width: '100%', border: '1px solid #1f2937' }}>
        <h2 style={{ marginBottom: '24px', color: '#38bdf8' }}>Complete Your Health Profile</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Age Group</label>
          <select 
            value={formData.age_group} 
            onChange={(e) => setFormData({...formData, age_group: e.target.value})}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1f2937', color: 'white', border: 'none' }}
          >
            <option value="under-18">Under 18</option>
            <option value="18-40">18 - 40</option>
            <option value="41-65">41 - 65</option>
            <option value="over-65">Over 65</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Occupation</label>
          <select 
            value={formData.occupation} 
            onChange={(e) => setFormData({...formData, occupation: e.target.value})}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1f2937', color: 'white', border: 'none' }}
          >
            <option value="office">Office / Indoor Worker</option>
            <option value="outdoor">Outdoor Worker</option>
            <option value="athlete">Athlete / Very Active</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Health Conditions</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['asthma', 'heart_disease', 'allergies'].map(cond => (
              <label key={cond} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1f2937', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.conditions.includes(cond)}
                  onChange={() => handleConditionToggle(cond)}
                />
                {cond.replace('_', ' ')}
              </label>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#38bdf8', color: '#090d16', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          {isSubmitting ? 'Saving...' : 'Save & Continue'}
        </button>
      </form>
    </div>
  );
}
