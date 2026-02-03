```yaml
applyTo: '**'
```

## LANGUAGE & COMMUNICATION
- All code, comments, variables, functions, classes, files, and folders MUST use English
- No emojis in code, components, or embeds (except Discord emojis: `<:emoji_name:emoji_id>`)
- Comments should be minimal and meaningful only - don't spam comments everywhere
- Comment format: `// - COMMENT - \\` (single line only)
- Console log format: `[ - TITLE - ] message`
- Keep it simple, no need fancy words - just make it work and readable

## CODE STYLE & FORMATTING
- Use `snake_case` for all naming conventions - consistency is key
- Code must be clean and well-organized - if messy, refactor immediately
- Align `=` operators vertically - make it look professional
- Align `:` colons vertically - easier to read
- Align `from` imports vertically - keep imports organized
- Follow existing project structure and patterns - don't create your own standard
- Use JSDoc style documentation for all functions with `@param`, `@return`, etc.
- Indentation must be consistent - either 2 spaces or 4 spaces, pick one and stick to it
- No trailing whitespaces - clean code = happy developer
- Max line length 120 characters - don't make horizontal scrolling
- One statement per line - don't compress everything into one line

## PERFORMANCE & OPTIMIZATION PRIORITIES
1. **Performance First**: Optimize for speed and efficiency in all implementations
   - If something can run faster, make it faster
   - Don't use loops when you can use map/filter/reduce
   - Avoid nested loops as much as possible
   - Use early returns to avoid unnecessary processing
   
2. **Cloud Cost Reduction**: Minimize unnecessary API calls, database queries, and compute resources
   - Every API call = money, so be smart about it
   - Batch your requests whenever possible
   - Use pagination properly - don't fetch everything at once
   - Implement request debouncing for user inputs
   - Cache API responses when data doesn't change frequently
   
3. **Database Efficiency**: 
   - Use connection pooling - don't create new connection every time
   - Implement proper indexing - slow queries = wasted money
   - Optimize queries (avoid N+1 problems) - this is super important
   - Use batch operations where possible - insert 1000 rows at once, not one by one
   - Implement caching strategies - Redis is your friend
   - Use SELECT specific columns, not SELECT * - don't fetch what you don't need
   - Implement database query timeout - don't let queries hang forever
   - Use EXPLAIN to analyze slow queries
   - Archive old data - don't keep everything in main tables forever
   
4. **Memory Management**: Clean up resources, avoid memory leaks
   - Clear intervals and timeouts when done
   - Remove event listeners when component unmounts
   - Don't store large objects in memory unnecessarily
   - Use WeakMap/WeakSet for cache when appropriate
   - Monitor memory usage in production
   
5. **Lazy Loading**: Load resources only when needed
   - Don't import everything at start - use dynamic imports
   - Load images/assets on demand
   - Defer non-critical operations

## DATABASE REQUIREMENTS
- **Persistence Required**: All important data MUST be stored in database to survive bot restarts
  - Bot restart = data gone if not in DB, so save everything important
  
- **Critical Data to Persist**:
  - Reminders - users will be mad if their reminders disappear
  - AFK status - must survive restart
  - Tickets - very important, cannot lose ticket data
  - User preferences - dark mode, language, etc.
  - Command configurations - custom prefix, disabled commands, etc.
  - Moderation logs - warnings, kicks, bans
  - Economy data - coins, inventory, transactions
  - Leveling/XP data - don't reset user progress
  - Custom roles/permissions
  - Temporary data with TTL - use Redis for this
  - Any stateful data - if it matters, save it
  
- **Security**:
  - Use parameterized queries to prevent SQL injection - never concatenate SQL strings
  - Encrypt sensitive data - passwords, tokens, API keys
  - Implement proper access controls - not everyone should access everything
  - Regular backups - automate this, test restore process
  - Hash passwords with bcrypt - minimum 10 rounds
  - Use environment variables for secrets - never hardcode credentials
  - Implement database user with minimum required permissions
  - Enable SSL/TLS for database connections
  - Audit log for sensitive operations
  
