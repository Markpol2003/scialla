require('dotenv').config();
const db = require('./db');

async function run() {
  const orderId = 'SC-7003';
  const status = 'preparing';
  const authenticatedStaffId = null;
  const authenticatedStaffName = 'Jan Pol';

  let updateSql = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP';
  let params = [status, orderId];
  let paramIdx = 3;

  if (status === 'preparing') {
    updateSql += `, accepted_by_id = $${paramIdx++}, accepted_by_staff_id = $${paramIdx++}, accepted_by_name = $${paramIdx++}, accepted_at = CURRENT_TIMESTAMP`;
    params.push(authenticatedStaffId, authenticatedStaffId, authenticatedStaffName);
  }
  updateSql += ' WHERE id = $2 RETURNING *';

  console.log('SQL:', updateSql);
  console.log('Params:', params);

  try {
    const res = await db.query(updateSql, params);
    console.log('Success:', res.rows[0]);
  } catch(e) {
    console.error('Error executing query:', e);
  } finally {
    process.exit(0);
  }
}
run();
