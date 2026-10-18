import { describe, expect, it } from "vitest";
import { departmentByKey, departmentPath, productPath, storeShortName } from "@/lib/departments";
import { haversineKm } from "@/lib/geo";

describe("store URLs", () => {
  it("builds department and product paths inside a store", () => {
    expect(departmentPath("ojoo", "PHARMACY")).toBe("/store/ojoo/pharmacy");
    expect(productPath("sheu", "VETERINARY", "pet-carrier")).toBe("/store/sheu/veterinary/pet-carrier");
  });

  it("resolves only known departments", () => {
    expect(departmentByKey("supermarket")?.vertical).toBe("SUPERMARKET");
    expect(departmentByKey("bakery")).toBeNull();
  });

  it("shortens store names for compact UI", () => {
    expect(storeShortName("Flagship Branch (Sheu)")).toBe("Sheu");
    expect(storeShortName("Ologuneru Branch (Ajadi)")).toBe("Ajadi");
    expect(storeShortName("Ojoo Branch")).toBe("Ojoo");
  });
});

describe("haversineKm", () => {
  it("is zero for the same point and roughly right across Ibadan", () => {
    expect(haversineKm({ lat: 7.42, lng: 3.83 }, { lat: 7.42, lng: 3.83 })).toBe(0);
    const km = haversineKm({ lat: 7.4198, lng: 3.8295 }, { lat: 7.4553, lng: 3.9206 });
    expect(km).toBeGreaterThan(10);
    expect(km).toBeLessThan(11);
  });
});
