const assert = require("node:assert/strict");
const test = require("node:test");
const { createStore, validateApplication } = require("./data-store");

test("store creates, updates, searches, and deletes an application", () => {
  const store = createStore(":memory:");
  const created = store.create({ company: "Acme", role: "Developer", stage: "Applied", appliedDate: "2026-09-30", jobLink: "https://example.com/job", notes: "Follow up Friday" });
  assert.equal(store.get(created.id).company, "Acme");
  assert.equal(store.all({ search: "dev" }).some(item => item.id === created.id), true);
  assert.equal(store.update(created.id, { ...created, stage: "Interview" }).stage, "Interview");
  assert.equal(store.remove(created.id), true);
  assert.equal(store.get(created.id), undefined);
  store.close();
});

test("validation rejects missing fields and unsafe links", () => {
  const result = validateApplication({ company: "", role: "Developer", stage: "Unknown", appliedDate: "today", jobLink: "javascript:alert(1)", notes: "" });
  assert.equal(result.errors.length, 4);
});
