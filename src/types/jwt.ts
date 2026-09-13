export interface JwtPayload {
  userId: string;
  role: "CLIENT" | "COACH" | "ADMIN";
}
