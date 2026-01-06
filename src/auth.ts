import type express from "express";
import { NextFunction, Response } from "express";

export interface RequestWithUser extends express.Request {
  user?: {
    _id: string;
    username: string;
  };
}

type SessionData = {
  user: {
    _id: string;
    username: string;
  };
};

const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";

export const findUserFromSession = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const sessionCookie = req.headers.cookie;

  if (!sessionCookie) {
    return next();
  }

  try {
    const response = await fetch(userServiceUrl + "/api/v1/session", {
      method: "GET",
      headers: {
        Cookie: sessionCookie,
      },
      signal: AbortSignal.timeout(5000), // 5-second timeout
    });

    if (response.ok) {
      const data = (await response.json()) as SessionData;
      req.user = data.user;
    } else {
      console.log(`Session validation failed: ${response.status}`);
    }
    return next();
  } catch (error) {
    console.error("Session validation error:", error instanceof Error ? error.message : "Unknown error");
    return next();
  }
};
