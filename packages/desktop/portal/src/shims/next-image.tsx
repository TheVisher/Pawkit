/**
 * Next.js Image shim for Vite portal
 * Replaces next/image with standard img element
 */

import React, { forwardRef } from 'react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
  onLoadingComplete?: (result: { naturalWidth: number; naturalHeight: number }) => void;
}

const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  {
    src,
    alt,
    fill,
    priority,
    sizes,
    quality,
    placeholder,
    blurDataURL,
    unoptimized,
    onLoadingComplete,
    style,
    className,
    width,
    height,
    ...rest
  },
  ref
) {
  // Handle fill mode - absolute positioning
  const fillStyles: React.CSSProperties = fill
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }
    : {};

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      style={{ ...fillStyles, ...style }}
      className={className}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? 'eager' : 'lazy'}
      onLoad={(e) => {
        if (onLoadingComplete) {
          const img = e.currentTarget;
          onLoadingComplete({
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          });
        }
        rest.onLoad?.(e);
      }}
      {...rest}
    />
  );
});

export default Image;
