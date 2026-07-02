import bcrypt from 'bcryptjs';

async function test() {
  const hash = '$2a$10$W86b7MoHKOXG83mqDoFBae1HMUu.6/FzyCoZR04356EII7.rB3Dxu';
  const passwords = ['admin', 'root', '123456', 'password', 'Janespro2026', 'admin123', 'root123'];
  
  for (const p of passwords) {
    const match = await bcrypt.compare(p, hash);
    if (match) {
      console.log(`MATCH FOUND! The password is: ${p}`);
      process.exit(0);
    }
  }
  console.log("No match found.");
}
test();
