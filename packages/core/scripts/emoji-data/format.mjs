/** Pure emoji transformations and positional encoding; no package or file IO. */

// Emojibase tone number → Frimousse skin tone key.
const TONE_MAP = {
  1: "light",
  2: "medium-light",
  3: "medium",
  4: "medium-dark",
  5: "dark",
};

const COMPONENT_GROUP = 2;
const FIELD_SEPARATOR = "\t";
const LIST_SEPARATOR = "|";

// Correct labels in the upstream message files that are untranslated or wrong.
const EMOJIBASE_LABEL_OVERRIDES = {
  de: { skinTones: { "medium-dark": "Mitteldunkler Hautton" } },
  ja: { categories: { 3: "動物と自然", 6: "アクティビティ" } },
  nl: { categories: { 1: "Mensen en lichaam", 9: "Vlaggen" } },
};

function capitalize(str, locale) {
  return str.charAt(0).toLocaleUpperCase(locale) + str.slice(1);
}

function decodeHtmlEntities(str) {
  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => {
    switch (entity) {
      case "&amp;":
        return "&";
      case "&lt;":
        return "<";
      case "&gt;":
        return ">";
      case "&quot;":
        return '"';
      case "&#39;":
        return "'";
      default:
        throw new Error(`Unexpected HTML entity: ${entity}`);
    }
  });
}

function getSkinToneVariations(emoji) {
  if (!emoji.skins) {
    return undefined;
  }
  const variations = {};
  for (const skin of emoji.skins) {
    if (typeof skin.tone === "number" && TONE_MAP[skin.tone]) {
      variations[TONE_MAP[skin.tone]] = skin.emoji;
    }
  }
  return Object.keys(variations).length === 5 ? variations : undefined;
}

