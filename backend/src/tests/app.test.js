import request from "supertest";
import app from "../app.js";

describe("app smoke endpoints", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: "ok" } });
  });

  it("returns root API message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "SDG Recycling backend API" });
  });
});
