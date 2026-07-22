import { availableSamples } from "./samples";

export default function SampleSelect({ value, onChange }) {
	return (
		<label>
			<span>Sample</span>
			<select value={value} onChange={(event) => onChange(event.target.value)}>
				{availableSamples.map((name) => (
					<option key={name}>{name}</option>
				))}
			</select>
		</label>
	);
}
