export type Role = 'PATIENT' | 'THERAPIST' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface JwtPayload {
  sub: string;      // userId
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  access_token: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>;
}
