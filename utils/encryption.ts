import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = process.env.SECRET_KEY || 'my_super_secret_key'; // 반드시 환경변수로 관리하세요.

interface EncryptedData {
  iv: string;
  salt: string;
  encryptedData: string;
}

interface MultiEncryptedData {
  iv: string;
  salt: string;
  encryptedValues: {
    [key: string]: string;
  };
}

/**
 * 단일 토큰을 암호화하는 함수
 */
export const encryptToken = (token: string): EncryptedData => {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(secretKey, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encryptedBuffer = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);

  return {
    iv: iv.toString('hex'),
    salt,
    encryptedData: encryptedBuffer.toString('hex')
  };
};

/**
 * 여러 값을 하나의 salt로 암호화하는 함수
 */
export const encryptMultipleValues = (
  values: { [key: string]: string },
  existingSalt?: string,
  existingIv?: string
): MultiEncryptedData => {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(secretKey, salt, 32);
  const iv = existingIv ? Buffer.from(existingIv, 'hex') : crypto.randomBytes(16);
  
  const encryptedValues: { [key: string]: string } = {};
  
  // 각 값을 동일한 salt와 iv로 암호화
  Object.entries(values).forEach(([fieldName, value]) => {
    const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
    const encryptedBuffer = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    encryptedValues[fieldName] = encryptedBuffer.toString('hex');
  });

  return {
    iv: iv.toString('hex'),
    salt,
    encryptedValues
  };
};

/**
 * 암호화된 토큰을 복호화하는 함수
 * @param encryptedData - 암호화된 토큰 데이터 (hex 문자열)
 * @param ivHex - 암호화 시 사용한 IV (hex 문자열)
 * @param salt - 암호화 시 사용한 salt
 * @returns 복호화된 원본 토큰 문자열
 */
export const decryptToken = (encryptedData: string, ivHex: string, salt: string): string => {
  const key = crypto.scryptSync(secretKey, salt, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedData, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decryptedBuffer.toString('utf8');
};

/**
 * 여러 암호화된 값을 복호화하는 함수
 */
export const decryptMultipleValues = (
  encryptedValues: { [key: string]: string },
  ivHex: string,
  salt: string
): { [key: string]: string } => {
  const key = crypto.scryptSync(secretKey, salt, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decryptedValues: { [key: string]: string } = {};

  // 각 값을 동일한 salt와 iv로 복호화
  Object.entries(encryptedValues).forEach(([key, encryptedValue]) => {
    const encryptedBuffer = Buffer.from(encryptedValue, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    decryptedValues[key] = decryptedBuffer.toString('utf8');
  });

  return decryptedValues;
};