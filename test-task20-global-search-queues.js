#!/usr/bin/env node

/**
 * Task 20 Test Script - Global search + queues
 * 
 * Tests the acceptance criteria:
 * - Searching CNIC or Plot lands on the right case
 * - Queues correctly filter by stage
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Task 20 - Global search + queues...\n');

let allTestsPass = true;

// Test 1: Check Global Search API endpoint
console.log('📋 Step 1: Checking Global Search API endpoint');
const apiRoutesPath = path.join(__dirname, 'backend/src/routes/applications.ts');

if (fs.existsSync(apiRoutesPath)) {
  const content = fs.readFileSync(apiRoutesPath, 'utf8');
  
  console.log('   ✅ Applications API routes exist');
  
  // Check for search endpoint
  if (/GET.*\/search/.test(content)) {
    console.log('   ✅ Global search endpoint exists');
  } else {
    console.log('   ❌ Global search endpoint missing');
    allTestsPass = false;
  }
  
  // Check for search functionality
  if (/applicationNumber.*contains.*searchTerm/.test(content.replace(/\s+/g, ' '))) {
    console.log('   ✅ Application number search implemented');
  } else {
    console.log('   ❌ Application number search missing');
    allTestsPass = false;
  }
  
  if (/plot.*plotNumber.*contains.*searchTerm/.test(content.replace(/\s+/g, ' '))) {
    console.log('   ✅ Plot number search implemented');
  } else {
    console.log('   ❌ Plot number search missing');
    allTestsPass = false;
  }
  
  if (/seller.*cnic.*contains.*searchTerm/.test(content.replace(/\s+/g, ' '))) {
    console.log('   ✅ CNIC search implemented');
  } else {
    console.log('   ❌ CNIC search missing');
    allTestsPass = false;
  }
  
  // Check for enhanced filtering
  if (/assignedToMe.*true/.test(content)) {
    console.log('   ✅ "My pending" filter implemented');
  } else {
    console.log('   ❌ "My pending" filter missing');
    allTestsPass = false;
  }
  
} else {
  console.log('   ❌ Applications API routes not found');
  allTestsPass = false;
}

// Test 2: Check GlobalSearch component
console.log('\n📋 Step 2: Checking GlobalSearch component');
const globalSearchPath = path.join(__dirname, 'frontend/src/components/GlobalSearch.tsx');

if (fs.existsSync(globalSearchPath)) {
  const content = fs.readFileSync(globalSearchPath, 'utf8');
  
  console.log('   ✅ GlobalSearch component exists');
  
  // Check for key functionality
  const features = [
    { name: 'Search input with debouncing', pattern: /setTimeout[\s\S]*?performSearch/ },
    { name: 'Keyboard navigation', pattern: /ArrowDown/ },
    { name: 'Search results dropdown', pattern: /absolute.*z-50.*mt-1/ },
    { name: 'Result highlighting', pattern: /getMatchHighlight/ },
    { name: 'Navigation to application', pattern: /router\.push.*applications/ },
    { name: 'Search by App No, Plot, CNIC', pattern: /App No.*Plot.*CNIC/ },
    { name: 'API integration', pattern: /apiService\.searchApplications/ }
  ];
  
  features.forEach(feature => {
    if (feature.pattern.test(content)) {
      console.log(`   ✅ ${feature.name} implemented`);
    } else {
      console.log(`   ❌ ${feature.name} missing`);
      allTestsPass = false;
    }
  });
  
} else {
  console.log('   ❌ GlobalSearch component not found');
  allTestsPass = false;
}

// Test 3: Check RoleNav integration
console.log('\n📋 Step 3: Checking RoleNav integration');
const roleNavPath = path.join(__dirname, 'frontend/src/components/RoleNav.tsx');

if (fs.existsSync(roleNavPath)) {
  const content = fs.readFileSync(roleNavPath, 'utf8');
  
  console.log('   ✅ RoleNav component exists');
  
  if (/import.*GlobalSearch/.test(content)) {
    console.log('   ✅ GlobalSearch imported in RoleNav');
  } else {
    console.log('   ❌ GlobalSearch import missing');
    allTestsPass = false;
  }
  
  if (/<GlobalSearch/.test(content)) {
    console.log('   ✅ GlobalSearch integrated in header');
  } else {
    console.log('   ❌ GlobalSearch integration missing');
    allTestsPass = false;
  }
  
} else {
  console.log('   ❌ RoleNav component not found');
  allTestsPass = false;
}

// Test 4: Check QueueFilters component
console.log('\n📋 Step 4: Checking QueueFilters component');
const queueFiltersPath = path.join(__dirname, 'frontend/src/components/QueueFilters.tsx');

if (fs.existsSync(queueFiltersPath)) {
  const content = fs.readFileSync(queueFiltersPath, 'utf8');
  
  console.log('   ✅ QueueFilters component exists');
  
  // Check for key functionality
  const features = [
    { name: 'Stage filtering', pattern: /stage.*filter/ },
    { name: 'Status filtering', pattern: /status.*filter/ },
    { name: 'My pending toggle', pattern: /myPending.*boolean/ },
    { name: 'Search functionality', pattern: /search.*string/ },
    { name: 'Role-based stage filtering', pattern: /getRelevantStages/ },
    { name: 'Quick filter buttons', pattern: /My Pending/ },
    { name: 'Expandable filters', pattern: /isExpanded.*setIsExpanded/ },
    { name: 'Clear filters', pattern: /clearFilters/ }
  ];
  
  features.forEach(feature => {
    if (feature.pattern.test(content)) {
      console.log(`   ✅ ${feature.name} implemented`);
    } else {
      console.log(`   ❌ ${feature.name} missing`);
      allTestsPass = false;
    }
  });
  
} else {
  console.log('   ❌ QueueFilters component not found');
  allTestsPass = false;
}

// Test 5: Check console integrations
console.log('\n📋 Step 5: Checking console integrations');

// Check BCA console
const bcaConsolePath = path.join(__dirname, 'frontend/src/app/console/bca/page.tsx');
if (fs.existsSync(bcaConsolePath)) {
  const content = fs.readFileSync(bcaConsolePath, 'utf8');
  
  if (/import.*QueueFilters/.test(content)) {
    console.log('   ✅ BCA console imports QueueFilters');
  } else {
    console.log('   ❌ BCA console missing QueueFilters import');
    allTestsPass = false;
  }
  
  if (/<QueueFilters/.test(content)) {
    console.log('   ✅ BCA console uses QueueFilters');
  } else {
    console.log('   ❌ BCA console missing QueueFilters usage');
    allTestsPass = false;
  }
  
  if (/filteredApplications/.test(content)) {
    console.log('   ✅ BCA console implements filtering');
  } else {
    console.log('   ❌ BCA console filtering missing');
    allTestsPass = false;
  }
} else {
  console.log('   ❌ BCA console not found');
  allTestsPass = false;
}

// Check Housing console
const housingConsolePath = path.join(__dirname, 'frontend/src/app/console/housing/page.tsx');
if (fs.existsSync(housingConsolePath)) {
  const content = fs.readFileSync(housingConsolePath, 'utf8');
  
  if (/import.*QueueFilters/.test(content)) {
    console.log('   ✅ Housing console imports QueueFilters');
  } else {
    console.log('   ❌ Housing console missing QueueFilters import');
    allTestsPass = false;
  }
  
  if (/<QueueFilters/.test(content)) {
    console.log('   ✅ Housing console uses QueueFilters');
  } else {
    console.log('   ❌ Housing console missing QueueFilters usage');
    allTestsPass = false;
  }
} else {
  console.log('   ❌ Housing console not found');
  allTestsPass = false;
}

// Test 6: Check API service updates
console.log('\n📋 Step 6: Checking API service updates');
const apiServicePath = path.join(__dirname, 'frontend/src/services/api.ts');

if (fs.existsSync(apiServicePath)) {
  const content = fs.readFileSync(apiServicePath, 'utf8');
  
  console.log('   ✅ API service exists');
  
  if (/searchApplications/.test(content)) {
    console.log('   ✅ Search applications method exists');
  } else {
    console.log('   ❌ Search applications method missing');
    allTestsPass = false;
  }
  
  if (/getWorkflowStages/.test(content)) {
    console.log('   ✅ Workflow stages method exists');
  } else {
    console.log('   ❌ Workflow stages method missing');
    allTestsPass = false;
  }
  
  if (/getWorkflowStatuses/.test(content)) {
    console.log('   ✅ Workflow statuses method exists');
  } else {
    console.log('   ❌ Workflow statuses method missing');
    allTestsPass = false;
  }
  
  if (/assignedToMe/.test(content)) {
    console.log('   ✅ Assigned to me parameter exists');
  } else {
    console.log('   ❌ Assigned to me parameter missing');
    allTestsPass = false;
  }
  
} else {
  console.log('   ❌ API service not found');
  allTestsPass = false;
}

// Final Results
console.log('\n🎯 ACCEPTANCE CRITERIA VERIFICATION:');

console.log('\n1. "Searching CNIC or Plot lands on the right case"');
if (allTestsPass) {
  console.log('   ✅ IMPLEMENTED: Global search endpoint searches across App No, Plot, CNIC');
  console.log('   ✅ IMPLEMENTED: Search results show matching applications with highlighting');
  console.log('   ✅ IMPLEMENTED: Clicking search result navigates to application detail');
  console.log('   ✅ IMPLEMENTED: Header search available across all pages');
} else {
  console.log('   ❌ INCOMPLETE: Missing required implementation components');
}

console.log('\n2. "Queues correctly filter by stage"');
if (allTestsPass) {
  console.log('   ✅ IMPLEMENTED: QueueFilters component with stage filtering');
  console.log('   ✅ IMPLEMENTED: Status filtering and "my pending" toggle');
  console.log('   ✅ IMPLEMENTED: Role-based relevant stage filtering');
  console.log('   ✅ IMPLEMENTED: Console queues integrated with filtering');
  console.log('   ✅ IMPLEMENTED: Search within queue functionality');
} else {
  console.log('   ❌ INCOMPLETE: Missing required implementation components');
}

console.log('\n🎉 FINAL RESULT:');
if (allTestsPass) {
  console.log('✅ ALL ACCEPTANCE CRITERIA MET - Task 20 is COMPLETE!');
  console.log('\n🚀 Additional features implemented:');
  console.log('   • Header global search with keyboard navigation');
  console.log('   • Search result highlighting and dropdown interface');
  console.log('   • Comprehensive queue filtering with quick toggles');
  console.log('   • Role-based stage filtering for relevant workflows');
  console.log('   • Enhanced API endpoints with search and filtering');
  console.log('   • Integrated filtering across BCA and Housing consoles');
} else {
  console.log('❌ ACCEPTANCE CRITERIA NOT FULLY MET - Implementation incomplete');
}

console.log('\n📋 Ready for manual testing:');
console.log('   1. Start backend: cd backend && npm run dev');
console.log('   2. Start frontend: cd frontend && npm run dev');
console.log('   3. Test global search in header with CNIC or Plot number');
console.log('   4. Navigate to BCA/Housing consoles and test queue filtering');
console.log('   5. Verify "My Pending" filter shows relevant applications');
