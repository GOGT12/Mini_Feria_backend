import bcrypt from 'bcryptjs'
import pool from "../db/pool";


async function superAdmin() {

  const username = `superadmin`;
  const email = 'superadmin@gmail.com';
  const plainPassword = '123superseguro!'
  const role = 'super_admin'

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const result = await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
      `,
      [username, email, hashedPassword, role]
    );

    console.log(' superAdmin creado con ID:', result.rows[0].id);
  } catch (err) {
    console.error('Error al crear el superAdmin', err)
  } finally {
    await pool.end();
  }
}


superAdmin();