function normalizeSearchText(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildFrimousseData(emojis, messages, locale, shortcodes = {}) {
  const labelOverrides = EMOJIBASE_LABEL_OVERRIDES[locale];
  const countryFlagSubgroups = new Set(
    messages.subgroups
      .filter(
        (subgroup) =>
          subgroup.key === "country-flag" ||
          subgroup.key === "subdivision-flag",
      )
      .map((subgroup) => subgroup.order),
  );

  const filteredGroups = messages.groups.filter((g) => g.key !== "component");
  const filteredEmojis = emojis.filter(
    (e) => "group" in e && e.group !== COMPONENT_GROUP,
  );

  const categories = filteredGroups.map((g) => ({
    index: g.order,
    label:
      labelOverrides?.categories?.[g.order] ??
      capitalize(decodeHtmlEntities(g.message), locale),
  }));

  const skinTones = {};
  for (const key of Object.values(TONE_MAP)) {
    const found = messages.skinTones.find((skinTone) => skinTone.key === key);
    if (found) {
      skinTones[key] =
        labelOverrides?.skinTones?.[key] ?? capitalize(found.message, locale);
    }
  }

  const formattedEmojis = filteredEmojis.map((emoji) => {
    const aliases = shortcodes[emoji.hexcode];
    const entry = {
      emoji: emoji.emoji,
      category: emoji.group,
      version: emoji.version,
      label: capitalize(normalizeSearchText(emoji.label), locale),
      tags: (emoji.tags ?? []).map(normalizeSearchText),
      // Build-only metadata, encoded once in common.ts rather than per locale.
      shortcodes: typeof aliases === "string" ? [aliases] : (aliases ?? []),
    };
    if (countryFlagSubgroups.has(emoji.subgroup)) {
      entry.countryFlag = true;
    }
    const skins = getSkinToneVariations(emoji);
    if (skins) {
      entry.skins = skins;
    }
    return entry;
  });

  return {
    locale,
    emojis: formattedEmojis,
    categories,
    skinTones,
  };
}

function assertEncodable(value, context) {
  if (
    value.includes(FIELD_SEPARATOR) ||
    value.includes(LIST_SEPARATOR) ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new Error(`Cannot encode ${context}: ${JSON.stringify(value)}`);
  }
}

function encodeList(values, context) {
  return values
    .map((value) => {
      value = normalizeSearchText(value);
      assertEncodable(value, context);
      return value;
    })
    .join(LIST_SEPARATOR);
}

export function compactSearchTags(label, tags) {
  // Keep the existing English-cased encoding deterministic across host locales.
  // Compaction is not ranking-neutral: search scores the remaining stored tags.
  // Changing this policy requires regenerating and reviewing all locale modules.
  const normalizedLabel = normalizeSearchText(label).toLowerCase();
  const seen = new Set();

  return tags.filter((tag) => {
    const normalizedTag = normalizeSearchText(tag).toLowerCase();
    if (
      !normalizedTag ||
      seen.has(normalizedTag) ||
      normalizedLabel.includes(normalizedTag)
    ) {
      return false;
    }
    seen.add(normalizedTag);
    return true;
  });
}

export function localizeEmoji(emoji, overlay, annotation, locale) {
  const label = annotation?.tts?.[0] || overlay?.name;
  return {
    ...emoji,
    label: label ? capitalize(label, locale) : emoji.label,
    // Preserve first-occurrence order; the encoder compacts duplicates once.
    tags: [
      ...(annotation?.default ?? []),
      ...(overlay?.keywords ?? []),
      ...emoji.tags,
    ],
  };
}

export function encodeFrimousseCommonData(data) {
  const categoryIndices = data.categories.map(({ index }) => index).join(",");
  const emojis = data.emojis
    .map((emoji) => {
      assertEncodable(emoji.emoji, `emoji ${emoji.emoji}`);
      // Store one template instead of all five nearly identical variants.
      // Verify every upstream variation so a future exception fails generation
      // rather than silently changing the emoji rendered by the picker.
      const skins = emoji.skins?.light.replaceAll("🏻", "|") ?? "";
      if (emoji.skins) {
        Object.values(emoji.skins).forEach((skin, index) => {
          if (
            skins.replaceAll("|", String.fromCodePoint(0x1f3fb + index)) !==
            skin
          ) {
            throw new Error(`Cannot encode skin tones for ${emoji.emoji}`);
          }
        });
      }
      const fields = [
        emoji.emoji,
        emoji.category,
        emoji.version,
        emoji.countryFlag ? "1" : "",
        skins,
      ];
      return fields.join(FIELD_SEPARATOR);
    })
    .join("\n");
  // Group like data together for better gzip/Brotli compression, retaining
  // positional alignment (including empty rows) with the shared emoji corpus.
  const shortcodes = data.emojis
    .map((emoji) =>
      encodeList(
        compactSearchTags("", emoji.shortcodes ?? []),
        `shortcodes for ${emoji.emoji}`,
      ),
    )
    .join("\n");
  return { categoryIndices, emojis, shortcodes };
}

export function encodeFrimousseData(data, commonData) {
  const { locale } = data;
  const categoryIndices = data.categories.map(({ index }) => index).join(",");
  if (
    categoryIndices !==
    commonData.categories.map(({ index }) => index).join(",")
  ) {
    throw new Error(`Category indices differ for locale ${locale}`);
  }
  if (
    data.emojis.length !== commonData.emojis.length ||
    data.emojis.some(
      (emoji, index) => emoji.emoji !== commonData.emojis[index].emoji,
    )
  ) {
    throw new Error(`Emoji order differs for locale ${locale}`);
  }
  const categoryLabels = encodeList(
    data.categories.map(({ label }) => label),
    `category labels for ${locale}`,
  );
  const skinTones = encodeList(
    Object.values(data.skinTones),
    `skin tones for ${locale}`,
  );
  const emojis = data.emojis
    .map((emoji) => {
      assertEncodable(emoji.label, `label for ${emoji.emoji} in ${locale}`);
      const tags = encodeList(
        compactSearchTags(emoji.label, emoji.tags),
        `tags for ${emoji.emoji} in ${locale}`,
      );
      return tags ? `${emoji.label}${FIELD_SEPARATOR}${tags}` : emoji.label;
    })
    .join("\n");
  return [locale, categoryLabels, skinTones, emojis].join("\n");
}
