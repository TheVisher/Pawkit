# Changelog

All notable changes to Pawkit will be documented in this file.

## [Unreleased]

### Fixed
- Fixed YouTube video embedding in card modals - videos now display and play correctly in the main modal content area
- Added CSP (Content Security Policy) support for YouTube iframes by adding `frame-src` directive for youtube.com domains
- Fixed sidebar layout issues where tabs were cramped when viewing YouTube cards
- YouTube cards now properly display in a 16:9 aspect ratio with responsive sizing

### Changed
- YouTube videos now embed directly in the main modal content area instead of appearing in a sidebar tab
- Simplified YouTube card layout by removing redundant Reader and Summary tabs for video content
- Modal width now automatically adjusts for YouTube content (max-w-6xl) for optimal viewing experience
