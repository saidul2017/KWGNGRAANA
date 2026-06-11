# Security Documentation

## Overview

This document describes the security measures implemented in the KWGN Learning Hub application.

## Authentication & Session Management

### Session Security
- **Library**: iron-session (HTTP-only cookie-based sessions)
- **Cookie Flags**:
  - `httpOnly: true` - Prevents JavaScript access to cookies
  - `secure: true` (production) - Only sends cookies over HTTPS
  - `sameSite: "lax"` - CSRF protection
  - `maxAge: 8 hours` - Reasonable session timeout

### Password Security
- **Hashing**: bcryptjs with salt rounds (automatic)
- **Validation**: Minimum password length enforced
- **Generic Error Messages**: Prevents user enumeration attacks
- **Timing Attack Protection**: Dummy hash comparison for non-existent users

## Rate Limiting

The application implements sliding-window rate limiting to prevent abuse:

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `/api/auth/login` | 5 attempts | 15 minutes | Prevent brute force attacks |
| `/api/chatbot` | 30 messages | 1 minute | Prevent spam to LLM API |
| `/api/attempts/[id]/answer` (essay) | 10 submissions | 5 minutes | Prevent LLM cost abuse |

Rate limiting keys include user ID, role, and IP address where appropriate.

## Input Validation

### Zod Schemas
All API endpoints use Zod for strict input validation:
- Type checking
- Length constraints
- Range validation
- Custom business logic validation

### SQL Injection Prevention
- All database queries use parameterized statements
- Helper functions (`all`, `get`, `run`) enforce parameterized queries
- No string concatenation in SQL

## Security Headers

The following security headers are automatically added via middleware:

### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' https://generativelanguage.googleapis.com;
frame-src 'self';
```

### Additional Headers
- `X-DNS-Prefetch-Control: on`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## XSS Prevention

1. **No `dangerouslySetInnerHTML`**: React components avoid direct HTML injection
2. **React's automatic escaping**: All user content is escaped by default
3. **Input validation**: Length limits prevent extremely long inputs
4. **Output encoding**: React's JSX automatically encodes content

## SQL Injection Prevention

1. **Parameterized queries**: All database queries use parameter binding
2. **Prepared statements**: libsql client enforces parameterized queries
3. **Type safety**: TypeScript ensures proper query construction

## CSRF Protection

1. **SameSite cookies**: Session cookies use `SameSite=lax`
2. **State-changing methods**: Only POST/PUT/DELETE modify data
3. **Token-based API**: Session tokens stored in HTTP-only cookies

## API Security

### Authentication Check
- All API routes (except `/api/health`, `/api/auth/login`) require authentication
- Role-based access control (`requireUser("lecturer")`, `requireUser("student")`)
- Session validation on every protected request

### Error Handling
- Generic error messages to prevent information leakage
- Proper HTTP status codes (401, 403, 404, 429, 500)
- No stack traces in production responses

## LLM Integration Security

### Gemini API
- **Timeout**: 30 second limit on API calls
- **Safety Filters**: Respects Gemini's content safety filters
- **System Instructions**: Clear guidelines to prevent harmful outputs
- **Fallback**: Graceful degradation when LLM is unavailable
- **Cost Control**: Rate limiting prevents API abuse

### Content Moderation
- Academic disclaimers on all AI-generated content
- Neutral political stance
- References to official sources (UUD 1945, laws, etc.)
- Refusal to do students' work entirely

## Database Security

### SQLite Configuration
- Foreign keys enabled (`PRAGMA foreign_keys = ON`)
- Proper indexes for query optimization
- CHECK constraints for data integrity
- File permissions handled by OS

### Schema Constraints
- `role` CHECK constraint: only 'student' or 'lecturer'
- `type` CHECK constraint: only 'mcq', 'tf', or 'essay'
- `difficulty` CHECK constraint: only 'easy', 'medium', or 'hard'
- `status` CHECK constraint: only 'draft', 'open', or 'closed'
- `mode` CHECK constraint: only 'individual' or 'group'

## Live Quiz Security

### In-Memory Session Management
- PIN validation (6-digit, randomly generated)
- Host-only control for game state
- Player authentication required
- Answer validation (one attempt per question)
- Automatic timeout handling

### Anti-Cheating Measures
- Question shuffling option
- Individual/group modes
- Timer-based scoring (faster = more points)
- Attempt tracking (one per quiz per user)

## Environment Variables

### Required for Production
```bash
SESSION_PASSWORD        # 32+ characters, random string
DATABASE_PATH           # Path to SQLite database
```

### Optional (for AI Features)
```bash
GEMINI_API_KEY          # Google Gemini API key
GEMINI_MODEL            # Model name (default: gemini-2.5-flash)
```

### Security Notes
- Never commit `.env.local` to version control
- Use strong, random SESSION_PASSWORD
- Rotate API keys regularly
- Use different credentials for development and production

## Logging & Monitoring

### What's Logged
- LLM errors (warn level)
- Database errors (application level)
- Security events (rate limit hits, failed logins)

### What's NOT Logged
- Passwords or password hashes
- Full session tokens
- PII beyond what's necessary
- API keys or secrets

## Deployment Security

### Docker Image
- Multi-stage build for minimal attack surface
- Alpine-based for smaller footprint
- No unnecessary packages
- Filesystem read-only where possible

### Network Security
- Use HTTPS in production
- Configure proper firewall rules
- Use reverse proxy (nginx, traefik) for additional headers
- Enable HSTS

## Best Practices for Development

1. **Never hardcode secrets** in code
2. **Use environment variables** for configuration
3. **Keep dependencies updated** to patch vulnerabilities
4. **Run security audits**: `npm audit`
5. **Use type safety**: TypeScript catches many errors at compile time
6. **Test authentication** flows thoroughly
7. **Review PRs** for security issues
8. **Monitor logs** for suspicious activity
9. **Have incident response plan** ready
10. **Regular security reviews** of code and architecture

## Compliance Considerations

### Data Protection
- Minimal data collection
- No tracking/analytics
- User can request data deletion
- Passwords hashed, not stored

### Academic Integrity
- AI grading with manual review option
- Clear indication of AI-generated content
- Lecturer override capability
- Audit trail for score changes

## Future Security Enhancements

- [ ] Add 2FA for lecturer accounts
- [ ] Implement CSRF tokens for additional protection
- [ ] Add request signing for sensitive operations
- [ ] Implement audit logging for all data modifications
- [ ] Add CAPTCHA for failed login attempts
- [ ] Regular security penetration testing
- [ ] Implement database encryption at rest
- [ ] Add webhook security validation

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:
- Do not create public issues
- Contact the development team directly
- Allow time to fix before disclosure
- Follow responsible disclosure practices

## References

- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Web Security Guidelines](https://web.dev/articles/security)
