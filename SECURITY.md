# Security Policy

**Last Updated:** December 25, 2025  
**Version:** 2.0

---

## Overview

Pawkit takes security seriously. This document outlines our security measures, policies, and how to report vulnerabilities.

---

## 🔒 Security Measures

### Authentication & Authorization

| Protection | Implementation | Status |
|------------|----------------|--------|
| **Authentication** | Supabase Auth with session-based tokens | ✅ Active |
| **Password Requirements** | Minimum 12 characters, uppercase, lowercase, number | ✅ Active |
| **Row Level Security (RLS)** | Database-level user isolation on all tables | ✅ Active |
| **Session Validation** | All API routes verify user session server-side | ✅ Active |
| **404-over-403 Strategy** | Prevents information leakage about resource existence | ✅ Active |

**How it works:**
- Every API request validates the user session with Supabase
- User IDs are derived from secure sessions, never from request bodies
- Database RLS policies ensure users can only access their own data
- Unauthorized access returns 404 (not 403) to prevent resource enumeration

---

### Input Validation & SSRF Protection

| Protection | Implementation | Status |
|------------|----------------|--------|
| **URL Validation** | Whitelist-based redirect validation | ✅ Active |
| **SSRF Protection** | Blocks private IPs, localhost, and AWS metadata endpoints | ✅ Active |
| **Protocol Filtering** | Only HTTP(S) protocols allowed in user-submitted URLs | ✅ Active |
| **SQL Injection** | Parameterized queries via Prisma/Supabase | ✅ Active |
| **XSS Protection** | DOMPurify sanitization + CSP headers | ✅ Active |

