// src/workers/mapWorker.js
import { simplifyGeoJSON } from '../utils/simplifyGeoJSON';

self.onmessage = function(e) {
  const { data, tolerance } = e.data;
  const simplified = simplifyGeoJSON(data, tolerance);
  self.postMessage(simplified);
};