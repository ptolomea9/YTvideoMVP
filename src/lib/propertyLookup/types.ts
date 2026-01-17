/**
 * Property Lookup Types
 * Type definitions for property data auto-fill via Realty Mole API.
 */

/**
 * Response from Realty Mole Property API.
 * See: https://rapidapi.com/realtymole/api/realty-mole-property-api
 */
export interface RealtyMoleProperty {
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  formattedAddress?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
  assessedValue?: number;
  taxAssessment?: number;
  features?: string[];
}

/**
 * Normalized property lookup result for our application.
 */
export interface PropertyLookupResult {
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  lotSize: number | null;
  listingPrice: number | null;
  yearBuilt: number | null;
}

/**
 * API response wrapper.
 */
export interface PropertyLookupResponse {
  success: boolean;
  property: PropertyLookupResult | null;
  source: string;
  error?: string;
}

/**
 * Mapping from Realty Mole property types to our property type enum.
 */
export const PROPERTY_TYPE_MAP: Record<string, string> = {
  "Single Family": "single_family",
  "Single Family Residential": "single_family",
  "Condo": "condo",
  "Condominium": "condo",
  "Townhouse": "townhouse",
  "Townhome": "townhouse",
  "Multi-Family": "multi_family",
  "Multi Family": "multi_family",
  "Duplex": "multi_family",
  "Triplex": "multi_family",
  "Quadruplex": "multi_family",
  "Land": "land",
  "Vacant Land": "land",
  "Commercial": "commercial",
  "Industrial": "commercial",
  "Apartment": "multi_family",
};

/**
 * Map Realty Mole property type to our enum.
 */
export function mapPropertyType(apiType: string | undefined): string {
  if (!apiType) return "other";

  // Check direct match
  if (PROPERTY_TYPE_MAP[apiType]) {
    return PROPERTY_TYPE_MAP[apiType];
  }

  // Check case-insensitive partial match
  const lowerType = apiType.toLowerCase();
  for (const [key, value] of Object.entries(PROPERTY_TYPE_MAP)) {
    if (lowerType.includes(key.toLowerCase())) {
      return value;
    }
  }

  return "other";
}
