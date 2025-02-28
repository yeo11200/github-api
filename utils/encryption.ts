import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = process.env.SECRET_KEY || 'my_super_secret_key'; // 반드시 환경변수로 관리하세요.

/**
 * 토큰을 암호화하는 함수
 * @param token - 암호화할 토큰 문자열
 * @returns iv, salt, 암호화된 데이터 객체
 */
const encryptToken = (token: string): { iv: string; salt: string; encryptedData: string } => {
  // 고유 salt 생성 (16바이트)
  const salt = crypto.randomBytes(16).toString('hex');
  // scrypt를 사용해 salt와 secretKey로 32바이트 키 생성
  const key = crypto.scryptSync(secretKey, salt, 32);
  // 16바이트 IV 생성
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encryptedBuffer = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);

  return {
    iv: iv.toString('hex'),
    salt,
    encryptedData: encryptedBuffer.toString('hex')
  };
}

/**
 * 암호화된 토큰을 복호화하는 함수
 * @param encryptedData - 암호화된 토큰 데이터 (hex 문자열)
 * @param ivHex - 암호화 시 사용한 IV (hex 문자열)
 * @param salt - 암호화 시 사용한 salt
 * @returns 복호화된 원본 토큰 문자열
 */
const decryptToken = (encryptedData: string, ivHex: string, salt: string): string => {
  const key = crypto.scryptSync(secretKey, salt, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedData, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decryptedBuffer.toString('utf8');
}

export { encryptToken, decryptToken };