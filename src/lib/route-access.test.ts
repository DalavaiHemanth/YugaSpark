import { describe, expect, it } from "vitest";
import { ADMIN_PATHS, OPEN_PATHS, STUDENT_PATHS, resolveAccess } from "./route-access";

const admin = (pathname: string, profileCompleted: boolean | null = true) =>
  resolveAccess({ pathname, isAdmin: true, profileCompleted });
const student = (pathname: string, profileCompleted: boolean | null = true) =>
  resolveAccess({ pathname, isAdmin: false, profileCompleted });

describe("admins on student routes", () => {
  it.each(STUDENT_PATHS)("redirects an admin away from %s", (path) => {
    expect(admin(path)).toEqual({ kind: "redirect", to: "/admin", search: { section: "members" } });
  });

  it.each(STUDENT_PATHS)("redirects an admin away from nested %s/... routes", (path) => {
    expect(admin(`${path}/detail`)).toEqual({
      kind: "redirect",
      to: "/admin",
      search: { section: "members" },
    });
  });

  it("still lets admins into the admin panel", () => {
    expect(admin("/admin")).toEqual({ kind: "allow" });
  });

  it("does not send admins to onboarding when their profile is incomplete", () => {
    expect(admin("/admin", false)).toEqual({ kind: "allow" });
  });
});

describe("students on admin routes", () => {
  it.each(ADMIN_PATHS)("blocks a non-admin from %s", (path) => {
    expect(student(path)).toEqual({ kind: "redirect", to: "/dashboard" });
  });

  it("blocks a non-admin from nested admin routes", () => {
    expect(student("/admin/members")).toEqual({ kind: "redirect", to: "/dashboard" });
  });
});

describe("students on student routes", () => {
  it.each(STUDENT_PATHS)("allows a completed student on %s", (path) => {
    expect(student(path)).toEqual({ kind: "allow" });
  });

  it.each(STUDENT_PATHS.filter((p) => !OPEN_PATHS.includes(p as never)))(
    "sends an incomplete student from %s to onboarding",
    (path) => {
      expect(student(path, false)).toEqual({ kind: "redirect", to: "/onboarding" });
    },
  );

  it.each(OPEN_PATHS)("lets an incomplete student reach %s", (path) => {
    expect(student(path, false)).toEqual({ kind: "allow" });
  });

  it("allows a student with no profile row yet", () => {
    expect(student("/dashboard", null)).toEqual({ kind: "allow" });
  });
});