#!/usr/bin/env node

/**
 * Test script for X402 Agent Payment Integration
 * This script tests the payment functionality without running the full Next.js app
 */

const { createPublicClient, http } = require('viem');
const { baseSepolia } = require('viem/chains');

async function testX402Integration() {
  console.log('🧪 Testing X402 Agent Payment Integration\n');

  // Test 1: Check if required environment variables are set
  console.log('📋 1. Checking Environment Variables...');
  const requiredEnvVars = ['AGENT_PRIVATE_KEY', 'NEXT_PUBLIC_AKASH_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('Please set these in your .env.local file');
    return;
  }
  console.log('✅ All required environment variables are set');

  // Test 2: Check network connectivity
  console.log('\n🌐 2. Testing Base Sepolia Connection...');
  try {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org')
    });
    
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Connected to Base Sepolia. Latest block: ${blockNumber}`);
  } catch (error) {
    console.log('❌ Failed to connect to Base Sepolia:', error.message);
    return;
  }

  // Test 3: Check agent wallet
  console.log('\n💼 3. Checking Agent Wallet...');
  try {
    const { privateKeyToAccount } = require('viem/accounts');
    const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);
    console.log(`✅ Agent wallet address: ${account.address}`);
    
    // Check balance
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org')
    });
    
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceETH = Number(balance) / 1e18;
    console.log(`💰 Agent wallet balance: ${balanceETH.toFixed(6)} ETH`);
    
    if (balanceETH < 0.01) {
      console.log('⚠️  Warning: Low balance. Consider funding the wallet for testing.');
    }
  } catch (error) {
    console.log('❌ Invalid agent private key or wallet error:', error.message);
    return;
  }

  // Test 4: Check dependencies
  console.log('\n📦 4. Checking Dependencies...');
  try {
    require('x402-next');
    console.log('✅ x402-next library is installed');
  } catch (error) {
    console.log('❌ x402-next library not found. Run: npm install x402-next');
    return;
  }

  try {
    require('@langchain/core');
    console.log('✅ @langchain/core library is installed');
  } catch (error) {
    console.log('❌ @langchain/core library not found');
    return;
  }

  // Test 5: File structure check
  console.log('\n📁 5. Checking File Structure...');
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'src/utils/paymentService.ts',
    'src/utils/x402PaymentHandler.ts',
    'src/agent/TaskAgent.ts',
    'src/components/X402PaymentDemo.tsx'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(__dirname, file)));
  
  if (missingFiles.length > 0) {
    console.log(`❌ Missing files: ${missingFiles.join(', ')}`);
    return;
  }
  console.log('✅ All required files are present');

  console.log('\n🎉 X402 Integration Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Open http://localhost:3000');
  console.log('3. Connect your wallet');
  console.log('4. Use the X402PaymentDemo component to test payments');
  console.log('5. Monitor the console for payment transaction details');
  
  console.log('\n💡 Test Payment Flow:');
  console.log('- Click "Test Direct Agent Payment" to test basic payment functionality');
  console.log('- Click "Test Task Review + Payment" to test the full AI review + payment flow');
  console.log('- Check Base Sepolia explorer for transaction confirmation');
}

// Run the test
testX402Integration().catch(console.error);
