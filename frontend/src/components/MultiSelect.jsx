// Simple checkbox-based multi-select. `options` = [{value, label}], `value` = array.
export default function MultiSelect({ options, value, onChange }) {
  function toggle(v) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <div className="multiselect">
      {options.length === 0 && <span className="muted">No options available.</span>}
      {options.map((o) => (
        <label key={o.value} className={`chip ${value.includes(o.value) ? 'chip-on' : ''}`}>
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={() => toggle(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
