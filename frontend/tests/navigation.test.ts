import assert from "node:assert/strict";
import test from "node:test";

import { NAV_ITEMS, isRouteActive, shouldNavigate } from "../lib/navigation";

test("NAV_ITEMS exposes the three primary routes", () => {
  assert.equal(NAV_ITEMS.length, 3);
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.route),
    ["/", "/quests", "/progression"],
  );
});

test("isRouteActive detects the current route", () => {
  assert.equal(isRouteActive("/quests", "/quests"), true);
  assert.equal(isRouteActive("/quests", "/"), false);
});

test("shouldNavigate prevents navigation when already on the target", () => {
  assert.equal(shouldNavigate("/", "/"), false);
  assert.equal(shouldNavigate("/", "/progression"), true);
});
