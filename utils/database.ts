import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MariaDB 연결 풀 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  port: Number(process.env.DB_PORT) || 3306,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'github_commits',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// DB 연결 테스트 함수
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MariaDB');
    connection.release();
    return true;
  } catch (err) {
    console.error('Error connecting to MariaDB:', err);
    return false;
  }
};

// pool을 외부에서 사용할 수 있도록 export
export default pool;
