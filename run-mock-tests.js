// Test runner for mock server integration tests
import IntegrationTester from './test-integration.js';

console.log('🚀 Starting Mock Server Integration Tests...');
console.log('='.repeat(50));
console.log('Note: This uses a mock server without MongoDB dependency');
console.log('='.repeat(50));

const tester = new IntegrationTester();
tester.runAllTests()
  .then(report => {
    if (report.error) {
      console.error('❌ Test suite failed:', report.error);
      process.exit(1);
    } else {
      console.log('\n🎯 Test Summary:');
      console.log(`Total Tests: ${report.total}`);
      console.log(`Passed: ${report.passed} ✅`);
      console.log(`Failed: ${report.failed} ❌`);
      console.log(`Success Rate: ${report.successRate.toFixed(1)}%`);
      
      if (report.failed === 0) {
        console.log('\n🎉 All tests passed! Mock integration is working correctly.');
        console.log('💡 To test with real backend, start MongoDB and use: node start-server.js');
        process.exit(0);
      } else {
        console.log('\n⚠️ Some tests failed. Please review the output above.');
        process.exit(1);
      }
    }
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
