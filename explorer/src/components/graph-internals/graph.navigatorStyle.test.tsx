import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Fix #18 — Navigator CSS styles and focus-hint audit', () => {
  it('contains rules for .navigator-header, .navigator-title, and .navigator-close-btn in graph.css', () => {
    const cssPath = path.resolve(__dirname, 'graph.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('.navigator-header');
    expect(cssContent).toContain('.navigator-title');
    expect(cssContent).toContain('.navigator-close-btn');
    expect(cssContent).toContain('.navigator-close-btn:hover');
    expect(cssContent).toContain('.navigator-close-btn:focus-visible');
  });

  it('preserves .focus-hint because FocusControls.tsx references it', () => {
    const cssPath = path.resolve(__dirname, 'graph.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('.focus-hint');
  });
});
