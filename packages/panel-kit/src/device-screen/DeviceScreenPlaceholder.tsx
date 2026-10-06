import './styles';

export function DeviceScreenPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="pk-device pk-device-placeholder"
      role="img"
      aria-label={label}
      data-device-placeholder
    >
      <span className="pk-device-placeholder-label" data-label>
        {label}
      </span>
    </div>
  );
}
