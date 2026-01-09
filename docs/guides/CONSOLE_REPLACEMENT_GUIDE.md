# Console Statement Replacement Guide

## Overview
This guide helps replace all `console.log`, `console.error`, `console.warn`, and `console.debug` statements with the centralized logger utility.

## Replacement Patterns

### 1. Import Statement
Add at the top of the file (after other imports):
```typescript
import { logger } from '@/lib/logger'
```

### 2. Console.error Replacements

**Pattern 1:** `console.error('message', error)`
```typescript
// Before
console.error('Error loading user:', userError)

// After
logger.error('Error loading user', userError)
```

**Pattern 2:** `console.error('message')`
```typescript
// Before
console.error('Error occurred')

// After
logger.error('Error occurred')
```

### 3. Console.warn Replacements

**Pattern 1:** `console.warn('message', data)`
```typescript
// Before
console.warn('Warning message', data)

// After
logger.warn('Warning message', data)
```

**Pattern 2:** `console.warn('message')`
```typescript
// Before
console.warn('Warning message')

// After
logger.warn('Warning message')
```

### 4. Console.log Replacements

**Pattern 1:** `console.log('message', data)`
```typescript
// Before
console.log('Info message', data)

// After
logger.info('Info message', data)
```

**Pattern 2:** `console.log('message')`
```typescript
// Before
console.log('Info message')

// After
logger.info('Info message')
```

### 5. Console.debug Replacements

**Pattern 1:** `console.debug('message', data)`
```typescript
// Before
console.debug('Debug message', data)

// After
logger.debug('Debug message', data)
```

## Files to Update

### High Priority (Critical Files)
1. `app/(dashboard)/settings/SettingsPageClient.tsx` - 74 instances
2. `app/(dashboard)/accounts/AccountsPageClient.tsx` - 17 instances
3. `app/(dashboard)/vehicles/VehiclesPageClient.tsx` - 10 instances
4. `app/(dashboard)/dashboard/DashboardPageClient.tsx` - 13 instances
5. `app/(dashboard)/admin/layout.tsx` - 2 instances

### Medium Priority
- All other files in `app/(dashboard)/` directory
- API route files in `app/api/`

### Low Priority
- Component files in `components/`
- Utility files in `lib/`

## Automated Replacement

You can use find-and-replace in your IDE:

1. **Find:** `console.error\(`
2. **Replace:** `logger.error(`
3. **Find:** `console.warn\(`
4. **Replace:** `logger.warn(`
5. **Find:** `console.log\(`
6. **Replace:** `logger.info(`
7. **Find:** `console.debug\(`
8. **Replace:** `logger.debug(`

**Note:** After replacement, you may need to:
- Remove the second parameter if it's just a string (logger methods handle errors differently)
- Adjust parameter order (logger.error(message, error) vs console.error(message, error))

## Verification

After replacement, verify:
1. All files have `import { logger } from '@/lib/logger'`
2. No `console.` statements remain
3. Code compiles without errors
4. Logging works in development

