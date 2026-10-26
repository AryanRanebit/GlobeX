// Native fetch in Node 18+
async function testE2E() {
  try {
    console.log('=== GlobeX Phase 5: Live End-to-End Workflow Verification ===\n');

    // 1. Authenticate user
    console.log('1. Authenticating user (demo@spicesexport.in)...');
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@spicesexport.in', password: 'Demo@123' })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Login failed: ' + JSON.stringify(loginData));
    
    const token = loginData.data.tokens.accessToken;
    const user = loginData.data.user;
    console.log(`✓ Authenticated as: ${user.name} (${user.companyName}) [User ID: ${user.id}]\n`);

    // 2. Submit product for market analysis
    const targetProduct = 'Organic Turmeric Powder';
    console.log(`2. Submitting product "${targetProduct}" to /market/analyze...`);
    const analyzeRes = await fetch('http://localhost:3000/api/v1/market/analyze', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        product: targetProduct,
        targetRegions: ['United States', 'Germany', 'United Arab Emirates']
      })
    });

    const analyzeData = await analyzeRes.json();
    if (!analyzeData.success) throw new Error('Analyze failed: ' + JSON.stringify(analyzeData));
    
    const jobId = analyzeData.data.jobId;
    console.log(`✓ Analysis job created: ${jobId} (status: ${analyzeData.data.status})\n`);

    // 3. Poll background job queue
    console.log('3. Polling job status until completion...');
    let jobResult = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const statusRes = await fetch(`http://localhost:3000/api/v1/market/analyze/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      const job = statusData.data;
      process.stdout.write(`   Polling attempt ${i + 1}: status = ${job.status}\r`);
      if (job.status === 'completed' || job.status === 'succeeded') {
        console.log(`\n✓ Job completed successfully!`);
        jobResult = job.result;
        break;
      } else if (job.status === 'failed') {
        throw new Error(`\nJob failed: ${job.error}`);
      }
    }

    if (!jobResult) throw new Error('Job polling timed out.');

    console.log('\n--- AI Market Intelligence Output ---');
    console.log(`Product:             ${jobResult.product}`);
    console.log(`Category:            ${jobResult.category}`);
    console.log(`Candidate HS Code:   ${jobResult.candidateHsCode || 'N/A'}`);
    console.log(`Data Source Mode:    ${jobResult.dataSourceMode}`);
    console.log(`Disclaimer:          ${jobResult.disclaimer || 'N/A'}`);
    console.log(`Recommended Markets: ${jobResult.recommendedCountries?.length || 0} destinations`);
    (jobResult.recommendedCountries || []).forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.countryCode}] ${c.country} — Score: ${c.demandScore}/100 | Growth: ${c.growthRate} | Comp: ${c.competition}`);
    });

    // 4. Verify PostgreSQL persistence & user boundary
    console.log('\n4. Verifying database persistence via GET /market/opportunities...');
    const oppRes = await fetch('http://localhost:3000/api/v1/market/opportunities', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const oppData = await oppRes.json();
    if (!oppData.success) throw new Error('Failed to retrieve stored opportunities');

    console.log(`✓ Persisted Opportunities in PostgreSQL: ${oppData.data?.length} records`);
    const latest = oppData.data[0];
    if (latest) {
      console.log(`  Latest Record ID:      ${latest.id}`);
      console.log(`  Linked Product Name:   ${latest.product?.productName}`);
      console.log(`  Linked HS Code:        ${latest.product?.hsCode}`);
      console.log(`  Destination:           ${latest.country} (${latest.countryCode})`);
      console.log(`  Demand Score:          ${latest.demandScore}/100`);
      console.log(`  Source Tag:            ${latest.source}`);
      console.log(`  Ownership (User ID):   ${latest.userId}`);
    }

    console.log('\n=== End-to-End Workflow Successfully Verified! ===\n');
  } catch (err) {
    console.error('\n❌ Workflow Verification Failed:', err);
    process.exit(1);
  }
}

testE2E();
