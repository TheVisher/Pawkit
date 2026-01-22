# Security Policy

Last Updated: January 22, 2026
Version: 3.0

## Overview

Pawkit takes security seriously. This document summarizes security measures, data handling, and how to report issues.

## Security Measures

### Authentication and Authorization

| Protection | Implementation | Status |
|------------|----------------|--------|
| Authentication | Convex Auth (session-based) | Active |
| Password requirements | Minimum 12 characters | Active |
| Authorization | Server-side checks in Convex queries and mutations | Active |
| Session validation | Handled by Convex auth middleware | Active |
| 404-over-403 strategy | Used for sensitive lookups | Active |

### Input Validation and SSRF Protection

| Protection | Implementation | Status |
|------------|----------------|--------|
| URL validation | Allowlist-based validation for redirects | Active |
| SSRF protection | Blocks localhost and private IP ranges | Active |
| Protocol filtering | Only HTTP(S) for user-submitted URLs | Active |
| XSS protection | DOMPurify sanitization + CSP headers | Active |

### Rate Limiting

| Endpoint Type | Limit | Window | Status |
|---------------|-------|--------|--------|
| Metadata API | 5 requests | 1 minute | Active |
| General API | 10 requests | 10 seconds | Active |
| Authentication | 3 requests | 1 minute | Active |

### Security Headers

All responses include standard security headers:

```
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Data Protection

### Encryption

| Data Type | At Rest | In Transit | Notes |
|-----------|---------|------------|-------|
| Credentials | Hashed | TLS | Managed by Convex Auth |
| Session tokens | Encrypted | TLS | Managed by Convex |
| Files | Encrypted | TLS | Stored in Convex storage or user-provided cloud storage |

### Local Storage

Pawkit stores some UI preferences in the browser (for example, layout settings). This data is not used for authentication and can be cleared via browser site data settings.

## Privacy and Data Collection

### What We Collect

| Data Type | Purpose | Storage Location | Retention |
|-----------|---------|------------------|----------|
| Email address | Authentication, account recovery | Convex | Until account deletion |
| Bookmarks and notes | Core functionality | Convex | Until user deletes |
| File attachments | User content | Convex storage or user cloud provider | User-controlled |
| Usage analytics | None | N/A | N/A |
| Tracking cookies | None | N/A | N/A |

### What We Do Not Collect

- No advertising or tracking
- No selling of user data
- No scanning of private file contents

## Third-Party Services

| Service | Purpose | Data Shared |
|---------|---------|------------|
| Convex | Database, auth, realtime | User content and account data |
| Vercel | Hosting | Application assets and requests |
| Anthropic | AI features (optional) | Content you explicitly submit to Kit |
| Cloud storage providers | Optional storage | Files you upload to those providers |

## Reporting Vulnerabilities

Please report security issues to security@pawkit.app. Do not disclose vulnerabilities publicly until they have been addressed.