- **Efficiency**:
  - Index frequently queried fields - user_id, server_id, created_at, etc.
  - Use transactions for multi-step operations - all or nothing
  - Implement query result caching - don't query same thing repeatedly
  - Monitor slow queries - set up alerts for queries > 1 second
  - Use read replicas for heavy read operations
  - Partition large tables - don't put millions of rows in one table
  - Clean up old data regularly - implement data retention policy
  - Use appropriate data types - don't use VARCHAR(255) for everything
  - Normalize database properly - but don't over-normalize

## ERROR HANDLING
- **All errors MUST be logged with sufficient detail**
- **All scripts MUST connect to `../utils/error_logger` for error logging**
- **Never silently fail** - always log errors with context
  - Include what happened, where it happened, when it happened
  - Log user ID, server ID, command used, input parameters
  - Include stack traces in development
  - Sanitize error messages in production - don't expose sensitive info
  - Implement error monitoring - use Sentry or similar
  - Set up alerts for critical errors
  - Log to both file and console
  - Rotate log files - don't let logs fill up disk
  - Different log levels: DEBUG, INFO, WARN, ERROR, CRITICAL
  - Include timestamp in all logs - use ISO 8601 format
  - Graceful degradation - if feature fails, don't crash entire bot

## COMPONENT STRUCTURE
- **Messages MUST use Component v2** from `utils/components`
- **AVOID ERROR**: `Invalid Form Body components[0].components[0].accessory[BASE_TYPE_REQUIRED]`
  - This error is annoying, always validate before sending
- Always validate component structure before sending
- No emojis in components/embeds (except Discord format: `<:name:id>`)
- Use buttons instead of reactions when possible - better UX
- Implement component collectors with timeout - don't let them run forever
- Clean up components after interaction - remove buttons when done
- Use ephemeral messages for private responses
- Implement pagination for long lists - don't send 100 embeds at once
- Add loading states for slow operations
- Disable buttons during processing - prevent double clicks

## ARCHITECTURE PATTERNS

### Controller Pattern
- Commands related to same feature MUST use shared controller
- Example structure:
  ```
  /commands/tools/reminder/reminder.ts → calls → /shared/controllers/reminder_controller.ts
  /commands/tools/reminder/reminder_cancel.ts → calls → /shared/controllers/reminder_controller.ts
  /commands/tools/reminder/reminder_list.ts → calls → /shared/controllers/reminder_controller.ts
  ```
- Controllers handle business logic, commands handle user interaction
- Keep commands thin - just validation and calling controller
- Controllers should be testable independently
- Use dependency injection when possible
- Separate concerns - one controller = one feature

### Service Layer
- Create services for complex business logic
- Services should be reusable across controllers
- Example: `database_service.ts`, `cache_service.ts`, `notification_service.ts`
- Services should not depend on each other directly - use interfaces

### Repository Pattern
- Database operations should go through repositories
- Example: `user_repository.ts`, `reminder_repository.ts`
- Repositories abstract database layer - easier to switch databases later
- One repository per entity/table

### Utility Functions
- Follow existing utility functions pattern
- Don't reinvent the wheel - use existing utilities
- Create new utilities for repeated logic (DRY principle)
- Utils should be pure functions when possible
- Group related utils in same file
- Export commonly used utils from index file

### Middleware Pattern
- Use middleware for common operations: auth, logging, rate limiting
- Chain middleware properly
- Keep middleware focused - one responsibility per middleware

