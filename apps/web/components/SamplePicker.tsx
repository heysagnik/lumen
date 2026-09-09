interface Sample {
  label: string;
  file: string;
}

const SAMPLES: Sample[] = [
  { label: "Prospectus", file: "delhivery-prospectus.pdf" },
  { label: "Annual report", file: "delhivery-annual-report.pdf" },
  { label: "Q4 earnings", file: "delhivery-earnings.pdf" },
];

export function SamplePicker({ onSelect, disabled }: { onSelect: (file: File) => void; disabled: boolean }) {
  async function pickSample(sample: Sample) {
    const response = await fetch(`/samples/${sample.file}`);
    const blob = await response.blob();
    onSelect(new File([blob], sample.file, { type: "application/pdf" }));
  }

  return (
    <p className="text-xs text-subtle text-center">
      No PDF handy? Try{" "}
      {SAMPLES.map((sample, index) => (
        <span key={sample.file}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => pickSample(sample)}
            className="text-muted underline decoration-border-strong underline-offset-2 transition-colors duration-150 hover:text-accent hover:decoration-accent disabled:pointer-events-none disabled:opacity-50"
          >
            {sample.label}
          </button>
          {index < SAMPLES.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}
