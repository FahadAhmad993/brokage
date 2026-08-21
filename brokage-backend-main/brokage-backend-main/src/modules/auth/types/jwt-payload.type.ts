export type JwtPayload = {
  sub: string;
  email: string;
  displayName: string;
  isAdmin?: boolean;
};
