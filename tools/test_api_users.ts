import jwt from "jsonwebtoken";

async function run() {
  const JWT_SECRET = process.env.JWT_SECRET || 'sentinel-secure-jwt-secret-2026';
  const token = jwt.sign(
    { id: '4bcd583e-35f3-40bf-8b9d-4c9f329339c9', role: 'superadmin', level: 5 }, 
    JWT_SECRET, 
    { expiresIn: '8h' }
  );
  
  const res = await fetch('http://127.0.0.1:3000/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-session-id': 'sess-test'
    }
  });
  
  const data = await res.json();
  console.log("Fetched users length:", data.length);
  if (data.length > 0) {
    console.log("First user full structure:", data[0]);
  }
  process.exit(0);
}
run();
