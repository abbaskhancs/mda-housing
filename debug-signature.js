const crypto = require('crypto');

// Debug signature generation and verification
function debugSignature() {
  const documentId = 'test-doc-123';
  const expiresIn = 3600; // 1 hour
  const secret = 'default-secret-key';
  
  // Generate signature
  const expires = Date.now() + (expiresIn * 1000);
  const data = `${documentId}:${expires}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
  
  console.log('Document ID:', documentId);
  console.log('Expires:', expires);
  console.log('Data:', data);
  console.log('Generated signature:', signature);
  
  // Test verification
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(signature, 'hex') // Same signature should be valid
  );
  
  console.log('Self-verification:', isValid);
  
  // Test with different timestamp (should be invalid)
  const differentExpires = Date.now() + (expiresIn * 1000) + 1000;
  const differentData = `${documentId}:${differentExpires}`;
  const differentSignature = crypto.createHmac('sha256', secret).update(differentData).digest('hex');
  
  const isDifferentValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(differentSignature, 'hex')
  );
  
  console.log('Different signature verification:', isDifferentValid);
}

debugSignature();
