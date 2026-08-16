import { cn } from './utils';

describe('cn utility function', () => {
  it('merges simple classes', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });

  it('resolves tailwind class conflicts correctly', () => {
    // p-4 and p-8 conflict, twMerge should pick the last one
    expect(cn('p-4', 'p-8')).toBe('p-8');
    // text-red-500 and text-blue-500 conflict
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays and objects', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
    expect(cn({ 'class1': true, 'class2': false })).toBe('class1');
  });

  it('handles complex combinations', () => {
    expect(
      cn(
        'base-class p-4',
        { 'text-lg': true, 'hidden': false },
        ['flex', 'items-center'],
        'p-8' // overrides p-4
      )
    ).toBe('base-class text-lg flex items-center p-8');
  });

  it('ignores undefined and null', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
  });
});
