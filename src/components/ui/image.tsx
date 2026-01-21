import { forwardRef } from 'react'
import type { CSSProperties, ImgHTMLAttributes } from 'react'

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height'> & {
  width?: number | string
  height?: number | string
  fill?: boolean
  priority?: boolean
  sizes?: string
}

const Image = forwardRef<HTMLImageElement, ImageProps>(
  ({ fill, priority, width, height, style, ...props }, ref) => {
    const imageStyle: CSSProperties = {
      ...style,
      ...(fill ? { width: '100%', height: '100%', objectFit: style?.objectFit ?? 'cover' } : null),
    }

    return (
      <img
        ref={ref}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        loading={priority ? 'eager' : props.loading}
        style={imageStyle}
        {...props}
      />
    )
  },
)

Image.displayName = 'Image'

export default Image
