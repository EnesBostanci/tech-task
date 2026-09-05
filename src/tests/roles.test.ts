import { describe, expect, it } from "vitest";

import { homePathForRole, requiredRoleForPath } from "@/lib/roles";

describe("requiredRoleForPath", () => {
    it("treats admin routes as admin-only", () => {
        expect(requiredRoleForPath("/admin/campaigns")).toBe("admin");
        expect(requiredRoleForPath("/admin/campaigns/abc/edit")).toBe(
            "admin",
        );
    });

    it("treats creator routes as creator-only", () => {
        expect(requiredRoleForPath("/campaigns")).toBe("creator");
        expect(requiredRoleForPath("/campaigns/abc/submit")).toBe(
            "creator",
        );
        expect(requiredRoleForPath("/submissions")).toBe("creator");
    });

    it("does not gate the home page", () => {
        expect(requiredRoleForPath("/")).toBeNull();
    });
});

describe("homePathForRole", () => {
    it("sends each role to its working home", () => {
        expect(homePathForRole("admin")).toBe("/admin/campaigns");
        expect(homePathForRole("creator")).toBe("/campaigns");
    });
});
