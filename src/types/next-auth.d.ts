import { Role } from "@prisma/client";
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: Role;
    department?: string | null;
    avatarUrl?: string | null;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      department?: string | null;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    department?: string | null;
    avatarUrl?: string | null;
  }
}
