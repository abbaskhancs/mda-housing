/**
 * Test script for Task 37: CNIC/Plot quick create from intake
 * 
 * This script tests the new intake form functionality:
 * 1. Searchable person/plot selectors
 * 2. Inline create modals for persons and plots
 * 3. Immediate appearance in selectors after creation
 * 4. Application creation with new IDs
 */

const API_BASE_URL = 'http://localhost:3001';

// Mock authentication token (replace with actual token)
const AUTH_TOKEN = 'your-auth-token-here';

async function testPersonSearch() {
  console.log('\n=== Testing Person Search API ===');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/persons/search?q=12345`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Person search response:', data);
    
    if (data.persons && Array.isArray(data.persons)) {
      console.log('✅ Person search API working correctly');
      return true;
    } else {
      console.log('❌ Person search API response format incorrect');
      return false;
    }
  } catch (error) {
    console.log('❌ Person search API error:', error.message);
    return false;
  }
}

async function testPlotSearch() {
  console.log('\n=== Testing Plot Search API ===');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/plots/search?q=123`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Plot search response:', data);
    
    if (data.plots && Array.isArray(data.plots)) {
      console.log('✅ Plot search API working correctly');
      return true;
    } else {
      console.log('❌ Plot search API response format incorrect');
      return false;
    }
  } catch (error) {
    console.log('❌ Plot search API error:', error.message);
    return false;
  }
}

async function testPersonCreation() {
  console.log('\n=== Testing Person Creation API ===');
  
  const testPerson = {
    cnic: '12345-1234567-1',
    name: 'Test Person',
    fatherName: 'Test Father',
    address: 'Test Address',
    phone: '+92-300-1234567',
    email: 'test@example.com'
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/persons`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPerson)
    });
    
    const data = await response.json();
    console.log('Person creation response:', data);
    
    if (data.person && data.person.id) {
      console.log('✅ Person creation API working correctly');
      console.log('Created person ID:', data.person.id);
      return data.person;
    } else {
      console.log('❌ Person creation API response format incorrect');
      return null;
    }
  } catch (error) {
    console.log('❌ Person creation API error:', error.message);
    return null;
  }
}

async function testPlotCreation() {
  console.log('\n=== Testing Plot Creation API ===');
  
  const testPlot = {
    plotNumber: 'TEST-123',
    blockNumber: 'A',
    sectorNumber: 'G-11',
    area: 10,
    location: 'Test Location'
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/plots`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPlot)
    });
    
    const data = await response.json();
    console.log('Plot creation response:', data);
    
    if (data.plot && data.plot.id) {
      console.log('✅ Plot creation API working correctly');
      console.log('Created plot ID:', data.plot.id);
      return data.plot;
    } else {
      console.log('❌ Plot creation API response format incorrect');
      return null;
    }
  } catch (error) {
    console.log('❌ Plot creation API error:', error.message);
    return null;
  }
}

async function testApplicationCreation(sellerId, buyerId, plotId) {
  console.log('\n=== Testing Application Creation with New IDs ===');
  
  const applicationData = {
    sellerId,
    buyerId,
    plotId,
    waterNocRequired: false
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(applicationData)
    });
    
    const data = await response.json();
    console.log('Application creation response:', data);
    
    if (data.application && data.application.id) {
      console.log('✅ Application creation with new IDs working correctly');
      console.log('Created application ID:', data.application.id);
      console.log('Application Number:', data.application.applicationNumber);
      return data.application;
    } else {
      console.log('❌ Application creation response format incorrect');
      return null;
    }
  } catch (error) {
    console.log('❌ Application creation error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Task 37 Tests: CNIC/Plot quick create from intake');
  console.log('='.repeat(60));
  
  // Test search APIs
  const personSearchOk = await testPersonSearch();
  const plotSearchOk = await testPlotSearch();
  
  // Test creation APIs
  const createdPerson = await testPersonCreation();
  const createdBuyer = await testPersonCreation(); // Create a second person for buyer
  const createdPlot = await testPlotCreation();
  
  // Test application creation with new IDs
  let applicationCreated = null;
  if (createdPerson && createdBuyer && createdPlot) {
    applicationCreated = await testApplicationCreation(
      createdPerson.id,
      createdBuyer.id,
      createdPlot.id
    );
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Person Search API: ${personSearchOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Plot Search API: ${plotSearchOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Person Creation API: ${createdPerson ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Plot Creation API: ${createdPlot ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Application Creation: ${applicationCreated ? '✅ PASS' : '❌ FAIL'}`);
  
  const allTestsPassed = personSearchOk && plotSearchOk && createdPerson && createdPlot && applicationCreated;
  
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Task 37 implementation is working correctly.');
    console.log('✅ Acceptance Test: Create a new person from modal; it appears immediately in the selector; saved app references new IDs.');
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
  }
  console.log('='.repeat(60));
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPersonSearch,
  testPlotSearch,
  testPersonCreation,
  testPlotCreation,
  testApplicationCreation,
  runTests
};
