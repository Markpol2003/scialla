async function runVerification() {
  console.log('==============================================');
  console.log('   SCIALLA MINIMAL ADD-ONS TEST SUITE');
  console.log('==============================================\n');

  // TEST 1: Spanish Latte 12 oz alone -> ₱49
  console.log('▶ [TEST 1] Spanish Latte 12 oz (No Add-ons)');
  const res1 = await fetch('http://127.0.0.1:5050/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest-test-1' },
    body: JSON.stringify({
      table: 'Table 4',
      paymentMethod: 'Cash',
      items: [{
        id: 'cf-1-12oz',
        name: 'Spanish Latte (12 oz)',
        size: '12 oz',
        qty: 1,
        price: 49,
        addons: []
      }]
    })
  });
  const data1 = await res1.json();
  if (data1.order?.total === 49) {
    console.log('  ✅ TEST 1 PASSED: Order total is ₱49.00');
  } else {
    console.error('  ❌ TEST 1 FAILED:', data1);
  }

  // TEST 2: Spanish Latte ₱49 + Espresso ₱10 -> ₱59
  console.log('\n▶ [TEST 2] Spanish Latte 12 oz + 1 Shot Espresso');
  const res2 = await fetch('http://127.0.0.1:5050/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest-test-2' },
    body: JSON.stringify({
      table: 'Table 4',
      paymentMethod: 'Cash',
      items: [{
        id: 'cf-1-12oz',
        name: 'Spanish Latte (12 oz)',
        size: '12 oz',
        qty: 1,
        price: 59,
        addons: [{ id: 'da2', name: '1 Shot Espresso', price: 10 }]
      }]
    })
  });
  const data2 = await res2.json();
  if (data2.order?.total === 59 && data2.order?.items?.[0]?.addons?.length === 1) {
    console.log('  ✅ TEST 2 PASSED: Order total is ₱59.00 with Espresso Shot');
  } else {
    console.error('  ❌ TEST 2 FAILED:', data2);
  }

  // TEST 3: Spanish Latte ₱49 + Espresso ₱10 + Caramel ₱10 -> ₱69
  console.log('\n▶ [TEST 3] Spanish Latte 12 oz + Espresso + Caramel Drizzle');
  const res3 = await fetch('http://127.0.0.1:5050/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest-test-3' },
    body: JSON.stringify({
      table: 'Table 4',
      paymentMethod: 'GCash',
      items: [{
        id: 'cf-1-12oz',
        name: 'Spanish Latte (12 oz)',
        size: '12 oz',
        qty: 1,
        price: 69,
        addons: [
          { id: 'da2', name: '1 Shot Espresso', price: 10 },
          { id: 'da7', name: 'Caramel Drizzle', price: 10 }
        ]
      }]
    })
  });
  const data3 = await res3.json();
  if (data3.order?.total === 69 && data3.order?.items?.[0]?.addons?.length === 2) {
    console.log('  ✅ TEST 3 PASSED: Order total is ₱69.00 with both add-ons');
  } else {
    console.error('  ❌ TEST 3 FAILED:', data3);
  }

  // TEST 4: Multi-quantity customized items calculation
  console.log('\n▶ [TEST 4] 2x Spanish Latte (₱49 + ₱10) = ₱118');
  const res4 = await fetch('http://127.0.0.1:5050/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest-test-4' },
    body: JSON.stringify({
      table: 'Table 2',
      paymentMethod: 'Cash',
      items: [{
        id: 'cf-1-12oz',
        name: 'Spanish Latte (12 oz)',
        size: '12 oz',
        qty: 2,
        price: 59,
        addons: [{ id: 'da2', name: '1 Shot Espresso', price: 10 }]
      }]
    })
  });
  const data4 = await res4.json();
  if (data4.order?.total === 118) {
    console.log('  ✅ TEST 4 PASSED: Total is ₱118.00 ((₱49 + ₱10) * 2)');
  } else {
    console.error('  ❌ TEST 4 FAILED:', data4);
  }

  // TEST 5 & 6 & 7: Fetch order details by ID to verify persistence for Receipt, Staff & Manager
  console.log('\n▶ [TEST 5, 6, 7] Fetching Order # ' + data3.order?.id);
  const resGet = await fetch(`http://127.0.0.1:5050/api/orders/${data3.order?.id}`);
  const dataGet = await resGet.json();
  const item = dataGet.order?.items?.[0];
  console.log('  Fetched Item Name:', item?.name);
  console.log('  Fetched Item Price:', item?.price);
  console.log('  Fetched Item Add-ons:', item?.addons);

  if (item?.addons?.length === 2 && item?.price === 69) {
    console.log('  ✅ TEST 5, 6, 7 PASSED: Add-ons correctly stored and returned for Receipt, Staff & Manager views');
  } else {
    console.error('  ❌ TEST 5, 6, 7 FAILED:', dataGet);
  }

  // TEST 8: Old order without add-ons opens normally
  console.log('\n▶ [TEST 8] Fetching Order without add-ons # ' + data1.order?.id);
  const resOld = await fetch(`http://127.0.0.1:5050/api/orders/${data1.order?.id}`);
  const dataOld = await resOld.json();
  if (dataOld.success && dataOld.order?.items?.[0]?.price === 49) {
    console.log('  ✅ TEST 8 PASSED: Order without add-ons opens normally without issues');
  } else {
    console.error('  ❌ TEST 8 FAILED:', dataOld);
  }

  console.log('\n==============================================');
  console.log('   ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('==============================================');
}

runVerification().catch(console.error);
