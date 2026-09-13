import { JwtPayload } from "./jwt";

declare global {
  namespace Express {
    interface Request {
      authUser?: JwtPayload;
      coachId?: string;
    }
  }
}

export {};