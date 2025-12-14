import { getParent } from "@/shared/lib";

describe("getParent", () => {
  it("returns parent for normal paths", () => {
    expect(getParent("C:\\foo\\bar.txt")).toBe("C:\\foo");
    expect(getParent("/usr/local/bin")).toBe("/usr/local");
  });

  it("normalizes drive roots", () => {
    expect(getParent("D:\\newfolder")).toBe("D:\\");
    expect(getParent("E:\\")).toBe("E:\\");
  });

  it("returns input when no separator", () => {
    expect(getParent("relativepath")).toBe("relativepath");
  });
});
