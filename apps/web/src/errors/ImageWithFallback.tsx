import { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import './errors.css';

type ImageWithFallbackProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  src: string;
  label: string;
};

export function ImageWithFallback({
  src,
  label,
  className,
  onError,
  ...rest
}: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  if (failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={label}
        className={className ? `image-placeholder ${className}` : 'image-placeholder'}
      >
        <span className="image-placeholder-label">{label}</span>
      </div>
    );
  }
  return (
    <img
      {...rest}
      src={src}
      alt={label}
      className={className}
      onError={(event) => {
        setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
}
