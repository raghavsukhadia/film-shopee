/**
 * Script to replace console statements with logger
 * 
 * Usage: node scripts/replace-console-statements.js
 * 
 * This script will:
 * 1. Find all console.log/error/warn/debug statements
 * 2. Replace them with logger equivalents
 * 3. Add logger import if not present
 */

const fs = require('fs')
const path = require('path')

const filesToProcess = [
  'app/**/*.tsx',
  'app/**/*.ts',
  'components/**/*.tsx',
  'lib/**/*.ts',
]

// Patterns to replace
const replacements = [
  {
    pattern: /console\.error\((['"`])(.*?)\1\s*,\s*(.+?)\)/g,
    replacement: "logger.error('$2', $3)",
  },
  {
    pattern: /console\.error\((['"`])(.*?)\1\)/g,
    replacement: "logger.error('$2')",
  },
  {
    pattern: /console\.warn\((['"`])(.*?)\1\s*,\s*(.+?)\)/g,
    replacement: "logger.warn('$2', $3)",
  },
  {
    pattern: /console\.warn\((['"`])(.*?)\1\)/g,
    replacement: "logger.warn('$2')",
  },
  {
    pattern: /console\.log\((['"`])(.*?)\1\s*,\s*(.+?)\)/g,
    replacement: "logger.info('$2', $3)",
  },
  {
    pattern: /console\.log\((['"`])(.*?)\1\)/g,
    replacement: "logger.info('$2')",
  },
  {
    pattern: /console\.debug\((['"`])(.*?)\1\s*,\s*(.+?)\)/g,
    replacement: "logger.debug('$2', $3)",
  },
  {
    pattern: /console\.debug\((['"`])(.*?)\1\)/g,
    replacement: "logger.debug('$2')",
  },
]

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Apply replacements
    for (const { pattern, replacement } of replacements) {
      const newContent = content.replace(pattern, replacement)
      if (newContent !== content) {
        content = newContent
        modified = true
      }
    }

    // Add logger import if not present and file was modified
    if (modified && !content.includes("from '@/lib/logger'") && !content.includes('from "@/lib/logger"')) {
      // Find the last import statement
      const importMatch = content.match(/^import .+ from ['"].+['"];?$/gm)
      if (importMatch && importMatch.length > 0) {
        const lastImport = importMatch[importMatch.length - 1]
        const lastImportIndex = content.lastIndexOf(lastImport)
        const insertIndex = lastImportIndex + lastImport.length
        content = content.slice(0, insertIndex) + "\nimport { logger } from '@/lib/logger'" + content.slice(insertIndex)
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`Processed: ${filePath}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
    return false
  }
}

// Note: This is a template script. For actual execution, you would need to:
// 1. Use glob to find all files
// 2. Process each file
// 3. Handle edge cases

console.log('Console replacement script created. Run manually or use a tool like jscodeshift for better results.')

