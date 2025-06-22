/**
 * Address Lookup Service
 * Validates and fetches real postal codes and address data
 */

interface AddressData {
  address: string;
  postalCode?: string;
  city?: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface PostalCodeApiResponse {
  features?: Array<{
    properties: {
      postcode?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    geometry: {
      coordinates: [number, number];
    };
  }>;
}

export class AddressLookupService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  private static readonly POSTCODE_BASE_URL = 'https://api.postcodes.io';
  
  /**
   * Look up postal code and validate address using OpenStreetMap Nominatim API
   */
  static async lookupAddress(address: string): Promise<AddressData | null> {
    try {
      console.log(`[ADDRESS LOOKUP] Looking up address: ${address}`);
      
      // Use Nominatim API for address lookup
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&limit=1&q=${encodedAddress}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrewPlots-LocationManager/1.0 (contact@crewplots.com)'
        }
      });
      
      if (!response.ok) {
        console.error(`[ADDRESS LOOKUP] API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        console.log(`[ADDRESS LOOKUP] No results found for: ${address}`);
        return { address };
      }
      
      const result = data[0];
      const addressData: AddressData = {
        address: result.display_name || address,
        postalCode: result.address?.postcode,
        city: result.address?.city || result.address?.town || result.address?.village,
        country: result.address?.country,
        coordinates: result.lat && result.lon ? {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        } : undefined
      };
      
      console.log(`[ADDRESS LOOKUP] Found data:`, addressData);
      return addressData;
      
    } catch (error) {
      console.error(`[ADDRESS LOOKUP] Error looking up address:`, error);
      return { address };
    }
  }
  
  /**
   * Look up address by postal code (primarily for UK)
   */
  static async lookupByPostalCode(postalCode: string, country: string = 'UK'): Promise<AddressData | null> {
    try {
      if (country.toLowerCase() === 'uk' || country.toLowerCase() === 'gb') {
        // Use postcodes.io for UK postal codes
        const cleanPostcode = postalCode.replace(/\s+/g, '').toUpperCase();
        const url = `${this.POSTCODE_BASE_URL}/postcodes/${cleanPostcode}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          return null;
        }
        
        const data = await response.json();
        if (data.status === 200 && data.result) {
          const result = data.result;
          return {
            address: `${result.admin_ward}, ${result.admin_district}, ${result.country}`,
            postalCode: result.postcode,
            city: result.admin_district,
            country: result.country,
            coordinates: {
              lat: result.latitude,
              lng: result.longitude
            }
          };
        }
      }
      
      // Fall back to Nominatim for other countries
      return await this.lookupAddress(postalCode);
      
    } catch (error) {
      console.error(`[ADDRESS LOOKUP] Error looking up postal code:`, error);
      return null;
    }
  }
  
  /**
   * Validate if an address exists and return standardized format
   */
  static async validateAndStandardize(address: string): Promise<{
    isValid: boolean;
    standardizedAddress?: string;
    postalCode?: string;
    suggestions?: string[];
  }> {
    try {
      const lookupResult = await this.lookupAddress(address);
      
      if (!lookupResult) {
        return { isValid: false };
      }
      
      return {
        isValid: true,
        standardizedAddress: lookupResult.address,
        postalCode: lookupResult.postalCode,
        suggestions: lookupResult.address !== address ? [lookupResult.address] : undefined
      };
      
    } catch (error) {
      console.error(`[ADDRESS LOOKUP] Error validating address:`, error);
      return { isValid: false };
    }
  }
}