// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useLanguage } from './index';
import { renderWithLanguage } from './test-utils';

function Current() {
  return <p>{useLanguage().language}</p>;
}

afterEach(cleanup);

it('renders with the requested language', () => {
  renderWithLanguage(<Current />, { language: 'de' });
  expect(screen.getByText('de')).toBeTruthy();
});

it('keeps the provider across a rerender', () => {
  const view = renderWithLanguage(<Current />, { language: 'en' });
  view.rerender(<Current />);
  expect(screen.getByText('en')).toBeTruthy();
});
