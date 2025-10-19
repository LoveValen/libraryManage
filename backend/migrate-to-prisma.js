#!/usr/bin/env node

/**
 * Migration script to help identify and update Sequelize code to Prisma
 * This script will scan all files and provide a report of what needs to be updated
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to search for Sequelize usage
const sequelizePatterns = [
  // Direct imports
  /require\(['"]sequelize['"]\)/g,
  /require\(['"]\.\.?\/models['"]\)/g,
  /from ['"]sequelize['"]/g,
  /from ['"]\.\.?\/models['"]/g,
  
  // Model usage
  /models\.\w+\./g,
  /Model\.\w+\(/g,
  /DataTypes\./g,
  /Sequelize\./g,
  /sequelize\./g,
  
  // Common Sequelize methods
  /\.findAll\(/g,
  /\.findOne\(/g,
  /\.findByPk\(/g,
  /\.findOrCreate\(/g,
  /\.bulkCreate\(/g,
  /\.destroy\(/g,
  /\.restore\(/g,
  
  // Instance methods
  /\.toJSON\(\)/g,
  /\.toSafeJSON\(\)/g,
  /\.save\(\)/g,
  /\.reload\(\)/g,
  
  // Operators
  /Op\.\w+/g,
  /\[Op\.\w+\]/g,
  
  // Transactions
  /sequelize\.transaction/g,
  /transaction:/g,
  
  // Associations
  /\.hasMany\(/g,
  /\.belongsTo\(/g,
  /\.hasOne\(/g,
  /\.belongsToMany\(/g,
  
  // Hooks
  /\.beforeCreate\(/g,
  /\.afterCreate\(/g,
  /\.beforeUpdate\(/g,
  /\.afterUpdate\(/g,
];

// Files to exclude
const excludePatterns = [
  '**/node_modules/**',
  '**/migrations/**',
  '**/seeders/**',
  '**/*.sequelize.js',
  '**/migrate-to-prisma.js',
  '**/prisma/**'
];

// Mapping of common conversions
const conversionMap = {
  // Methods
  'findAll': 'findMany',
  'findOne': 'findFirst or findUnique',
  'findByPk': 'findUnique with id',
  'findOrCreate': 'upsert',
  'bulkCreate': 'createMany',
  'destroy': 'delete or deleteMany',
  'save': 'update',
  'toJSON': 'plain object (no conversion needed)',
  
  // Operators
  'Op.or': 'OR',
  'Op.and': 'AND',
  'Op.ne': 'not',
  'Op.eq': 'equals',
  'Op.gt': 'gt',
  'Op.gte': 'gte',
  'Op.lt': 'lt',
  'Op.lte': 'lte',
  'Op.like': 'contains',
  'Op.in': 'in',
  'Op.notIn': 'notIn',
  
  // Common patterns
  'models.User': 'prisma.users',
  'models.Book': 'prisma.books',
  'models.Borrow': 'prisma.borrows',
  'models.Review': 'prisma.reviews',
  'models.Notification': 'prisma.notifications',
  
  // Associations
  'include: [': 'include: {',
  'attributes: [': 'select: {',
  'where: {': 'where: {',
  'order: [[': 'orderBy: {',
  'limit:': 'take:',
  'offset:': 'skip:',
};

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];
  
  sequelizePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
        findings.push({
          file: filePath,
          line: lineNumber,
          match: match,
          pattern: pattern.toString()
        });
      });
    }
  });
  
  return findings;
}

function generateReport(findings) {
  const byFile = {};
  
  findings.forEach(finding => {
    if (!byFile[finding.file]) {
      byFile[finding.file] = [];
    }
    byFile[finding.file].push(finding);
  });
  
  console.log('\n📊 Sequelize Usage Report\n');
  console.log('=' .repeat(80));
  
  const files = Object.keys(byFile).sort();
  console.log(`\nTotal files with Sequelize usage: ${files.length}\n`);
  
  files.forEach(file => {
    console.log(`\n📁 ${file}`);
    console.log('-'.repeat(80));
    
    const uniqueMatches = [...new Set(byFile[file].map(f => f.match))];
    uniqueMatches.forEach(match => {
      const lines = byFile[file].filter(f => f.match === match).map(f => f.line);
      console.log(`   Line ${lines.join(', ')}: ${match}`);
      
      // Suggest conversion if available
      Object.keys(conversionMap).forEach(key => {
        if (match.includes(key)) {
          console.log(`   ✨ Suggestion: Replace with ${conversionMap[key]}`);
        }
      });
    });
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📝 Migration Checklist:\n');
  console.log('1. Update all model imports to use Prisma client');
  console.log('2. Replace Sequelize query methods with Prisma equivalents');
  console.log('3. Update associations to use Prisma relations');
  console.log('4. Move hooks/validations to service layer');
  console.log('5. Update transaction handling');
  console.log('6. Replace operators with Prisma syntax');
  console.log('7. Update instance methods to service methods');
  console.log('8. Test all endpoints after migration');
}

// Main execution
console.log('🔍 Scanning for Sequelize usage in backend...\n');

const srcPath = path.join(__dirname, 'src');
const files = glob.sync('**/*.js', {
  cwd: srcPath,
  ignore: excludePatterns
});

const allFindings = [];

files.forEach(file => {
  const filePath = path.join(srcPath, file);
  const findings = scanFile(filePath);
  allFindings.push(...findings);
});

generateReport(allFindings);

// Generate summary for specific directories
console.log('\n📊 Summary by Directory:\n');

const dirSummary = {};
allFindings.forEach(finding => {
  const dir = path.dirname(finding.file).split(path.sep).pop();
  if (!dirSummary[dir]) {
    dirSummary[dir] = 0;
  }
  dirSummary[dir]++;
});

Object.entries(dirSummary)
  .sort((a, b) => b[1] - a[1])
  .forEach(([dir, count]) => {
    console.log(`   ${dir}: ${count} occurrences`);
  });

console.log('\n✅ Scan complete!\n');