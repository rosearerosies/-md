import test from "node:test";
import assert from "node:assert/strict";
import { chunks, cleanTranscript, filename, makeMarkdown, makeOverviewSvg } from "../src/shared/markdown.js";

test("cleans timestamps and duplicate subtitle lines", () => {
  assert.equal(cleanTranscript("00:01 Hello\n00:02 Hello\n00:03 world"), "Hello\nworld");
});

test("chunks long source without dropping content", () => {
  const source = "first\nsecond\nthird";
  assert.deepEqual(chunks(source, 8), ["first", "second", "third"]);
});

test("builds markdown without secrets", () => {
  const output = makeMarkdown({ title: "A", site: "测试", url: "https://example.com", author: "Me", body: "正文" });
  assert.match(output, /# A/);
  assert.match(output, /## 正文/);
  assert.doesNotMatch(output, /apiKey/i);
});

test("creates Windows-safe filenames", () => {
  assert.equal(filename('a:b/c'), "a_b_c");
});

test("creates a local overview image without API data", () => {
  const output = makeOverviewSvg({ title: "A", site: "测试", summary: "- 要点" });
  assert.match(output, /^<svg/);
  assert.doesNotMatch(output, /apiKey|Authorization/i);
});
