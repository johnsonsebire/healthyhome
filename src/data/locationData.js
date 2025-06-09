// Location data for Ghana and other countries
export const COUNTRIES = [
  { id: 'ghana', name: 'Ghana', code: 'GH' },
  { id: 'nigeria', name: 'Nigeria', code: 'NG' },
  { id: 'other', name: 'Other', code: 'OTHER' }
];

export const CITIES_BY_COUNTRY = {
  ghana: [
    { id: 'accra', name: 'Accra' },
    { id: 'kumasi', name: 'Kumasi' },
    { id: 'tamale', name: 'Tamale' },
    { id: 'cape_coast', name: 'Cape Coast' },
    { id: 'sekondi_takoradi', name: 'Sekondi-Takoradi' },
    { id: 'ho', name: 'Ho' },
    { id: 'koforidua', name: 'Koforidua' },
    { id: 'sunyani', name: 'Sunyani' },
    { id: 'wa', name: 'Wa' },
    { id: 'bolgatanga', name: 'Bolgatanga' },
    { id: 'techiman', name: 'Techiman' },
    { id: 'tema', name: 'Tema' },
    { id: 'other', name: 'Other' }
  ],
  nigeria: [
    { id: 'lagos', name: 'Lagos' },
    { id: 'abuja', name: 'Abuja' },
    { id: 'kano', name: 'Kano' },
    { id: 'ibadan', name: 'Ibadan' },
    { id: 'port_harcourt', name: 'Port Harcourt' },
    { id: 'benin_city', name: 'Benin City' },
    { id: 'maiduguri', name: 'Maiduguri' },
    { id: 'zaria', name: 'Zaria' },
    { id: 'aba', name: 'Aba' },
    { id: 'jos', name: 'Jos' },
    { id: 'other', name: 'Other' }
  ]
};

export const REGIONS_BY_COUNTRY = {
  ghana: [
    { id: 'greater_accra', name: 'Greater Accra Region' },
    { id: 'ashanti', name: 'Ashanti Region' },
    { id: 'northern', name: 'Northern Region' },
    { id: 'western', name: 'Western Region' },
    { id: 'central', name: 'Central Region' },
    { id: 'volta', name: 'Volta Region' },
    { id: 'eastern', name: 'Eastern Region' },
    { id: 'brong_ahafo', name: 'Brong-Ahafo Region' },
    { id: 'upper_west', name: 'Upper West Region' },
    { id: 'upper_east', name: 'Upper East Region' },
    { id: 'western_north', name: 'Western North Region' },
    { id: 'ahafo', name: 'Ahafo Region' },
    { id: 'bono', name: 'Bono Region' },
    { id: 'bono_east', name: 'Bono East Region' },
    { id: 'north_east', name: 'North East Region' },
    { id: 'savannah', name: 'Savannah Region' },
    { id: 'oti', name: 'Oti Region' },
    { id: 'other', name: 'Other' }
  ],
  nigeria: [
    { id: 'lagos', name: 'Lagos State' },
    { id: 'fct', name: 'Federal Capital Territory' },
    { id: 'kano', name: 'Kano State' },
    { id: 'oyo', name: 'Oyo State' },
    { id: 'rivers', name: 'Rivers State' },
    { id: 'edo', name: 'Edo State' },
    { id: 'borno', name: 'Borno State' },
    { id: 'kaduna', name: 'Kaduna State' },
    { id: 'abia', name: 'Abia State' },
    { id: 'plateau', name: 'Plateau State' },
    { id: 'other', name: 'Other' }
  ]
};

// Insurance providers data
export const INSURANCE_PROVIDERS = [
  { id: 'nhis', name: 'NHIS (National Health Insurance Scheme)', country: 'ghana' },
  { id: 'other', name: 'Other (Please specify)', country: 'all' }
];

// Function to get cities by country
export const getCitiesByCountry = (countryId) => {
  return CITIES_BY_COUNTRY[countryId] || [];
};

// Function to get regions by country
export const getRegionsByCountry = (countryId) => {
  return REGIONS_BY_COUNTRY[countryId] || [];
};

// Function to get insurance providers by country
export const getInsuranceProvidersByCountry = (countryId) => {
  return INSURANCE_PROVIDERS.filter(provider => 
    provider.country === 'all' || provider.country === countryId
  );
};
