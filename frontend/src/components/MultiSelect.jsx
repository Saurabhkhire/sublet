// Checkbox-based multi-select rendered as toggleable chips.
// options = [{value, label}], value = array of selected values.
export default function MultiSelect({ options, value, onChange, disabled }) {
  function toggle(v) {
    if (disabled) return;
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <div className="multiselect">
      {options.length === 0 && <span className="faint small">No options available.</span>}
      {options.map((o) => (
        <label key={o.value} className={`chip ${value.includes(o.value) ? 'chip-on' : ''}`}>
          <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
