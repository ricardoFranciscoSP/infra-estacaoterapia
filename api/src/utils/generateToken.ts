import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';


export function generateToken(
  userId: string,
  secret: Secret = process.env.JWT_SECRET!,
  expiresIn: number | StringValue = '1d'
) {
  const options: SignOptions = { expiresIn };
  return jwt.sign({ userId }, secret, options);
}

