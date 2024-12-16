Copy// src/components/CountryDetails.jsx
const CountryDetails = ({ country, notes, onNotesChange }) => {
  return (
    <div className="country-details-panel">
      <h2>{country.name} Learning Notes</h2>
      <textarea
        value={notes[country.id] || ''}
        onChange={(e) => onNotesChange(country.id, e.target.value)}
        placeholder="Add your GeoGuessr notes for this country..."
      />
      {/* Add more meta info sections here */}
    </div>
  );
};