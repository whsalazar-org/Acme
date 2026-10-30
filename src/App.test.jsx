import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

const catalog = [
  ['Clothing', 'Sunday cotton overshirt', '$48.00'],
  ['Cosmetics', 'Dewdrop botanical serum', '$24.00'],
  ['Furniture', 'Solstice lounge chair', '$240.00'],
  ['Electronics', 'Cloud wireless headphones', '$89.00'],
  ['Housewares', 'Terra ceramic vase', '$32.00'],
  ['Appliances', 'Daybreak coffee maker', '$75.00'],
];

beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() { this.setAttribute('open', ''); },
    },
    close: {
      configurable: true,
      value() { this.removeAttribute('open'); },
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderShop() {
  const user = userEvent.setup();
  render(<App />);
  return user;
}

describe('product rendering and filtering', () => {
  it('renders all six products with their prices and add controls', () => {
    renderShop();

    expect(screen.getAllByRole('article')).toHaveLength(6);
    for (const [, name, price] of catalog) {
      const card = screen.getByRole('heading', { name }).closest('article');
      expect(within(card).getByText(price)).toBeTruthy();
      expect(within(card).getByRole('button', { name: `Add ${name} to bag` })).toBeTruthy();
    }
    expect(screen.getByText('6 demo products')).toBeTruthy();
  });

  it.each(catalog)('filters the %s department and restores all products', async (category, name) => {
    const user = renderShop();
    const filters = within(screen.getByRole('group', { name: 'Filter products by category' }));

    await user.click(filters.getByRole('button', { name: category, exact: true }));

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name })).toBeTruthy();
    expect(filters.getByRole('button', { name: category, exact: true }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('1 demo product')).toBeTruthy();

    await user.click(filters.getByRole('button', { name: 'All favorites' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it.each([
    ['  SUNDAY  ', 'Sunday cotton overshirt'],
    ['electronics', 'Cloud wireless headphones'],
    ['slow living', 'Solstice lounge chair'],
  ])('searches names, categories, and labels for %s', async (query, name) => {
    const user = renderShop();

    await user.type(screen.getByRole('searchbox', { name: 'Search demo products' }), query);

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name })).toBeTruthy();
  });

  it('combines category and search filters and resets both after no results', async () => {
    const user = renderShop();
    const filters = within(screen.getByRole('group', { name: 'Filter products by category' }));
    const search = screen.getByRole('searchbox', { name: 'Search demo products' });

    await user.type(search, 'chair');
    await user.click(filters.getByRole('button', { name: 'Clothing', exact: true }));

    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'No favorites found just yet.' })).toBeTruthy();
    expect(screen.getByText('0 demo products matching "chair"')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Show all demo products' }));

    expect(search.value).toBe('');
    expect(filters.getByRole('button', { name: 'All favorites' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it('clears a search when browsing a department and focuses the collection', async () => {
    const user = renderShop();
    const search = screen.getByRole('searchbox', { name: 'Search demo products' });
    await user.type(search, 'serum');

    await user.click(within(screen.getByRole('navigation', { name: 'Shop departments' })).getByRole('button', { name: 'Furniture' }));

    expect(search.value).toBe('');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Solstice lounge chair' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Small discoveries. Big delight.' }));
  });
});

describe('shopping bag', () => {
  it('opens an empty bag and closes it when continuing browsing', async () => {
    const user = renderShop();
    await user.click(screen.getByRole('button', { name: 'Open shopping bag, 0 items' }));
    const dialog = screen.getByRole('dialog', { name: 'Your shopping bag' });

    expect(within(dialog).getByText('Add a fictional favorite to start your demo bag.')).toBeTruthy();
    expect(within(dialog).queryByText('Demo subtotal')).toBeNull();

    await user.click(within(dialog).getByRole('button', { name: 'Keep exploring' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('aggregates repeated additions and calculates a subtotal across products', async () => {
    const user = renderShop();
    const addShirt = screen.getByRole('button', { name: 'Add Sunday cotton overshirt to bag' });
    await user.click(addShirt);
    await user.click(addShirt);
    await user.click(screen.getByRole('button', { name: 'Add Terra ceramic vase to bag' }));
    await user.click(screen.getByRole('button', { name: 'Open shopping bag, 3 items' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Your shopping bag' }));

    expect(dialog.getAllByRole('listitem')).toHaveLength(2);
    expect(dialog.getByLabelText('Sunday cotton overshirt quantity').textContent).toBe('2');
    expect(dialog.getByLabelText('Terra ceramic vase quantity').textContent).toBe('1');
    expect(dialog.getByText('$128.00')).toBeTruthy();
  });

  it('updates quantities and subtotal, removes at zero, and supports explicit removal', async () => {
    const user = renderShop();
    await user.click(screen.getByRole('button', { name: 'Add Sunday cotton overshirt to bag' }));
    await user.click(screen.getByRole('button', { name: 'Add Terra ceramic vase to bag' }));
    await user.click(screen.getByRole('button', { name: 'Open shopping bag, 2 items' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Your shopping bag' }));

    await user.click(dialog.getByRole('button', { name: 'Increase Sunday cotton overshirt quantity' }));
    expect(dialog.getByLabelText('Sunday cotton overshirt quantity').textContent).toBe('2');
    expect(dialog.getByText('$128.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open shopping bag, 3 items' })).toBeTruthy();

    await user.click(dialog.getByRole('button', { name: 'Decrease Sunday cotton overshirt quantity' }));
    expect(dialog.getByLabelText('Sunday cotton overshirt quantity').textContent).toBe('1');
    expect(dialog.getByText('$80.00')).toBeTruthy();

    await user.click(dialog.getByRole('button', { name: 'Decrease Sunday cotton overshirt quantity' }));
    expect(dialog.queryByRole('heading', { name: 'Sunday cotton overshirt' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open shopping bag, 1 items' })).toBeTruthy();

    await user.click(dialog.getByRole('button', { name: 'Remove', exact: true }));
    expect(dialog.queryAllByRole('listitem')).toHaveLength(0);
    expect(dialog.queryByText('Demo subtotal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open shopping bag, 0 items' })).toBeTruthy();
  });
});

describe('wishlist', () => {
  it('opens an empty wishlist and returns to browsing', async () => {
    const user = renderShop();
    await user.click(screen.getByRole('button', { name: 'Open wishlist, 0 items' }));
    const dialog = screen.getByRole('dialog', { name: 'Your wishlist' });

    expect(within(dialog).getByText('Tap a heart on any product to save it here.')).toBeTruthy();
    expect(within(dialog).queryAllByRole('listitem')).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Keep exploring' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('saves a product and reflects the accessible name, pressed state, header count, and dialog contents', async () => {
    const user = renderShop();
    const saveButton = screen.getByRole('button', { name: 'Save Sunday cotton overshirt to wishlist' });

    await user.click(saveButton);

    const savedButton = screen.getByRole('button', { name: 'Remove Sunday cotton overshirt from wishlist' });
    expect(savedButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Open wishlist, 1 items' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Open wishlist, 1 items' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Your wishlist' }));
    expect(dialog.getAllByRole('listitem')).toHaveLength(1);
    expect(dialog.getByRole('heading', { name: 'Sunday cotton overshirt' })).toBeTruthy();
  });

  it('removes a product from the wishlist dialog and updates count, heart state, and empty state', async () => {
    const user = renderShop();
    await user.click(screen.getByRole('button', { name: 'Save Sunday cotton overshirt to wishlist' }));
    await user.click(screen.getByRole('button', { name: 'Open wishlist, 1 items' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Your wishlist' }));

    await user.click(dialog.getByRole('button', { name: 'Remove', exact: true }));

    expect(dialog.queryAllByRole('listitem')).toHaveLength(0);
    expect(dialog.getByText('Tap a heart on any product to save it here.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open wishlist, 0 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Sunday cotton overshirt to wishlist' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('adds a saved product to the bag from the wishlist dialog with correct quantity and subtotal, while it stays saved', async () => {
    const user = renderShop();
    await user.click(screen.getByRole('button', { name: 'Save Terra ceramic vase to wishlist' }));
    await user.click(screen.getByRole('button', { name: 'Open wishlist, 1 items' }));
    const wishlistDialog = within(screen.getByRole('dialog', { name: 'Your wishlist' }));

    await user.click(wishlistDialog.getByRole('button', { name: 'Add to bag +' }));

    expect(screen.getByRole('button', { name: 'Open shopping bag, 1 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Terra ceramic vase from wishlist' }).getAttribute('aria-pressed')).toBe('true');

    await user.click(wishlistDialog.getByRole('button', { name: 'Close panel' }));
    await user.click(screen.getByRole('button', { name: 'Open shopping bag, 1 items' }));
    const cartDialog = within(screen.getByRole('dialog', { name: 'Your shopping bag' }));
    expect(cartDialog.getByLabelText('Terra ceramic vase quantity').textContent).toBe('1');
    expect(cartDialog.getByText('Demo subtotal').nextElementSibling.textContent).toBe('$32.00');
  });

  it('toggles a product off the wishlist from its card without changing the bag', async () => {
    const user = renderShop();
    await user.click(screen.getByRole('button', { name: 'Add Dewdrop botanical serum to bag' }));
    const saveButton = screen.getByRole('button', { name: 'Save Dewdrop botanical serum to wishlist' });
    await user.click(saveButton);

    const savedButton = screen.getByRole('button', { name: 'Remove Dewdrop botanical serum from wishlist' });
    await user.click(savedButton);

    expect(screen.getByRole('button', { name: 'Save Dewdrop botanical serum to wishlist' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Open wishlist, 0 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open shopping bag, 1 items' })).toBeTruthy();
  });
});