**Protected against:**
- Open redirect attacks (OAuth callback validated against whitelist)
- Server-Side Request Forgery (SSRF) - blocks internal network probing
- Protocol smuggling (file://, javascript://, etc.)
- SQL injection (ORM prevents direct SQL)
- Cross-Site Scripting (sanitization + Content Security Policy)

**Blocked IP ranges:**
```
- 127.0.0.0/8 (localhost)
- 10.0.0.0/8 (private network)
- 172.16.0.0/12 (private network)
- 192.168.0.0/16 (private network)
- 169.254.0.0/16 (AWS metadata service)
- ::1, fe80::, fc00::, fd00:: (IPv6 local addresses)
```

---

### Rate Limiting

| Endpoint Type | Limit | Window | Status |
|---------------|-------|--------|--------|
| **Metadata API** | 5 requests | 1 minute | ✅ Active |
| **General API** | 10 requests | 10 seconds | ✅ Active |
| **Authentication** | 3 requests | 1 minute | ✅ Active |

**Implementation:** In-memory rate limiter with time-window tracking  
**Identifier:** User ID (authenticated) or IP address (anonymous)  
**Response:** HTTP 429 (Too Many Requests) with retry-after information

---

### Security Headers

All responses include the following security headers:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Protections:**
- **CSP:** Prevents XSS attacks by controlling resource sources
- **X-Frame-Options:** Prevents clickjacking attacks
- **X-Content-Type-Options:** Prevents MIME-sniffing attacks
- **Referrer-Policy:** Protects user privacy when navigating externally
- **Permissions-Policy:** Blocks unnecessary browser permissions

---

### Data Protection

#### Encryption

| Data Type | At Rest | In Transit | Method |
|-----------|---------|------------|--------|
| **User Credentials** | ✅ Hashed | ✅ TLS 1.3 | bcrypt (service tokens) |
| **Session Tokens** | ✅ Encrypted | ✅ TLS 1.3 | Supabase Auth |
| **Private Collections** | ✅ Server-filtered | ✅ TLS 1.3 | RLS policies |
| **File Attachments** | ✅ Cloud-encrypted | ✅ TLS 1.3 | Provider-dependent |

**Notes:**
- Browser extension tokens are hashed with bcrypt before storage
- All API communication uses HTTPS (TLS 1.3)
- Private collections are filtered server-side via PostgreSQL RLS
- Cloud storage providers (Filen, Google Drive, Dropbox, OneDrive) handle their own encryption

#### Local-First Architecture

**Security Benefit:** Your data is stored locally in IndexedDB first, then optionally synced to our servers.

- ✅ **Data sovereignty** - Your data lives on your device
- ✅ **Offline access** - No server dependency for core functionality
- ✅ **User control** - Export/delete your data anytime
- ✅ **Resilience** - Server outages don't affect local data

---

### Privacy & Data Collection

#### What We Collect

| Data Type | Purpose | Storage Location | Retention |
|-----------|---------|------------------|-----------|
| **Email Address** | Authentication, account recovery | Supabase (encrypted) | Until account deletion |
| **Bookmarks & Notes** | Core functionality | IndexedDB + PostgreSQL | Until user deletes |
| **File Attachments** | User-uploaded files | Your cloud provider | User-controlled |
| **Usage Analytics** | None | N/A | N/A |
| **Tracking Cookies** | None | N/A | N/A |

#### What We DON'T Collect

- ❌ No analytics or tracking
- ❌ No third-party advertising
- ❌ No selling of user data
- ❌ No browsing history (unless you explicitly save bookmarks)
- ❌ No file content scanning (we don't read your files)

#### Private Collections

Collections marked as "Private" are:
- ✅ Filtered server-side (never sent to client in queries)
- ✅ Hidden from search results
- ✅ Excluded from public API responses
- ✅ Protected by PostgreSQL RLS policies

**Note:** While we take every precaution, treat "Private" as privacy-focused, not cryptographically encrypted end-to-end. For maximum privacy, use local-only mode (disable server sync).

---

## 🔐 Third-Party Services

We use the following trusted third-party services:

| Service | Purpose | Data Shared | Security |
|---------|---------|-------------|----------|
| **Supabase** | Database, Auth | Email, bookmarks, notes | SOC 2 Type II certified |
| **Vercel** | Hosting | None (edge functions only) | SOC 2 Type II certified |
| **Anthropic** | AI features (optional) | Content you ask Kit to analyze | Commercial terms, no training |
| **Filen** | Cloud storage (optional) | Files you upload | End-to-end encrypted |
| **Google Drive** | Cloud storage (optional) | Files you upload | Google's security model |
| **Dropbox** | Cloud storage (optional) | Files you upload | Dropbox's security model |
| **OneDrive** | Cloud storage (optional) | Files you upload | Microsoft's security model |

**Notes:**
- Cloud storage is **optional** - you choose which provider to connect
- AI features are **opt-in** - only content you explicitly send to Kit is shared
- We do **not** train AI models on your data
- OAuth tokens are stored securely and never logged

---

## 🛡️ Security Best Practices

### For Users

1. **Use a strong password**
   - Minimum 12 characters
   - Include uppercase, lowercase, and numbers
   - Use a password manager

2. **Enable 2FA** (coming soon)
   - Additional layer of protection for your account

3. **Review connected apps**
   - Check Settings → Connected Accounts
   - Revoke access for unused services

4. **Export your data regularly**
   - Settings → Export Data
   - Keep backups of important bookmarks/notes

5. **Use Private Collections**
   - Mark sensitive collections as "Private"
   - They won't appear in searches or main views

### For Developers

1. **Never commit secrets**
   - Use `.env.local` for credentials
   - Verify `.env.local` is in `.gitignore`

2. **Validate all inputs**
   - Sanitize user input
   - Use TypeScript for type safety

3. **Follow authentication patterns**
   - Always verify sessions server-side
   - Use `createClient()` helper for consistency

4. **Test security changes**
   - Run the test suite before deploying
   - Test with malicious inputs

---

## 🐛 Reporting Vulnerabilities

### Responsible Disclosure

We appreciate security researchers who help keep Pawkit secure. If you discover a vulnerability:

**DO:**
- ✅ Email security@pawkit.app with details
- ✅ Give us 90 days to fix before public disclosure
- ✅ Provide steps to reproduce
- ✅ Include severity assessment (critical, high, medium, low)

**DON'T:**
- ❌ Publicly disclose before we've had time to fix
- ❌ Test on production with real user data
- ❌ Perform DDoS attacks or spam our services
- ❌ Access data that isn't yours

### What to Include

Your report should include:
1. **Vulnerability type** (e.g., "Open redirect in OAuth callback")
2. **Affected component** (e.g., `src/app/(auth)/callback/route.ts`)
3. **Steps to reproduce** (exact URLs, payloads, etc.)
4. **Potential impact** (what could an attacker do?)
5. **Suggested fix** (optional, but appreciated)
6. **Your contact info** (for follow-up questions)

### Response Timeline

- **Acknowledgment:** Within 24 hours
- **Initial assessment:** Within 3 business days
- **Fix timeline:** Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### Bounty Program

We're an indie project with limited resources, but we're grateful for security research:
- **Critical vulnerabilities:** Public acknowledgment + swag
- **High vulnerabilities:** Public acknowledgment
- **Medium/Low vulnerabilities:** Thank you note

If we raise funding, we'll establish a paid bug bounty program.

---

## 🔍 Security Audits

### Internal Reviews

- **Last comprehensive audit:** December 25, 2025
- **Frequency:** Quarterly
- **Scope:** Full codebase scan + penetration testing
- **Tools:** Manual code review + automated scanning

### External Reviews

- **Last external audit:** N/A (planned for 2026)
- **Next planned audit:** Q2 2026
- **Auditor:** TBD

### Public Audits

This codebase is open source. We welcome community security reviews:
- Repository: https://github.com/TheVisher/Pawkit
- Security policy: https://github.com/TheVisher/Pawkit/security/policy

---

## 📋 Compliance

### Standards We Follow

- **OWASP Top 10:** Protections against all OWASP Top 10 vulnerabilities
- **GDPR:** User data export, deletion, and consent
- **CCPA:** California consumer privacy rights
- **SOC 2:** Via Supabase and Vercel

### User Rights (GDPR/CCPA)

You have the right to:
- ✅ **Access** your data (Settings → Export Data)
- ✅ **Delete** your data (Settings → Delete Account)
- ✅ **Portability** (JSON export format)
- ✅ **Correction** (Edit any bookmark/note)
- ✅ **Opt-out** (Disable server sync, go local-only)

### Data Deletion

When you delete your account:
1. All bookmarks, notes, and collections are deleted from our database
2. File attachments in cloud storage are **not** automatically deleted (you control those)
3. Backups are purged within 30 days
4. Authentication data is removed immediately

**Note:** Local data in your browser's IndexedDB is not automatically cleared. Use browser tools to clear site data if desired.

---

## 🔄 Incident Response

### In Case of a Security Breach

If we discover or are notified of a security incident:

1. **Immediate response** (0-4 hours)
   - Contain the incident
   - Assess scope and impact
   - Disable affected systems if necessary

2. **Investigation** (4-24 hours)
   - Identify root cause
   - Determine affected users
   - Document timeline

3. **Notification** (24-72 hours)
   - Email affected users
   - Post public incident report
   - Provide remediation steps

4. **Remediation** (varies)
   - Deploy security fix
   - Rotate compromised credentials
   - Enhance monitoring

5. **Post-mortem** (within 1 week)
   - Public incident report
   - Lessons learned
   - Preventive measures

### Historical Incidents

**None to date.** We'll update this section if any incidents occur.

---

## 📞 Contact

### Security Team

- **Email:** security@pawkit.app
- **PGP Key:** Coming soon
- **Response time:** Within 24 hours

### General Support

- **Email:** support@pawkit.app
- **Discord:** https://discord.gg/pawkit
- **GitHub Issues:** https://github.com/TheVisher/Pawkit/issues

---

## 📚 Additional Resources

### Security Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)

### Architecture Documentation

- [Local-First Architecture](./docs/LOCAL_FIRST_ARCHITECTURE.md)
- [Security Audit Report](./docs/SECURITY_AUDIT_2025-12-03.md)
- [Development Playbook](./docs/PLAYBOOK.md)

---

## ✅ Security Checklist (For Developers)

Before deploying to production:

- [ ] All API routes validate user sessions
- [ ] RLS policies enabled on all database tables
- [ ] Environment variables not committed to git
- [ ] Security headers configured in `next.config.ts`
- [ ] Rate limiting active on expensive endpoints
- [ ] Input validation on all user-provided data
- [ ] HTTPS enforced (no HTTP in production)
- [ ] Dependencies up to date (no known vulnerabilities)
- [ ] Test suite passing (especially security tests)
- [ ] Security audit completed and issues resolved

---

**Questions about security?** Email security@pawkit.app

**Found a vulnerability?** Please report responsibly to security@pawkit.app

Thank you for helping keep Pawkit secure! 🔒
