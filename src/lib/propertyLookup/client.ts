/**
 * Property Lookup Client
 * API client for Realty Mole Property API via RapidAPI.
 */

import {
  RealtyMoleProperty,
  PropertyLookupResult,
  mapPropertyType,
} from "./types";

const RAPIDAPI_HOST = "realty-mole-property-api.p.rapidapi.com";
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}`;

/**
 * Look up property data by address using Realty Mole API.
 *
 * @param address - Street address (e.g., "123 Main St")
 * @param city - City name (e.g., "Los Angeles")
 * @param state - State code (e.g., "CA")
 * @returns Normalized property data or null if not found
 */
export async function lookupProperty(
  address: string,
  city: string,
  state: string
): Promise<PropertyLookupResult | null> {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY environment variable is not set");
  }

  // URL encode the address components
  const encodedAddress = encodeURIComponent(address);
  const encodedCity = encodeURIComponent(city);
  const encodedState = encodeURIComponent(state);

  const url = `${RAPIDAPI_BASE_URL}/properties?address=${encodedAddress}&city=${encodedCity}&state=${encodedState}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null; // Property not found
    }
    const errorText = await response.text();
    throw new Error(
      `Realty Mole API error: ${response.status} - ${errorText}`
    );
  }

  const data: RealtyMoleProperty | RealtyMoleProperty[] = await response.json();

  // API can return a single object or an array
  const property = Array.isArray(data) ? data[0] : data;

  if (!property) {
    return null;
  }

  // Normalize the response to our format
  return normalizeProperty(property);
}

/**
 * Normalize Realty Mole API response to our application format.
 */
function normalizeProperty(property: RealtyMoleProperty): PropertyLookupResult {
  return {
    city: property.city || "",
    state: property.state || "",
    zipCode: property.zipCode || "",
    propertyType: mapPropertyType(property.propertyType),
    bedrooms: property.bedrooms ?? null,
    bathrooms: property.bathrooms ?? null,
    squareFeet: property.squareFootage ?? null,
    lotSize: property.lotSize ?? null,
    // Use lastSalePrice as an estimate if available
    listingPrice: property.lastSalePrice ?? property.assessedValue ?? null,
    yearBuilt: property.yearBuilt ?? null,
  };
}
