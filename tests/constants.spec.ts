import { describe, it, expect } from 'vitest';
import { CHART_COLORS, EXAMPLES, INITIAL_BNGL_CODE } from '../constants';

const getBlockContent = (blockName: string, code: string): string => {
  const regex = new RegExp(`begin\\s+${blockName}([\\s\\S]*?)end\\s+${blockName}`, 'i');
  const match = regex.exec(code);
  return match ? match[1].trim() : '';
};

describe('Example catalog integrity', () => {
  it('defines at least thirty curated examples', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(30);
  });

  it('ensures each example id is unique', () => {
    const ids = EXAMPLES.map((example) => example.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('ensures each example has at least one tag', () => {
    EXAMPLES.forEach((example) => {
      expect(example.tags.length).toBeGreaterThan(0);
    });
  });

  it('keeps the initial template synchronized with the first example', () => {
    expect(EXAMPLES[0].code.trim()).toBe(INITIAL_BNGL_CODE.trim());
  });

  it('lists at least eight distinct chart colors', () => {
    expect(CHART_COLORS.length).toBeGreaterThanOrEqual(8);
  });

  it('provides hexadecimal color strings for charts', () => {
    CHART_COLORS.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

const requiredBlocks = [
  'model',
  'parameters',
  'molecule types',
  'seed species',
  'observables',
  'reaction rules',
  'actions',
];

EXAMPLES.forEach((example) => {
  const lowerCaseCode = example.code.toLowerCase();
  const exampleLabel = `${example.name} (${example.id})`;

  describe(exampleLabel, () => {
    it('uses a non-empty id', () => {
      expect(example.id.trim().length).toBeGreaterThan(0);
    });

    it('provides a descriptive name', () => {
      expect(example.name.trim().length).toBeGreaterThan(3);
    });

    it('includes a helpful description', () => {
      expect(example.description.trim().length).toBeGreaterThan(10);
    });

    requiredBlocks.forEach((block) => {
      it(`includes the ${block} block`, () => {
        expect(lowerCaseCode.includes(`begin ${block}`)).toBe(true);
        expect(lowerCaseCode.includes(`end ${block}`)).toBe(true);
      });
    });

    it('declares at least one observable entry', () => {
      const block = getBlockContent('observables', example.code);
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
      expect(lines.length).toBeGreaterThan(0);
    });

    it('declares at least one reaction rule with an arrow', () => {
      const block = getBlockContent('reaction rules', example.code);
      expect(block.includes('->') || block.includes('<->')).toBe(true);
    });

    it('configures a simulation action', () => {
      const block = getBlockContent('actions', example.code).toLowerCase();
      expect(block.includes('simulate({method')).toBe(true);
    });

    it('ensures every tag is lower case', () => {
      example.tags.forEach((tag) => {
        expect(tag).toBe(tag.toLowerCase());
      });
    });
  });
});
