// Insurance Provider data to be used across the app
const INSURANCE_PROVIDERS = [
  {
    id: 'nhis',
    name: 'National Health Insurance Scheme (NHIS)',
    type: 'Public',
    coverage: 'Basic healthcare services',
    pros: ['Government subsidized', 'Wide network of hospitals', 'Affordable premiums'],
    cons: ['Limited coverage', 'Long waiting times', 'Basic services only'],
    rating: 3.5,
    isApproved: true, // This provider is already integrated
    contactInfo: {
      phone: '+233-302-123456',
      website: 'www.nhis.gov.gh',
      email: 'info@nhis.gov.gh'
    }
  },
  {
    id: 'star_assurance',
    name: 'Star Assurance Company Limited',
    type: 'Private',
    coverage: 'Comprehensive health insurance',
    pros: ['Fast claim processing', 'Good customer service', 'Comprehensive coverage'],
    cons: ['Higher premiums', 'Limited to urban areas', 'Strict eligibility criteria'],
    rating: 4.2,
    isApproved: false, // Not yet integrated
    contactInfo: {
      phone: '+233-302-654321',
      website: 'www.starassurance.com.gh',
      email: 'health@starassurance.com.gh'
    }
  },
  {
    id: 'metropolitan',
    name: 'Metropolitan Insurance Ghana',
    type: 'Private',
    coverage: 'Health and life insurance',
    pros: ['International coverage', 'Premium services', 'Digital platform'],
    cons: ['Expensive premiums', 'Complex procedures', 'Urban-focused'],
    rating: 4.0,
    isApproved: false, // Not yet integrated
    contactInfo: {
      phone: '+233-302-789012',
      website: 'www.metropolitan.com.gh',
      email: 'contact@metropolitan.com.gh'
    }
  },
  {
    id: 'glico',
    name: 'GLICO Healthcare',
    type: 'Private',
    coverage: 'Health insurance and wellness',
    pros: ['Wellness programs', 'Preventive care', 'Good network'],
    cons: ['Premium pricing', 'Limited rural coverage', 'Lengthy approval process'],
    rating: 3.8,
    isApproved: false, // Not yet integrated
    contactInfo: {
      phone: '+233-302-345678',
      website: 'www.glico.com.gh',
      email: 'healthcare@glico.com.gh'
    }
  }
];

const getProviderById = (id) => {
  return INSURANCE_PROVIDERS.find(provider => provider.id === id);
};

const getProviderByName = (name) => {
  // Handle various forms of NHIS naming
  if (name === 'NHIS' || 
      name === 'NHIS (National Health Insurance Scheme)' || 
      name === 'National Health Insurance Scheme (NHIS)' ||
      name.toLowerCase().includes('nhis') ||
      name.toLowerCase().includes('national health insurance')) {
    return getProviderById('nhis');
  }
  
  return INSURANCE_PROVIDERS.find(
    provider => provider.name === name || 
    provider.name.includes(name) || 
    name.includes(provider.name)
  );
};

const getApprovedProviders = () => {
  return INSURANCE_PROVIDERS.filter(provider => provider.isApproved);
};

const getAllProviders = () => {
  return INSURANCE_PROVIDERS;
};

export {
  INSURANCE_PROVIDERS,
  getProviderById,
  getProviderByName,
  getApprovedProviders,
  getAllProviders
};
