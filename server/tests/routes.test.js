import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Express health and import routes", () => {
  it("returns health status without credentials or external services", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body).toMatchObject({ status: "ok", service: "enrichment-server" });
  });

  it("returns structured errors for missing uploads and unsupported file types", async () => {
    const missing = await request(app).post("/api/imports").expect(400);
    expect(missing.body.error).toMatchObject({ code: "NO_FILE", message: "Upload a file in the 'file' field" });

    const unsupported = await request(app)
      .post("/api/imports")
      .attach("file", Buffer.from("ignored"), "notes.txt")
      .expect(400);
    expect(unsupported.body.error).toMatchObject({ code: "UNSUPPORTED_FILE" });
  });

  it("returns a structured not-found response for unknown routes", async () => {
    const response = await request(app).get("/api/does-not-exist").expect(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
