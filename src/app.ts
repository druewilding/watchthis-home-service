import appRootPath from "app-root-path";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import path from "path";

import packageJson from "../package.json" with { type: "json" };
import { findUserFromSession, RequestWithUser } from "./auth.js";

const baseUrl = process.env.BASE_URL ?? "http://localhost:7279";
const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";
const userServicePublicUrl =
  process.env.USER_SERVICE_PUBLIC_URL ?? process.env.USER_SERVICE_URL ?? "http://localhost:8583";

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for TailwindCSS
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        formAction: ["'self'", userServicePublicUrl], // Allow forms to be submitted to user service
      },
    },
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "pug");
app.set("views", path.join(appRootPath.path, "views"));
app.use(express.static(path.join(appRootPath.path, "public")));

app.get("/", findUserFromSession, (req: RequestWithUser, res) => {
  res.render("home-page", {
    user: req.user,
    userServiceUrl: userServicePublicUrl,
    callbackUrl: new URL(req.url, baseUrl).toString(),
  });
});

app.get("/ping", (_req, res) => {
  res.send(`${packageJson.name} ${packageJson.version}`);
});

app.get("/health", async (_req, res) => {
  try {
    // Test connectivity to user service
    const response = await fetch(`${userServiceUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    const userServiceStatus = response.ok ? "healthy" : "unhealthy";

    res.json({
      service: packageJson.name,
      version: packageJson.version,
      status: "healthy",
      timestamp: new Date().toISOString(),
      dependencies: {
        userService: userServiceStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      service: packageJson.name,
      version: packageJson.version,
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { app };
