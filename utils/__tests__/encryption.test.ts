import { encryptToken, decryptToken } from '../encryption';

describe('Encryption Utilities', () => {
  const testToken = 'test-token-123';
  const longToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ';
  
  describe('encryptToken', () => {
    it('should encrypt a token and return necessary decryption data', () => {
      const result = encryptToken(testToken);
      
      console.log('\nEncryption Test Results:');
      console.log('Original Token:', testToken);
      console.log('Encrypted Result:', {
        iv: result.iv,
        salt: result.salt,
        encryptedData: result.encryptedData
      });
      
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('encryptedData');
      
      expect(typeof result.iv).toBe('string');
      expect(typeof result.salt).toBe('string');
      expect(typeof result.encryptedData).toBe('string');
      
      // IV should be 32 characters (16 bytes in hex)
      expect(result.iv).toHaveLength(32);
      // Salt should be 32 characters (16 bytes in hex)
      expect(result.salt).toHaveLength(32);
      // Encrypted data should not be empty
      expect(result.encryptedData.length).toBeGreaterThan(0);
    });

    it('should generate different IVs and salts for the same token', () => {
      const result1 = encryptToken(testToken);
      const result2 = encryptToken(testToken);

      console.log('\nMultiple Encryption Results for Same Token:');
      console.log('Original Token:', testToken);
      console.log('First Encryption:', {
        iv: result1.iv,
        salt: result1.salt,
        encryptedData: result1.encryptedData
      });
      console.log('Second Encryption:', {
        iv: result2.iv,
        salt: result2.salt,
        encryptedData: result2.encryptedData
      });

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.encryptedData).not.toBe(result2.encryptedData);
    });

    it('should handle long tokens', () => {
      const result = encryptToken(longToken);
      
      console.log('\nLong Token Encryption Results:');
      console.log('Original Token:', longToken);
      console.log('Encrypted Result:', {
        iv: result.iv,
        salt: result.salt,
        encryptedData: result.encryptedData
      });
      
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('encryptedData');
    });
  });

  describe('decryptToken', () => {
    it('should correctly decrypt an encrypted token', () => {
      const encrypted = encryptToken(testToken);
      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.salt
      );

      console.log('\nDecryption Test Results:');
      console.log('Original Token:', testToken);
      console.log('Encrypted Data:', {
        iv: encrypted.iv,
        salt: encrypted.salt,
        encryptedData: encrypted.encryptedData
      });
      console.log('Decrypted Result:', decrypted);

      expect(decrypted).toBe(testToken);
    });

    it('should correctly handle long tokens', () => {
      const encrypted = encryptToken(longToken);
      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.salt
      );

      console.log('\nLong Token Decryption Results:');
      console.log('Original Token:', longToken);
      console.log('Encrypted Data:', {
        iv: encrypted.iv,
        salt: encrypted.salt,
        encryptedData: encrypted.encryptedData
      });
      console.log('Decrypted Result:', decrypted);

      expect(decrypted).toBe(longToken);
    });

    it('should throw an error for invalid encrypted data', () => {
      const encrypted = encryptToken(testToken);
      
      console.log('\nInvalid Encrypted Data Test:');
      console.log('Original Token:', testToken);
      console.log('Valid Encryption:', {
        iv: encrypted.iv,
        salt: encrypted.salt,
        encryptedData: encrypted.encryptedData
      });
      console.log('Testing with invalid encrypted data: "invalid-encrypted-data"');
      
      expect(() => {
        decryptToken(
          'invalid-encrypted-data',
          encrypted.iv,
          encrypted.salt
        );
      }).toThrow();
    });

    it('should throw an error for invalid IV', () => {
      const encrypted = encryptToken(testToken);
      
      console.log('\nInvalid IV Test:');
      console.log('Original Token:', testToken);
      console.log('Valid Encryption:', {
        iv: encrypted.iv,
        salt: encrypted.salt,
        encryptedData: encrypted.encryptedData
      });
      console.log('Testing with invalid IV: "invalid-iv"');
      
      expect(() => {
        decryptToken(
          encrypted.encryptedData,
          'invalid-iv',
          encrypted.salt
        );
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const emptyToken = '';
      const encrypted = encryptToken(emptyToken);
      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.salt
      );

      console.log('\nEmpty String Test Results:');
      console.log('Original Token: (empty string)');
      console.log('Encrypted Data:', {
        iv: encrypted.iv,
        salt: encrypted.salt,
        encryptedData: encrypted.encryptedData
      });
      console.log('Decrypted Result:', decrypted);

      expect(decrypted).toBe(emptyToken);
    });

    it('should handle special characters', () => {
      const specialToken = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptToken(specialToken);
      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.salt
      );

      console.log('\nSpecial Characters Test Results:');
      console.log('Original Token:', specialToken);
      console.log('Encrypted Data:', {
        iv: encrypted.iv,
        salt: encrypted.salt,
        encryptedData: encrypted.encryptedData
      });
      console.log('Decrypted Result:', decrypted);

      expect(decrypted).toBe(specialToken);
    });

    it('should handle unicode characters', () => {
      const unicodeToken = '안녕하세요🌟';
      const encrypted = encryptToken(unicodeToken);
      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.salt
      );

      console.log('\nUnicode Characters Test Results:');
      console.log('Original Token:', unicodeToken);
      console.log('Encrypted Data:', {
        iv: encrypted.iv,
        salt: encrypted.salt,
        encryptedData: encrypted.encryptedData
      });
      console.log('Decrypted Result:', decrypted);

      expect(decrypted).toBe(unicodeToken);
    });
  });
}); 