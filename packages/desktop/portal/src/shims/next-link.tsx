/**
 * Next.js Link shim for Vite portal
 * In the portal, we don't do page navigation - we handle clicks differently
 */

import React, { forwardRef } from 'react';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, children, prefetch, replace, scroll, shallow, passHref, legacyBehavior, ...rest },
  ref
) {
  // In portal, links become simple anchors or divs with click handlers
  // The parent component should handle navigation via onClick
  return (
    <a
      ref={ref}
      href={href}
      onClick={(e) => {
        // For internal navigation, prevent default and let parent handle it
        if (href.startsWith('/')) {
          e.preventDefault();
        }
        rest.onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
});

export default Link;
