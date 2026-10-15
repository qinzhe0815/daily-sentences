export const LANG = { eng: "en", fra: "fr", cmn: "zh" };
export const LICENSES = {
  "CC BY 2.0 FR": "https://creativecommons.org/licenses/by/2.0/fr/",
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
};
export function normalize(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function similarity(a, b) {
  const grams = (v) => {
    const s = normalize(v);
    return new Set(
      Array.from({ length: Math.max(0, s.length - 2) }, (_, i) =>
        s.slice(i, i + 3),
      ),
    );
  };
  const x = grams(a),
    y = grams(b);
  if (!x.size || !y.size) return normalize(a) === normalize(b) ? 1 : 0;
  return (2 * [...x].filter((g) => y.has(g)).length) / (x.size + y.size);
}
export function screenPair(a, b) {
  if (!a || !b || !LANG[a.lang] || !LANG[b.lang] || a.lang === b.lang)
    return "language";
  if (![a, b].every((s) => Object.hasOwn(LICENSES, s.license)))
    return "license";
  if (
    ![a, b].every(
      (s) =>
        Number.isSafeInteger(s.id) &&
        s.id > 0 &&
        typeof s.owner === "string" &&
        s.owner.trim(),
    )
  )
    return "owner";
  if ([a, b].some((s) => s.is_unapproved !== false)) return "unapproved";
  if (b.is_direct !== true) return "indirect";
  for (const s of [a, b]) {
    if (typeof s.text !== "string" || s.text.length < 4 || s.text.length > 500)
      return "length";
    if (/https?:|www\.|\S+@\S+|(?:\d[\s()+-]*){8,}/iu.test(s.text))
      return "privacy";
    if (
      /[<>\u0000-\u001f\u007f]|\b(?:fuck|shit|kill|killed|rape|suicide|nigger|sex|porn|merde|tuer|suicide)\b|杀|殺|自杀|自殺|强奸|強奸/iu.test(
        s.text,
      )
    )
      return "content";
    if (
      s.lang === "cmn"
        ? !/\p{Script=Han}/u.test(s.text)
        : /\p{Script=Han}/u.test(s.text) || !/[a-zà-ÿ]/iu.test(s.text)
    )
      return "language";
    // Keep the app's default Chinese corpus in simplified script; don't silently convert source text.
    if (s.lang === "cmn" && s.script !== "Hans") return "script";
  }
  return null;
}
export function collectionURL(source, target, range) {
  const u = new URL("https://api.tatoeba.org/v1/sentences");
  for (const [k, v] of Object.entries({
    lang: source,
    "trans:lang": target,
    "trans:is_direct": "yes",
    is_unapproved: "no",
    is_orphan: "no",
    "trans:is_unapproved": "no",
    "trans:is_orphan": "no",
    showtrans: "matching",
    limit: "60",
    sort: "-created",
    word_count: range,
  }))
    u.searchParams.set(k, v);
  return u.href;
}
