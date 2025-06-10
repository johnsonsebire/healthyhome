// Location data utilities
import { COUNTRIES, CITIES_BY_COUNTRY, REGIONS_BY_COUNTRY } from '../data/locationData';

/**
 * Get the display name for a country ID
 * @param {string} countryId - The country ID to look up
 * @returns {string} - The formatted display name
 */
export const getCountryDisplayName = (countryId) => {
  if (!countryId) return '';
  
  const country = COUNTRIES.find(country => country.id === countryId);
  return country ? country.name : countryId;
};

/**
 * Get the display name for a city ID
 * @param {string} cityId - The city ID to look up
 * @param {string} countryId - The country ID to which the city belongs
 * @param {string} customCity - Optional custom city name for "other" selection
 * @returns {string} - The formatted display name
 */
export const getCityDisplayName = (cityId, countryId, customCity) => {
  if (!cityId) return '';
  
  if (cityId === 'other' && customCity) {
    return customCity;
  }
  
  if (countryId && CITIES_BY_COUNTRY[countryId]) {
    const city = CITIES_BY_COUNTRY[countryId].find(city => city.id === cityId);
    if (city) return city.name;
  }
  
  // If city not found in any country, return the ID with improved formatting
  return cityId.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

/**
 * Get the display name for a region ID
 * @param {string} regionId - The region ID to look up
 * @param {string} countryId - The country ID to which the region belongs
 * @param {string} customRegion - Optional custom region name for "other" selection
 * @returns {string} - The formatted display name
 */
export const getRegionDisplayName = (regionId, countryId, customRegion) => {
  if (!regionId) return '';
  
  if (regionId === 'other' && customRegion) {
    return customRegion;
  }
  
  if (countryId && REGIONS_BY_COUNTRY[countryId]) {
    const region = REGIONS_BY_COUNTRY[countryId].find(region => region.id === regionId);
    if (region) return region.name;
  }
  
  // If region not found in any country, return the ID with improved formatting
  return regionId.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};
