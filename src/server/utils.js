const jose = require('jose');
const SECRET = Buffer.from(process.env.JWT_SECRET);
const AlbyTools = require('alby-tools');

exports.isValidPreimage = async function isValidPreimage(token, preimage, path) {
  let jwt
  try {
    jwt = await jose.jwtVerify(token, SECRET, {});
  } catch(e) {
    console.error(e);
    return false;
  }
  if (path !== jwt.payload.path) {
    return false;
  }
  if (Math.floor(Date.now() / 1000) > jwt.payload.exp) {
    return false; // expired
  }
  const invoice = new AlbyTools.Invoice({ pr: jwt.payload.pr, preimage: preimage });
  const isPaid = await invoice.isPaid();
  return isPaid;
}

exports.generateToken = async function generateToken(invoice, path) {
  const jwt = await new jose.SignJWT({ 'pr': invoice.paymentRequest, 'path': path })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(SECRET)

  return jwt;
}
