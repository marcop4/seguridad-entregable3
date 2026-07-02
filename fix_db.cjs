const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/postgres' });
pool.query("UPDATE usuarios SET email = 'rodi23@gmail.com' WHERE email = 'rodi23' RETURNING *")
  .then(res => { console.log(res.rows); pool.end(); })
  .catch(console.error);