## FILE ORGANIZATION
- Commands MUST be placed in folders matching their function
- Example: reminder command → `/commands/tools/reminder/reminder.ts`
- Follow existing project file/folder structure strictly - don't create new patterns
- Group related files together
- File naming convention:
  ```
  commands/
    tools/
      reminder/
        reminder.ts
        reminder_cancel.ts
        reminder_list.ts
        reminder_edit.ts
    moderation/
      ban.ts
      kick.ts
      warn.ts
  shared/
    controllers/
      reminder_controller.ts
      moderation_controller.ts
    services/
      database_service.ts
      cache_service.ts
    repositories/
      user_repository.ts
      reminder_repository.ts
  utils/
    error_logger.ts
    components.ts
    validators.ts
    formatters.ts
  types/
    index.ts
    reminder.ts
    user.ts
  config/
    database.ts
    redis.ts
    constants.ts
  ```
- Keep files small - if > 300 lines, consider splitting
- One component/class per file (except small related types)
- Index files for easy imports

## DESIGN PRINCIPLES
- **Dark mode optimized** - default should be dark theme
- **Avoid excessive color gradients** - keep it simple
- **Use ShadCN original color palette** - don't make custom colors
- Clean and minimal UI/UX - less is more
- Consistent spacing - use 4px/8px/16px/24px/32px system
- Readable fonts - don't use fancy fonts for body text
- Proper contrast ratios - text must be readable
- Mobile-friendly - responsive design
- Loading states - show user something is happening
- Error states - show user what went wrong and how to fix
- Success feedback - confirm actions completed
- Accessibility - use proper ARIA labels

## VALIDATION & INPUT HANDLING
- **Validate ALL user inputs** - never trust user input
- Check data types - string, number, boolean, etc.
- Check string length - min/max length
- Check number ranges - min/max value
- Validate email format, URL format, etc.
- Sanitize inputs before processing - remove dangerous characters
- Implement rate limiting per user - prevent spam/abuse
- Validate file uploads - check size, type, content
- Use whitelist approach - allow only known good, not block known bad
- Provide clear error messages - tell user what's wrong and how to fix
- Validate on both client and server side

## TESTING REQUIREMENTS
- Write tests for critical functionality
- Unit tests for utilities and services
- Integration tests for controllers
- Test edge cases - empty input, null, undefined, very long strings, special characters
- Test error handling - what happens when things fail
- Mock external dependencies - database, APIs, etc.
- Aim for > 70% code coverage
- Run tests before every commit
- Automate testing in CI/CD pipeline
- Test performance - load testing for critical paths

## API DESIGN (if applicable)
- Use RESTful conventions - GET, POST, PUT, DELETE
- Versioning - `/api/v1/`, `/api/v2/`
- Consistent response format:
  ```json
  {
    "success": true,
    "data": {},
    "error": null,
    "timestamp": "2026-02-03T10:30:00Z"
  }
  ```
- Use proper HTTP status codes - 200, 201, 400, 401, 403, 404, 500
- Implement pagination - limit, offset, or cursor-based
- Rate limiting - protect your API
- Authentication & Authorization - who are you, what can you do
- API documentation - use Swagger/OpenAPI
- CORS configuration - don't allow * in production
- Request/Response logging

## ENVIRONMENT & CONFIGURATION
- Use `.env` file for configuration - never commit this file
- `.env.example` with dummy values - commit this
- Validate environment variables on startup - fail fast if missing
- Different configs for dev/staging/prod
- Use proper types for env variables - not everything is string
- Centralize configuration - one config file
- Support environment variable overrides
- Document all environment variables

## DEPLOYMENT & DEVOPS
- Use Docker for containerization - consistent environments
- Docker Compose for local development
- Implement health check endpoints - `/health`, `/ready`
- Graceful shutdown - finish processing before exit
- Process management - use PM2 or similar
- Auto-restart on crash - but also fix the crash
- Monitor resource usage - CPU, memory, disk
- Set up alerts for high resource usage
- Blue-green deployment or rolling updates
- Rollback plan - what if deployment fails
- Database migrations - version controlled, reversible

## MONITORING & OBSERVABILITY
- Application logs - what is happening
- Error logs - what went wrong
- Performance metrics - how fast/slow
- Business metrics - how many users, commands, etc.
- Set up dashboards - Grafana, Datadog, etc.
- Uptime monitoring - is bot online
- Alert on anomalies - sudden spike in errors, memory, etc.
- Track user behavior - which commands are popular
- Monitor third-party dependencies - APIs, databases

