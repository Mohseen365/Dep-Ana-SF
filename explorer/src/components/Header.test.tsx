import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

describe('Header Component', () => {
  it('renders application title and brand', () => {
    render(<Header />);
    expect(screen.getByText('Dependency Analyzer')).toBeInTheDocument();
  });

  it('displays active project name and status badge', () => {
    render(
      <Header
        activeProjectName="Core CRM"
        activeProjectStatus="COMPLETE"
      />
    );
    expect(screen.getByText('Core CRM')).toBeInTheDocument();
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  });

  it('renders active breadcrumb context when provided', () => {
    render(
      <Header
        activeBreadcrumb="MovieController"
      />
    );
    expect(screen.getByTestId('header-breadcrumb')).toBeInTheDocument();
    expect(screen.getByText('MovieController')).toBeInTheDocument();
  });

  it('triggers onOpenCommandPalette when central search button is clicked', () => {
    const onOpenCommandPalette = vi.fn();
    render(
      <Header
        onOpenCommandPalette={onOpenCommandPalette}
      />
    );

    const searchBtn = screen.getByTestId('header-search-button');
    expect(searchBtn).toBeInTheDocument();
    fireEvent.click(searchBtn);

    expect(onOpenCommandPalette).toHaveBeenCalledWith('');
  });

  it('triggers onToggleCompare callback when Compare button is clicked', () => {
    const onToggleCompare = vi.fn();
    render(
      <Header
        onToggleCompare={onToggleCompare}
        isCompareOpen={false}
      />
    );

    const compareBtn = screen.getByTestId('header-compare-btn');
    fireEvent.click(compareBtn);

    expect(onToggleCompare).toHaveBeenCalledTimes(1);
  });

  it('triggers onResetView callback when Reset View button is clicked', () => {
    const onResetView = vi.fn();
    render(
      <Header
        onResetView={onResetView}
      />
    );

    const resetBtn = screen.getByTestId('header-reset-btn');
    fireEvent.click(resetBtn);

    expect(onResetView).toHaveBeenCalledTimes(1);
  });

  it('toggles "More" menu and handles menu item clicks', () => {
    const onOpenPanel = vi.fn();
    const onOpenCommandPalette = vi.fn();

    render(
      <Header
        onOpenPanel={onOpenPanel}
        onOpenCommandPalette={onOpenCommandPalette}
      />
    );

    const moreBtn = screen.getByTestId('header-more-btn');
    fireEvent.click(moreBtn);

    expect(screen.getByTestId('header-more-menu')).toBeInTheDocument();

    const findingsItem = screen.getByTestId('more-item-findings');
    fireEvent.click(findingsItem);

    expect(onOpenPanel).toHaveBeenCalledWith('findings');
    expect(screen.queryByTestId('header-more-menu')).not.toBeInTheDocument();
  });

  it('opens project switcher menu when project trigger button is clicked', () => {
    const onSelectProject = vi.fn();
    render(
      <Header
        activeProjectName="Salesforce Project"
        onSelectProject={onSelectProject}
      />
    );

    const projTrigger = screen.getByTestId('header-project-trigger');
    fireEvent.click(projTrigger);

    expect(screen.getByTestId('header-project-menu')).toBeInTheDocument();
  });
});
