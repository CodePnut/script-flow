/**
 * Global Teardown for Playwright Tests
 * 
 * Runs once after all tests complete.
 * Used for cleaning up test environment, database, etc.
 */

import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown() {
  console.log('🧹 Starting global teardown for Playwright tests...')
  
  try {
    // Clean up any test data or temporary files
    console.log('🗑️  Cleaning up test data...')
    
    // Clean up temporary test files
    const tempDir = path.join(process.cwd(), 'temp')
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      console.log('✅ Cleaned up temporary files')
    }

    // Clean up old test results (keep last 10 runs)
    const resultsDir = path.join(process.cwd(), 'test-results')
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir)
      if (files.length > 10) {
        // Sort by modification time and remove oldest
        files.sort((a, b) => {
          const aStat = fs.statSync(path.join(resultsDir, a))
          const bStat = fs.statSync(path.join(resultsDir, b))
          return aStat.mtime.getTime() - bStat.mtime.getTime()
        })
        
        // Remove oldest files
        files.slice(0, files.length - 10).forEach(file => {
          const filePath = path.join(resultsDir, file)
          fs.rmSync(filePath, { recursive: true, force: true })
        })
        console.log('✅ Cleaned up old test results')
      }
    }

    // Close any remaining browser instances
    console.log('🔒 Closing browser instances...')
    
    // Generate test summary report
    console.log('📊 Generating test summary...')
    generateTestSummary()

    // Clean up environment variables
    delete process.env.TEST_GLOBAL_SETUP_COMPLETE
    
    console.log('✅ Global teardown completed successfully')
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw error in teardown to avoid masking test results
  }
}

/**
 * Generate a summary of test results
 */
function generateTestSummary() {
  try {
    const reportPath = path.join(process.cwd(), 'playwright-report', 'summary.json')
    const resultsPath = path.join(process.cwd(), 'playwright-results.json')
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
      
      const summary = {
        totalTests: results.suites?.reduce((acc: number, suite: any) => 
          acc + (suite.specs?.length || 0), 0) || 0,
        passed: results.suites?.reduce((acc: number, suite: any) => 
          acc + (suite.specs?.filter((spec: any) => spec.ok).length || 0), 0) || 0,
        failed: results.suites?.reduce((acc: number, suite: any) => 
          acc + (suite.specs?.filter((spec: any) => !spec.ok).length || 0), 0) || 0,
        duration: results.duration || 0,
        timestamp: new Date().toISOString(),
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2))
      console.log('📋 Test summary generated')
    }
  } catch (error) {
    console.warn('⚠️  Could not generate test summary:', error)
  }
}

export default globalTeardown