## PRE-DEPLOYMENT CHECKLIST
- [ ] Double-check for red error indicators in code
- [ ] Build successfully (`npm run build` or equivalent)
- [ ] Test all modified functionality
- [ ] Verify database connections
- [ ] Check error logging integration
- [ ] Validate component v2 usage
- [ ] Review performance implications
- [ ] Ensure no memory leaks
- [ ] Confirm all data persistence works
- [ ] Code is clean and well-organized
- [ ] All tests pass
- [ ] No console.log in production code - use proper logger
- [ ] Environment variables properly set
- [ ] Database migrations run successfully
- [ ] No hardcoded secrets or credentials
- [ ] Dependencies updated and secure
- [ ] Documentation updated
- [ ] Changelog updated

## QUALITY GATES (MANDATORY BEFORE PR)
1. ✅ Code builds without errors
2. ✅ All tests pass
3. ✅ No TypeScript/linting errors
4. ✅ Error logging properly integrated
5. ✅ Database persistence verified
6. ✅ Performance tested
7. ✅ Code reviewed for optimization opportunities
8. ✅ Cloud cost impact assessed
9. ✅ No security vulnerabilities
10. ✅ Code reviewed by at least one other developer
11. ✅ Documentation complete
12. ✅ Breaking changes documented and communicated

## OPTIMIZATION CHECKLIST
- [ ] Minimize database round-trips - batch queries when possible
- [ ] Use bulk operations where possible - insert many, not one by one
- [ ] Implement caching for frequently accessed data - reduce DB load
- [ ] Avoid blocking operations in main thread - use async/await
- [ ] Use async/await properly - don't make everything sequential if can be parallel
- [ ] Clean up event listeners and timers - prevent memory leaks
- [ ] Optimize bundle size - tree shaking, code splitting
- [ ] Reduce unnecessary dependencies - audit regularly
- [ ] Compress responses - gzip/brotli
- [ ] Optimize images - compress, use appropriate formats
- [ ] Use CDN for static assets
- [ ] Minimize re-renders in frontend
- [ ] Debounce/throttle expensive operations
- [ ] Use worker threads for CPU-intensive tasks
- [ ] Profile code to find bottlenecks

## SECURITY BEST PRACTICES
- Validate all user inputs - sanitize and validate
- Sanitize data before database operations - prevent injection
- Use environment variables for secrets - never hardcode
- Implement rate limiting - prevent abuse
- Log security events - track suspicious activity
- Regular dependency updates - patch vulnerabilities
- Use HTTPS everywhere - no plain HTTP
- Implement CSRF protection
- Use secure session management
- Implement proper authentication - JWT, OAuth, etc.
- Hash sensitive data - bcrypt, argon2
- Principle of least privilege - minimal permissions
- Regular security audits
- Keep dependencies updated - use Dependabot
- Input validation on both client and server
- Output encoding to prevent XSS
- Use Content Security Policy headers
- Implement helmet.js for security headers

## CODE REVIEW GUIDELINES
- Review your own code first - don't submit obvious mistakes
- Check for logic errors
- Check for performance issues
- Check for security vulnerabilities
- Check code readability - can others understand it
- Check test coverage - are critical paths tested
- Check documentation - is it clear what code does
- Be respectful in comments - we're all learning
- Explain why, not just what - context matters
- Suggest improvements, not just problems
- Approve only if you would deploy it yourself

## DOCUMENTATION REQUIREMENTS
- README.md - how to setup, run, deploy
- API documentation - endpoints, parameters, responses
- Code comments for complex logic - why, not what
- JSDoc for all public functions - parameters, return types, examples
- Architecture decisions - why we chose this approach
- Setup guides - step by step for new developers
- Troubleshooting guide - common issues and solutions
- Changelog - what changed in each version
- Contributing guide - how others can contribute

