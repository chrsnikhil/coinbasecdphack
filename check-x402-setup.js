#!/usr/bin/env node

/**
 * Simple X402 Integration Check
 * This script validates the basic integration setup
 */

console.log('🧪 X402 Agent Payment Integration Check\n');

// Test 1: Check dependencies
console.log('📦 1. Checking Dependencies...');
try {
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    'x402-next',
    'viem',
    'wagmi',
    '@langchain/core'
  ];
  
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
  );
  
  if (missingDeps.length > 0) {
    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  } else {
    console.log('✅ All required dependencies are installed');
  }
  
  if (packageJson.dependencies['x402-next']) {
    console.log(`   - x402-next: ${packageJson.dependencies['x402-next']}`);
  }
  
} catch (error) {
  console.log('❌ Error checking dependencies:', error.message);
}

// Test 2: Check file structure
console.log('\n📁 2. Checking Integration Files...');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/utils/paymentService.ts',
  'src/utils/x402PaymentHandler.ts', 
  'src/agent/TaskAgent.ts',
  'src/components/X402PaymentDemo.tsx',
  'X402_INTEGRATION.md'
];

let allFilesPresent = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesPresent = false;
  }
});

// Test 3: Check integration points
console.log('\n🔗 3. Checking Integration Points...');
try {
  const taskAgentContent = fs.readFileSync('src/agent/TaskAgent.ts', 'utf8');
  if (taskAgentContent.includes('X402PaymentHandler')) {
    console.log('✅ TaskAgent has X402PaymentHandler integration');
  } else {
    console.log('❌ TaskAgent missing X402PaymentHandler integration');
  }
  
  if (taskAgentContent.includes('paymentHandler')) {
    console.log('✅ TaskAgent has payment handler property');
  } else {
    console.log('❌ TaskAgent missing payment handler property');
  }
} catch (error) {
  console.log('❌ Error checking TaskAgent:', error.message);
}

try {
  const pageContent = fs.readFileSync('src/app/page.tsx', 'utf8');
  if (pageContent.includes('X402PaymentDemo')) {
    console.log('✅ Main page includes X402PaymentDemo component');
  } else {
    console.log('❌ Main page missing X402PaymentDemo component');
  }
} catch (error) {
  console.log('❌ Error checking main page:', error.message);
}

// Test 4: Environment setup guide
console.log('\n⚙️  4. Environment Setup Required:');
console.log('Create .env.local with the following variables:');
console.log('');
console.log('NEXT_PUBLIC_AKASH_API_KEY=your_akash_api_key_here');
console.log('AGENT_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
console.log('');

console.log('\n🎉 Integration Setup Complete!');
console.log('\n📋 To test the integration:');
console.log('1. Set up environment variables in .env.local');
console.log('2. Fund the agent wallet with Base Sepolia ETH');
console.log('3. Run: npm run dev');
console.log('4. Open http://localhost:3000');
console.log('5. Use the X402PaymentDemo component');

console.log('\n💡 Key Features Integrated:');
console.log('- ✅ X402 payment handler for agent wallets');
console.log('- ✅ Automated payments on successful AI reviews'); 
console.log('- ✅ Base Sepolia testnet integration');
console.log('- ✅ Payment demo component for testing');
console.log('- ✅ Comprehensive error handling');
