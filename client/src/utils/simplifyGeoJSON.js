// src/utils/simplifyGeoJSON.js
import { presimplify, simplify } from 'topojson-simplify';

export function simplifyGeoJSON(geojson, tolerance = 0.001) {
  // Convert coordinates to numbers if they're strings
  const features = geojson.features.map(feature => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.map(ring => 
        ring.map(coord => coord.map(Number))
      )
    }
  }));

  // Pre-simplify
  const simplified = presimplify(features);
  
  // Simplify with tolerance
  return simplify(simplified, tolerance);
}