## TYPESCRIPT SPECIFIC
- Use strict mode - enable all strict checks
- Define proper types - avoid `any` as much as possible
- Use interfaces for object shapes
- Use type guards for runtime checks
- Use enums for fixed sets of values
- Use generics for reusable components
- Export types from dedicated types file
- Use utility types - Partial, Pick, Omit, etc.
- Avoid type assertions unless absolutely necessary
- Use discriminated unions for complex states

## DISCORD.JS SPECIFIC
- Use slash commands - legacy prefix commands are outdated
- Implement command cooldowns - prevent spam
- Check bot permissions before executing - fail gracefully
- Handle missing permissions properly - tell user what's needed
- Use interaction.deferReply() for slow operations - prevent timeout
- Clean up message collectors/listeners - prevent memory leaks
- Use proper intent flags - request only what you need
- Handle rate limits gracefully - don't spam API
- Use embeds for rich content - better UX than plain text
- Implement proper error handling for API errors
- Cache frequently accessed data - reduce API calls
- Use bulk delete for cleaning messages - more efficient
- Implement proper sharding for large bots

## GIT WORKFLOW
- Commit often - small, atomic commits
- Write clear commit messages - what and why
- Use conventional commits - feat:, fix:, docs:, etc.
- Create feature branches - don't commit to main
- Pull request for all changes - code review required
- Squash commits before merge - keep history clean
- Delete merged branches - keep repo clean
- Tag releases - semantic versioning
- Keep commits focused - one thing per commit
- Don't commit generated files - build artifacts, node_modules, etc.
- Use .gitignore properly

## COMMON PITFALLS TO AVOID
- ❌ Not handling promise rejections - always catch errors
- ❌ Callback hell - use async/await
- ❌ Not closing database connections - memory leaks
- ❌ Hardcoded values - use constants/config
- ❌ Ignoring TypeScript errors - fix them, don't ignore
- ❌ Not validating environment variables - fail fast
- ❌ console.log in production - use proper logger
- ❌ Synchronous file operations - use async versions
- ❌ Not implementing timeouts - operations can hang
- ❌ Ignoring edge cases - test edge cases
- ❌ Copy-paste code - refactor to reusable functions
- ❌ Premature optimization - profile first, then optimize
- ❌ Not reading error messages - error messages are helpful
- ❌ Assuming data exists - always check null/undefined
- ❌ Not cleaning up resources - close connections, clear timers

## BEST PRACTICES
- ✅ Code for readability first - others will read your code
- ✅ Make it work, make it right, make it fast - in that order
- ✅ DRY (Don't Repeat Yourself) - but don't over-abstract
- ✅ KISS (Keep It Simple, Stupid) - simplest solution that works
- ✅ YAGNI (You Aren't Gonna Need It) - don't build what you don't need
- ✅ Fail fast - catch errors early
- ✅ Progressive enhancement - basic functionality first
- ✅ Defensive programming - assume things can go wrong
- ✅ Code reviews - learn from others
- ✅ Refactor regularly - technical debt accumulates
- ✅ Automate repetitive tasks - scripts, CI/CD
- ✅ Document decisions - future you will thank you
- ✅ Monitor production - know when things break
- ✅ Learn from mistakes - post-mortems for incidents

---

## FINAL NOTES

**REMEMBER**: 
- Performance, cost-efficiency, and database optimization are TOP PRIORITIES in every implementation decision
- If in doubt, ask - don't assume
- Test your code - don't rely on "it should work"
- Read error messages - they usually tell you what's wrong
- Google is your friend - but understand what you copy
- Keep learning - technology changes fast
- Code quality matters - you or someone else will maintain this code
- User experience matters - we're building this for users
- Be proud of your code - but also be willing to improve it

**THE GOLDEN RULE**: Write code like the person maintaining it is a violent psychopath who knows where you live. Make it clean, make it clear, make it work.